import { NextRequest, NextResponse } from 'next/server';
import { listOllamaModels } from '@/lib/api-validator';

// GET /api/user/api-config/ollama-models - List available Ollama models
export async function GET(request: NextRequest) {
  try {
    // Note: Authentication is handled at the route level, but we allow Ollama discovery
    // since it's a local service that doesn't contain sensitive user data
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl') || 'http://localhost:11434';
    
    const models = await listOllamaModels(baseUrl);
    
    return NextResponse.json({ models });
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return NextResponse.json({ 
      error: '获取模型列表失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}