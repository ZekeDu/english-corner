import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { InviteService } from '@/lib/invite';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname, inviteCode } = await request.json();

    // 验证输入
    if (!email || !password || !inviteCode) {
      return NextResponse.json(
        { error: '邮箱、密码和邀请码不能为空' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: '密码长度至少6位' },
        { status: 400 }
      );
    }

    // 验证邀请码
    const validation = await InviteService.validateInvite(inviteCode);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.message },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 400 }
      );
    }

    // 创建新用户
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        nickname,
      },
    });

    // 更新邀请状态
    await InviteService.markInviteUsed(inviteCode);

    // 返回用户信息（不包含密码）
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (error) {
    console.error('邀请注册错误:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}