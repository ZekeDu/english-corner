import { AIService } from '../ai';
import { getDecryptedApiConfig } from '../api-config';
import { ApiProvider } from '@/types/api-config';

// Mock dependencies
jest.mock('../api-config');
jest.mock('../db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const mockGetDecryptedApiConfig = getDecryptedApiConfig as jest.MockedFunction<typeof getDecryptedApiConfig>;

// Mock environment variables
process.env.SYSTEM_KIMI_API_KEY = 'sk-system-kimi-key';
process.env.KIMI_API_BASE_URL = 'https://api.moonshot.cn/v1';
process.env.KIMI_MODEL = 'moonshot-v1-8k';

describe('AI Service Integration Tests', () => {
  let aiService: AIService;

  beforeEach(() => {
    jest.clearAllMocks();
    aiService = new AIService();
  });

  describe('User API Configuration Priority', () => {
    it('should use user config when valid and validated', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-user-openai-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from OpenAI'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, 'Hello test');

      expect(mockGetDecryptedApiConfig).toHaveBeenCalledWith(1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-user-openai-key'
          }),
          body: expect.stringContaining('"model":"gpt-4o"')
        })
      );

      expect(result.reply).toBe('Hello from OpenAI');
      expect(result.usage).toEqual({
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      });
    });

    it('should fallback to system K2 when user config is not validated', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-user-openai-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: false,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from system K2'
            }
          }],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, 'Hello test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-system-kimi-key'
          }),
          body: expect.stringContaining('"model":"moonshot-v1-8k"')
        })
      );

      expect(result.reply).toBe('Hello from system K2');
    });

    it('should fallback to system K2 when no user config exists', async () => {
      mockGetDecryptedApiConfig.mockResolvedValue(null);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from system K2'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, 'Hello test');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-system-kimi-key'
          })
        })
      );

      expect(result.reply).toBe('Hello from system K2');
    });

    it('should throw error when no API key is available', async () => {
      mockGetDecryptedApiConfig.mockResolvedValue(null);
      delete process.env.KIMI_API_KEY;

      await expect(aiService.generateReply(1, 'Hello test'))
        .rejects.toThrow('系统API密钥未配置，请联系管理员');

      process.env.KIMI_API_KEY = 'sk-system-kimi-key';
    });
  });

  describe('Provider-Specific API Calls', () => {
    it('should handle Kimi API correctly', async () => {
      const userConfig = {
        provider: ApiProvider.KIMI,
        apiKey: 'sk-user-kimi-key',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-32k',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '你好，我是Kimi AI助手'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, '你好');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-user-kimi-key'
          }),
          body: expect.stringContaining('"model":"moonshot-v1-32k"')
        })
      );

      expect(result.reply).toBe('你好，我是Kimi AI助手');
    });

    it('should handle DeepSeek API correctly', async () => {
      const userConfig = {
        provider: ApiProvider.DEEPSEEK,
        apiKey: 'sk-user-deepseek-key',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from DeepSeek'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, 'Hello');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-user-deepseek-key'
          }),
          body: expect.stringContaining('"model":"deepseek-chat"')
        })
      );

      expect(result.reply).toBe('Hello from DeepSeek');
    });

    it('should handle Ollama API correctly', async () => {
      const userConfig = {
        provider: ApiProvider.OLLAMA,
        apiKey: '', // No API key needed
        baseUrl: 'http://localhost:11434',
        model: 'llama2',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          message: {
            content: 'Hello from Ollama'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.generateReply(1, 'Hello');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining('"model":"llama2"')
        })
      );

      expect(result.reply).toBe('Hello from Ollama');
    });

    it('should handle custom base URLs', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-user-key',
        baseUrl: 'https://custom-openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from custom endpoint'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await aiService.generateReply(1, 'Hello');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom-openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should retry on API failure', async () => {
      mockGetDecryptedApiConfig.mockResolvedValue(null);

      const mockResponses = [
        { ok: false, status: 500 },
        { ok: false, status: 500 },
        { ok: true, json: async () => ({ choices: [{ message: { content: 'Success' } }] }) }
      ];

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2]);

      const result = await aiService.generateReply(1, 'Hello');

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.reply).toBe('Success');
    });

    it('should handle rate limiting with appropriate error', async () => {
      mockGetDecryptedApiConfig.mockResolvedValue(null);

      const mockResponse = {
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded' } })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await expect(aiService.generateReply(1, 'Hello test'))
        .rejects.toThrow('请求过于频繁，请稍后再试');
    });
  });

  describe('testUserApiConfig', () => {
    it('should return true for valid user config', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-valid-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.testUserApiConfig(1);

      expect(result).toBe(true);
    });

    it('should return false when no user config exists', async () => {
      mockGetDecryptedApiConfig.mockResolvedValue(null);

      const result = await aiService.testUserApiConfig(1);

      expect(result).toBe(false);
    });

    it('should return false when user config is not validated', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: false,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const result = await aiService.testUserApiConfig(1);

      expect(result).toBe(false);
    });

    it('should return false when API test fails', async () => {
      const userConfig = {
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-invalid-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
      };

      mockGetDecryptedApiConfig.mockResolvedValue(userConfig);

      const mockResponse = {
        ok: false,
        status: 401
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await aiService.testUserApiConfig(1);

      expect(result).toBe(false);
    });
  });
});