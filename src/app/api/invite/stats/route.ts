import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { InviteService } from '@/lib/invite';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取用户ID
    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const stats = await InviteService.getInviteStats(user.id);

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('获取邀请统计错误:', error);
    return NextResponse.json(
      { error: '获取邀请统计失败' },
      { status: 500 }
    );
  }
}