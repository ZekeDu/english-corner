import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conversations = await db.conversation.findMany({
      where: { userId: actualUserId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(conversations);

  } catch (error) {
    console.error('获取对话列表失败:', error);
    return NextResponse.json(
      { error: '获取对话列表失败' },
      { status: 500 }
    );
  }
}