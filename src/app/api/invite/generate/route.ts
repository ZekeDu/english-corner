import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth/index';
import { InviteService } from '@/lib/invite';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    let invitedEmail: string | undefined;
    try {
      const body = await request.json();
      invitedEmail = body.invitedEmail;
    } catch {
      // 如果没有提供body，invitedEmail保持undefined
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

    // 生成邀请码
    const invite = await InviteService.createInvite(user.id, invitedEmail);
    const inviteLink = InviteService.getInviteLink(invite.inviteCode);

    return NextResponse.json({
      success: true,
      invite: {
        code: invite.inviteCode,
        link: inviteLink,
        createdAt: invite.createdAt,
        invitedEmail: invite.invitedEmail,
      },
    });
  } catch (error) {
    console.error('生成邀请码错误:', error);
    return NextResponse.json(
      { error: '生成邀请码失败' },
      { status: 500 }
    );
  }
}