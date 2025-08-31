import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await auth();
    const id = (await params).id;
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const conversationId = parseInt(id);

    // 验证用户权限
    const conversation = await db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在或无权访问' },
        { status: 404 }
      );
    }

    await db.conversation.delete({
      where: { id: conversationId },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('删除对话失败:', error);
    return NextResponse.json(
      { error: '删除对话失败' },
      { status: 500 }
    );
  }
}