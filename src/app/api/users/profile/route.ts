import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateProfileSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过50个字符'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // 验证用户是否存在，如果不存在则创建（用于测试和演示）
    let userExists = await db.user.findUnique({
      where: { email: session.user.email || 'demo@example.com' }
    });

    let actualUserId = parseInt(session.user.id);
    if (!userExists) {
      // 检查是否有用户表记录
      const userCount = await db.user.count();
      
      // 如果是第一个用户，创建演示用户
      if (userCount === 0) {
        userExists = await db.user.create({
          data: {
            email: session.user.email || 'demo@example.com',
            nickname: validatedData.nickname || session.user.name || '演示用户',
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

    // 更新用户昵称
    const updatedUser = await db.user.update({
      where: {
        id: actualUserId,
      },
      data: {
        nickname: validatedData.nickname,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: '个人资料更新成功',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '输入数据无效', details: error.issues },
        { status: 400 }
      );
    }

    console.error('更新用户资料错误:', error);
    return NextResponse.json(
      { error: '更新失败，请稍后重试' },
      { status: 500 }
    );
  }
}