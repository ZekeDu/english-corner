import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function DELETE(request: NextRequest) {
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

    // 获取请求体中的确认信息
    const body = await request.json();
    const { confirm } = body;
    
    if (!confirm) {
      return NextResponse.json(
        { error: '需要确认清空操作' },
        { status: 400 }
      );
    }

    // 统计要删除的对话数量
    const conversationCount = await db.conversation.count({
      where: { userId: actualUserId }
    });

    if (conversationCount === 0) {
      return NextResponse.json(
        { error: '没有可清空的对话' },
        { status: 404 }
      );
    }

    // 执行批量删除
    const result = await db.conversation.deleteMany({
      where: { userId: actualUserId }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `成功删除了 ${result.count} 个对话`
    });

  } catch (error) {
    console.error('清空对话失败:', error);
    return NextResponse.json(
      { error: '清空对话失败' },
      { status: 500 }
    );
  }
}