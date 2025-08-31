import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { aiService } from '@/lib/ai';
import { db } from '@/lib/db';
import { z } from 'zod';

// 请求验证schema
const chatRequestSchema = z.object({
  message: z.string().min(1, '消息不能为空').max(5000, '消息过长'),
  conversationId: z.number().optional(),
});

// 生成对话标题
function generateConversationTitle(message: string): string {
  // 取前30个字符作为标题，避免过长
  const cleanMessage = message.trim();
  if (cleanMessage.length <= 20) {
    return cleanMessage;
  }
  
  // 如果包含问号，取问号前的部分
  const questionIndex = cleanMessage.indexOf('?');
  if (questionIndex > 0 && questionIndex <= 25) {
    return cleanMessage.substring(0, questionIndex + 1);
  }
  
  // 否则取前20个字符加省略号
  return cleanMessage.substring(0, 20) + '...';
}

// 保存消息到对话
async function saveMessageToConversation(
  userId: number,
  conversationId: number | undefined,
  userMessage: string,
  aiReply: string
) {
  const messages = [
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: aiReply, timestamp: new Date().toISOString() }
  ];

  if (conversationId) {
    // 更新现有对话
    const existingConversation = await db.conversation.findFirst({
      where: { id: conversationId, userId }
    });

    if (!existingConversation) {
      throw new Error('对话不存在或无权访问');
    }

    const existingMessages = Array.isArray(existingConversation.messages) 
      ? existingConversation.messages 
      : [];

    return await db.conversation.update({
      where: { id: conversationId },
      data: {
        messages: [...existingMessages, ...messages],
        updatedAt: new Date()
      },
      select: {
        id: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } else {
    // 创建新对话
    const title = generateConversationTitle(userMessage);
    
    return await db.conversation.create({
      data: {
        userId,
        title,
        messages,
      },
      select: {
        id: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // 验证用户是否存在，如果不存在则创建（用于测试和演示）
    let userExists = await db.user.findUnique({
      where: { email: session.user.email || 'demo@example.com' }
    });

    let actualUserId = userId;
    if (!userExists) {
      // 检查是否有用户表记录
      const userCount = await db.user.count();
      
      // 如果是第一个用户，创建演示用户
      if (userCount === 0) {
        userExists = await db.user.create({
          data: {
            email: session.user.email || 'demo@example.com',
            nickname: session.user.name || '演示用户',
            passwordHash: 'demo-hash-not-used'
          }
        });
        actualUserId = userExists.id;
      } else {
        return NextResponse.json(
          { error: '用户不存在，请重新登录' },
          { status: 404 }
        );
      }
    } else {
      actualUserId = userExists.id;
    }

    // 2. 验证请求数据
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);
    const { message, conversationId } = validatedData;

    // 3. 调用AI服务
    const aiResponse = await aiService.generateReply(actualUserId, message);

    // 4. 保存对话记录
    const conversation = await saveMessageToConversation(
      actualUserId,
      conversationId,
      message,
      aiResponse.reply
    );

    // 5. 返回成功响应
    return NextResponse.json({
      success: true,
      reply: aiResponse.reply,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    });

  } catch (error) {
    console.error('Chat API Error:', error);

    // Zod验证错误
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '请求参数无效', details: error.issues },
        { status: 400 }
      );
    }

    // AI服务错误
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // 其他错误
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// 健康检查端点
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}