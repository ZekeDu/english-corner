import { db } from './db';
export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  messages: ConversationMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// 生成对话标题的函数
export function generateConversationTitle(message: string): string {
  const cleanMessage = message.trim();
  
  // 如果消息很短，直接作为标题
  if (cleanMessage.length <= 15) {
    return cleanMessage;
  }
  
  // 如果包含问号，取问号前的部分
  const questionIndex = cleanMessage.indexOf('?');
  if (questionIndex > 0 && questionIndex <= 25) {
    return cleanMessage.substring(0, questionIndex + 1);
  }
  
  // 寻找第一个句号的断点
  const periodIndex = cleanMessage.indexOf('.');
  if (periodIndex > 0 && periodIndex <= 25) {
    return cleanMessage.substring(0, periodIndex + 1);
  }
  
  // 寻找逗号断点
  const commaIndex = cleanMessage.indexOf(',');
  if (commaIndex > 0 && commaIndex <= 25) {
    return cleanMessage.substring(0, commaIndex) + '...';
  }
  
  // 取前20个字符加省略号
  return cleanMessage.substring(0, 20) + '...';
}

// 辅助函数：转换数据库记录为Conversation类型
interface DBRecord {
  id: number;
  userId: number;
  title?: string | null;
  messages: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function convertDbToConversation(dbRecord: DBRecord): Conversation {
  return {
    id: dbRecord.id,
    userId: dbRecord.userId,
    title: dbRecord.title || 'Untitled Conversation',
    messages: Array.isArray(dbRecord.messages) ? dbRecord.messages : [],
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  };
}

// 对话管理服务
export class ConversationService {
  static async createConversation(
    userId: number,
    title: string,
    messages: ConversationMessage[]
  ): Promise<Conversation> {
    const conversation = await db.conversation.create({
      data: {
        userId,
        title,
        messages: messages as unknown as Array<{role: string; content: string; timestamp: string}>,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return convertDbToConversation(conversation);
  }

  static async getConversation(
    userId: number,
    conversationId: number
  ): Promise<Conversation | null> {
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return conversation ? convertDbToConversation(conversation) : null;
  }

  static async getUserConversations(
    userId: number,
    limit = 20,
    offset = 0
  ): Promise<Conversation[]> {
    const conversations = await db.conversation.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        userId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return conversations.map(convertDbToConversation);
  }

  static async updateConversation(
    userId: number,
    conversationId: number,
    newMessages: ConversationMessage[]
  ): Promise<Conversation | null> {
    // 验证用户权限
    const existing = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!existing) {
      return null;
    }

    const existingMessages = Array.isArray(existing.messages)
      ? (existing.messages as unknown as ConversationMessage[])
      : [];

    const updatedConversation = await db.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        messages: [...existingMessages, ...newMessages] as unknown as Array<{role: string; content: string; timestamp: string}>, 
        updatedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return convertDbToConversation(updatedConversation);
  }

  static async deleteConversation(
    userId: number,
    conversationId: number
  ): Promise<boolean> {
    const result = await db.conversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    return result.count > 0;
  }

  static async addMessagesToConversation(
    userId: number,
    conversationId: number | undefined,
    userMessage: string,
    assistantMessage: string
  ): Promise<Conversation> {
    const newMessages: ConversationMessage[] = [
      {
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date().toISOString(),
      },
    ];

    if (conversationId) {
      const updated = await this.updateConversation(
        userId,
        conversationId,
        newMessages
      );
      
      if (updated) {
        return updated;
      }
    }

    // 创建新对话
    const title = generateConversationTitle(userMessage);
    return await this.createConversation(userId, title, newMessages);
  }

  static async getConversationCount(userId: number): Promise<number> {
    return await db.conversation.count({
      where: {
        userId,
      },
    });
  }

  static async searchConversations(
    userId: number,
    query: string,
    limit = 10
  ): Promise<Conversation[]> {
    const conversations = await db.conversation.findMany({
      where: {
        userId,
        title: { contains: query },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        userId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Ensure titles are not null
    return conversations.map(convertDbToConversation);
  }
}

// 导出便捷函数
export const conversationService = {
  create: ConversationService.createConversation,
  get: ConversationService.getConversation,
  getAll: ConversationService.getUserConversations,
  update: ConversationService.updateConversation,
  delete: ConversationService.deleteConversation,
  addMessages: ConversationService.addMessagesToConversation,
  count: ConversationService.getConversationCount,
  search: ConversationService.searchConversations,
  generateTitle: generateConversationTitle,
};