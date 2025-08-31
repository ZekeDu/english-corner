import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ApiProvider } from '@/types/api-config';
import { 
  getUserApiConfig, 
  createUserApiConfig, 
  updateUserApiConfig, 
  deleteUserApiConfig
} from '@/lib/api-config';

// GET /api/user/api-config - Get user's API configuration
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    
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

    const config = await getUserApiConfig(actualUserId);
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to get API config:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}

// POST /api/user/api-config - Create or update API configuration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    
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

    const body = await request.json();
    
    const { provider, apiKey, baseUrl, model } = body;
    
    if (!provider || !model) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    // Ollama doesn't require API key for local usage
    if (provider !== ApiProvider.OLLAMA && !apiKey) {
      return NextResponse.json({ error: '缺少API密钥' }, { status: 400 });
    }

    // Check if config already exists
    const existingConfig = await getUserApiConfig(actualUserId);
    
    let config;
    if (existingConfig) {
      config = await updateUserApiConfig(actualUserId, { provider, apiKey, baseUrl, model });
    } else {
      config = await createUserApiConfig(actualUserId, { provider, apiKey, baseUrl, model });
    }
    
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to save API config:', error);
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 });
  }
}

// DELETE /api/user/api-config - Delete API configuration
export async function DELETE() {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const userId = parseInt(session.user.id as string);
    
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

    await deleteUserApiConfig(actualUserId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete API config:', error);
    return NextResponse.json({ error: '删除配置失败' }, { status: 500 });
  }
}