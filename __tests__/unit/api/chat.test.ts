import { POST, GET } from '@/app/api/chat/route';
import { aiService } from '@/lib/ai';

// Mock dependencies with proper structure
jest.mock('@/lib/ai');
jest.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('next-auth');

const mockPrisma = require('@/lib/db').prisma;
const mockGetServerSession = require('next-auth').getServerSession;

describe('Chat API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('应该成功处理对话请求', async () => {
      // Mock认证
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });

      // Mock AI服务
      mockAIService.generateReply.mockResolvedValue({
        reply: 'AI回复内容',
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }
      });

      // Mock数据库操作
      mockPrisma.conversation.create.mockResolvedValue({
        id: 1,
        title: 'Hello',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'assistant', content: 'AI回复内容', timestamp: '2024-01-01T00:00:00.000Z' }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        userId: 1
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.reply).toBe('AI回复内容');
      expect(data.conversation.id).toBe(1);
      expect(data.conversation.title).toBe('Hello');
    });

    it('应该更新现有对话', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });
      mockAIService.generateReply.mockResolvedValue({ reply: '新的回复' });

      mockPrisma.conversation.findFirst.mockResolvedValue({
        id: 1,
        userId: 1,
        title: 'Existing',
        messages: [{ role: 'user', content: '旧消息', timestamp: '2024-01-01T00:00:00.000Z' }],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockPrisma.conversation.update.mockResolvedValue({
        id: 1,
        title: 'Existing',
        messages: [
          { role: 'user', content: '旧消息', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'user', content: '新消息', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'assistant', content: '新的回复', timestamp: '2024-01-01T00:00:00.000Z' }
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 1
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '新消息', conversationId: 1 })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.conversation.id).toBe(1);
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 }
      });
    });

    it('应该拒绝未认证用户', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('请先登录');
    });

    it('应该验证请求参数', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });

      // 空消息
      const request1 = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' })
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(400);

      // 超长消息
      const longMessage = 'a'.repeat(5001);
      const request2 = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: longMessage })
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(400);

      // 无效conversationId
      const request3 = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello', conversationId: 'invalid' })
      });

      const response3 = await POST(request3);
      expect(response3.status).toBe(400);
    });

    it('应该处理AI服务错误', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });
      mockAIService.generateReply.mockRejectedValue(new Error('AI服务错误'));

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('AI服务错误');
    });

    it('应该处理对话不存在错误', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });
      mockAIService.generateReply.mockResolvedValue({ reply: '回复' });
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello', conversationId: 999 })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('对话不存在或无权访问');
    });

    it('应该处理服务器错误', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: '1' } });
      mockAIService.generateReply.mockResolvedValue({ reply: '回复' });
      mockPrisma.conversation.create.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('服务器内部错误');
    });
  });

  describe('GET /api/chat', () => {
    it('应该返回健康状态', async () => {
      const request = new Request('http://localhost:3000/api/chat');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });
});