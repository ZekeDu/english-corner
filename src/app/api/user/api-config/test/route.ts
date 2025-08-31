import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { testApiConfiguration } from '@/lib/api-validator';
import { ApiTestRequest } from '@/types/api-config';

// POST /api/user/api-config/test - Test API configuration
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body: ApiTestRequest = await request.json();
    const { provider, apiKey, baseUrl, model } = body;
    
    if (!provider || !model) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // For Ollama, API key is optional
    if (provider !== 'OLLAMA' && !apiKey) {
      return NextResponse.json({ error: '缺少API密钥' }, { status: 400 });
    }

    const result = await testApiConfiguration({
      provider,
      apiKey: apiKey || '',
      baseUrl,
      model
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to test API config:', error);
    return NextResponse.json({ 
      success: false, 
      message: '测试过程中发生错误',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}