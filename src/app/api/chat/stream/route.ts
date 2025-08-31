import { NextRequest } from 'next/server';
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
  const cleanMessage = message.trim();
  if (cleanMessage.length <= 20) {
    return cleanMessage;
  }
  
  const questionIndex = cleanMessage.indexOf('?');
  if (questionIndex > 0 && questionIndex <= 25) {
    return cleanMessage.substring(0, questionIndex + 1);
  }
  
  return cleanMessage.substring(0, 20) + '...';
}

export async function POST(request: NextRequest) {
  try {
    // 1. 验证用户身份
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('请先登录', { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // 验证用户是否存在
    let userExists = await db.user.findUnique({
      where: { email: session.user.email || 'demo@example.com' }
    });

    let actualUserId = userId;
    if (!userExists) {
      const userCount = await db.user.count();
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
        return new Response('用户不存在，请重新登录', { status: 404 });
      }
    } else {
      actualUserId = userExists.id;
    }

    // 2. 验证请求数据
    const body = await request.json();
    const validatedData = chatRequestSchema.parse(body);
    const { message, conversationId } = validatedData;

    // 3. 创建消息数组
    const messages = [
      { role: 'user', content: message, timestamp: new Date().toISOString() },
    ];

    // 4. 创建或更新对话
    let conversation;
    if (conversationId) {
      const existingConversation = await db.conversation.findFirst({
        where: { id: conversationId, userId: actualUserId }
      });

      if (!existingConversation) {
        return new Response('对话不存在或无权访问', { status: 404 });
      }

      const existingMessages = Array.isArray(existingConversation.messages) 
        ? existingConversation.messages 
        : [];

      conversation = await db.conversation.update({
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
      const title = generateConversationTitle(message);
      
      conversation = await db.conversation.create({
        data: {
          userId: actualUserId,
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

    // 5. 设置流式响应
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 发送开始消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            conversation: {
              id: conversation.id,
              title: conversation.title,
              messages: conversation.messages,
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt
            }
          })}

`));

          let fullReply = '';
          
          // 调用AI服务并获取流式响应
          await aiService.generateReplyStream(
            actualUserId,
            message,
            (chunk) => {
              if (chunk) {
                fullReply += chunk;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'chunk',
                  content: chunk
                })}

`));
              }
            }
          );

          // 保存AI回复到对话
          const updatedMessages = [
            ...conversation.messages,
            { 
              role: 'assistant', 
              content: fullReply, 
              timestamp: new Date().toISOString() 
            }
          ];

          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              messages: updatedMessages,
              updatedAt: new Date()
            }
          });

          // 发送完成消息
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            content: fullReply
          })}

`));
          
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'AI服务错误';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            error: errorMessage
          })}

`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response('请求参数无效', { status: 400 });
    }
    
    return new Response('服务器内部错误', { status: 500 });
  }
}