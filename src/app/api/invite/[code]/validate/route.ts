import { NextRequest, NextResponse } from 'next/server';
import { InviteService } from '@/lib/invite';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    if (!code) {
      return NextResponse.json(
        { error: '邀请码不能为空' },
        { status: 400 }
      );
    }

    const result = await InviteService.validateInvite(code);

    if (!result.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          message: result.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invite: {
        code: result.invite!.inviteCode,
        inviter: result.invite!.inviter,
        invitedEmail: result.invite!.invitedEmail,
        createdAt: result.invite!.createdAt,
      },
    });
  } catch (error) {
    console.error('验证邀请码错误:', error);
    return NextResponse.json(
      { error: '验证邀请码失败' },
      { status: 500 }
    );
  }
}