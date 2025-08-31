import { ConversationService, generateConversationTitle } from '@/lib/conversation';

// Mock prisma with proper structure
jest.mock('@/lib/db', () => ({
  prisma: {
    conversation: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const mockPrisma = require('@/lib/db').prisma;

describe('ConversationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateConversationTitle', () => {
    it('应该返回短消息原文作为标题', () => {
      expect(generateConversationTitle('Hello')).toBe('Hello');
      expect(generateConversationTitle('How are you')).toBe('How are you');
    });

    it('应该截断长消息并添加省略号', () => {
      const longMessage = 'This is a very long message that should be truncated';
      expect(generateConversationTitle(longMessage)).toBe('This is a very long ...');
    });

    it('应该以问号结束当消息包含问号', () => {
      expect(generateConversationTitle('How are you today? I hope well')).toBe('How are you today?');
    });

    it('应该以句号结束当消息包含句号', () => {
      expect(generateConversationTitle('Hello world. This is a test')).toBe('Hello world.');
    });

    it('应该以逗号截断并添加省略号', () => {
      expect(generateConversationTitle('Hello, world, this is a test')).toBe('Hello...');
    });

    it('应该处理空白字符', () => {
      expect(generateConversationTitle('  Hello world  ')).toBe('Hello world');
    });
  });

  describe('createConversation', () => {
    it('应该成功创建对话', async () => {
      const mockConversation = {
        id: 1,
        userId: 1,
        title: 'Test Title',
        messages: [{ role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await ConversationService.createConversation(
        1,
        'Test Title',
        [{ role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }]
      );

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          title: 'Test Title',
          messages: [{ role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }],
        },
        select: expect.any(Object),
      });
    });
  });

  describe('getConversation', () => {
    it('应该返回用户对话', async () => {
      const mockConversation = {
        id: 1,
        userId: 1,
        title: 'Test',
        messages: [{ role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation);

      const result = await ConversationService.getConversation(1, 1);

      expect(result).toEqual(mockConversation);
      expect(mockPrisma.conversation.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        select: expect.any(Object),
      });
    });

    it('应该返回null当对话不存在', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const result = await ConversationService.getConversation(1, 999);

      expect(result).toBeNull();
    });

    it('应该返回null当用户无权访问', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const result = await ConversationService.getConversation(2, 1);

      expect(result).toBeNull();
    });
  });

  describe('getUserConversations', () => {
    it('应该返回用户对话列表', async () => {
      const mockConversations = [
        {
          id: 1,
          userId: 1,
          title: 'Conversation 1',
          messages: [{ role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          userId: 1,
          title: 'Conversation 2',
          messages: [{ role: 'user', content: 'Hi', timestamp: '2024-01-01T00:00:00.000Z' }],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await ConversationService.getUserConversations(1);

      expect(result).toEqual(mockConversations);
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        skip: 0,
        select: expect.any(Object),
      });
    });

    it('应该支持分页', async () => {
      mockPrisma.conversation.findMany.mockResolvedValue([]);

      await ConversationService.getUserConversations(1, 10, 5);

      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        skip: 5,
        select: expect.any(Object),
      });
    });
  });

  describe('updateConversation', () => {
    it('应该成功更新对话', async () => {
      const existingConversation = {
        id: 1,
        userId: 1,
        title: 'Old Title',
        messages: [{ role: 'user', content: 'Old', timestamp: '2024-01-01T00:00:00.000Z' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedConversation = {
        ...existingConversation,
        messages: [
          ...existingConversation.messages,
          { role: 'assistant', content: 'New', timestamp: '2024-01-01T00:00:00.000Z' }
        ],
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(existingConversation);
      mockPrisma.conversation.update.mockResolvedValue(updatedConversation);

      const result = await ConversationService.updateConversation(1, 1, [
        { role: 'assistant', content: 'New', timestamp: '2024-01-01T00:00:00.000Z' }
      ]);

      expect(result).toEqual(updatedConversation);
      expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          messages: expect.any(Array),
          updatedAt: expect.any(Date),
        },
        select: expect.any(Object),
      });
    });

    it('应该返回null当对话不存在或无权访问', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const result = await ConversationService.updateConversation(1, 999, [
        { role: 'assistant', content: 'New', timestamp: '2024-01-01T00:00:00.000Z' }
      ]);

      expect(result).toBeNull();
      expect(mockPrisma.conversation.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteConversation', () => {
    it('应该成功删除对话', async () => {
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 1 });

      const result = await ConversationService.deleteConversation(1, 1);

      expect(result).toBe(true);
      expect(mockPrisma.conversation.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
    });

    it('应该返回false当对话不存在', async () => {
      mockPrisma.conversation.deleteMany.mockResolvedValue({ count: 0 });

      const result = await ConversationService.deleteConversation(1, 999);

      expect(result).toBe(false);
    });
  });

  describe('addMessagesToConversation', () => {
    it('应该创建新对话当conversationId未提供', async () => {
      const newConversation = {
        id: 1,
        userId: 1,
        title: 'Hello',
        messages: [
          { role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'assistant', content: 'Hi there', timestamp: '2024-01-01T00:00:00.000Z' }
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.conversation.create.mockResolvedValue(newConversation);

      const result = await ConversationService.addMessagesToConversation(
        1,
        undefined,
        'Hello',
        'Hi there'
      );

      expect(result).toEqual(newConversation);
      expect(mockPrisma.conversation.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          title: 'Hello',
          messages: expect.any(Array),
        },
        select: expect.any(Object),
      });
    });

    it('应该更新现有对话', async () => {
      const existingConversation = {
        id: 1,
        userId: 1,
        title: 'Existing',
        messages: [{ role: 'user', content: 'Old', timestamp: '2024-01-01T00:00:00.000Z' }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedConversation = {
        ...existingConversation,
        messages: [
          ...existingConversation.messages,
          { role: 'user', content: 'Hi', timestamp: '2024-01-01T00:00:00.000Z' },
          { role: 'assistant', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' }
        ],
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.conversation.findFirst.mockResolvedValue(existingConversation);
      mockPrisma.conversation.update.mockResolvedValue(updatedConversation);

      const result = await ConversationService.addMessagesToConversation(
        1,
        1,
        'Hi',
        'Hello'
      );

      expect(result).toEqual(updatedConversation);
    });
  });

  describe('getConversationCount', () => {
    it('应该返回用户的对话数量', async () => {
      mockPrisma.conversation.count.mockResolvedValue(5);

      const result = await ConversationService.getConversationCount(1);

      expect(result).toBe(5);
      expect(mockPrisma.conversation.count).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });
  });

  describe('searchConversations', () => {
    it('应该搜索用户对话', async () => {
      const mockConversations = [
        {
          id: 1,
          userId: 1,
          title: 'Hello World',
          messages: [{ role: 'user', content: 'Hello world', timestamp: '2024-01-01T00:00:00.000Z' }],
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ];

      mockPrisma.conversation.findMany.mockResolvedValue(mockConversations);

      const result = await ConversationService.searchConversations(1, 'hello', 5);

      expect(result).toEqual(mockConversations);
      expect(mockPrisma.conversation.findMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          OR: [
            { title: { contains: 'hello', mode: 'insensitive' } },
            { messages: { path: ['content'], string_contains: 'hello' } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: expect.any(Object),
      });
    });
  });
});