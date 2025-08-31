import { aiService } from '@/lib/ai';
import { prisma } from '@/lib/db';

// Mock prisma structure
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.KIMI_API_KEY = 'test-system-key';
  });

  describe('generateReply', () => {
    it('应该使用用户API密钥成功调用AI服务', async () => {
      const mockUser = { apiKeyEncrypted: Buffer.from('user-test-key').toString('base64') };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const mockResponse = {
        choices: [{
          message: { content: '这是AI的中文回复' }
        }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await aiService.generateReply(1, 'Hello world');

      expect(result.reply).toBe('这是AI的中文回复');
      expect(result.usage).toEqual({ prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer user-test-key'
          })
        })
      );
    });

    it('应该使用系统API密钥当用户没有配置时', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });

      const mockResponse = {
        choices: [{ message: { content: '系统回复' } }]
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await aiService.generateReply(1, 'test message');

      expect(result.reply).toBe('系统回复');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-system-key'
          })
        })
      );
    });

    it('应该重试失败请求', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });

      // 第一次失败，第二次成功
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [{ message: { content: '重试成功' } }] })
        });

      const result = await aiService.generateReply(1, 'test');

      expect(result.reply).toBe('重试成功');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('应该在多次失败后抛出错误', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(aiService.generateReply(1, 'test'))
        .rejects.toThrow('AI服务暂时不可用，请稍后再试');
    });

    it('应该处理API密钥无效错误', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      await expect(aiService.generateReply(1, 'test'))
        .rejects.toThrow('API密钥无效，请在个人中心配置正确的Kimi API密钥');
    });

    it('应该处理网络异常', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(aiService.generateReply(1, 'test'))
        .rejects.toThrow('网络连接异常，请检查网络后重试');
    });

    it('应该处理频率限制', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ apiKeyEncrypted: null });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      await expect(aiService.generateReply(1, 'test'))
        .rejects.toThrow('请求过于频繁，请稍后再试');
    });
  });

  describe('testAPIKey', () => {
    it('应该返回true当API密钥有效', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        choices: [{ message: { content: 'Hello' } }]
      });

      const result = await aiService.testAPIKey('valid-key');
      expect(result).toBe(true);
    });

    it('应该返回false当API密钥无效', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      const result = await aiService.testAPIKey('invalid-key');
      expect(result).toBe(false);
    });

    it('应该返回false当网络错误', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await aiService.testAPIKey('any-key');
      expect(result).toBe(false);
    });
  });

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = aiService;
      const instance2 = aiService;
      expect(instance1).toBe(instance2);
    });
  });
});