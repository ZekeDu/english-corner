import { ApiProvider, ApiTestRequest, ApiTestResponse } from '@/types/api-config';

interface TestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ApiTestPayload {
  model: string;
  messages: TestMessage[];
  max_tokens: number;
  temperature: number;
}

export async function testApiConfiguration(config: ApiTestRequest): Promise<ApiTestResponse> {
  try {
    const { provider, apiKey, baseUrl, model } = config;
    
    let endpoint: string;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Configure endpoint and headers based on provider
    switch (provider) {
      case ApiProvider.OPENAI:
        endpoint = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case ApiProvider.KIMI:
        endpoint = `${baseUrl || 'https://api.moonshot.cn/v1'}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case ApiProvider.DEEPSEEK:
        endpoint = `${baseUrl || 'https://api.deepseek.com'}/chat/completions`;
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
        
      case ApiProvider.OLLAMA:
        endpoint = `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`;
        // Ollama doesn't require API key for local usage, but uses OpenAI-compatible format
        break;
        
      default:
        return {
          success: false,
          message: '不支持的API提供商',
          details: `Provider ${provider} is not supported`
        };
    }
    
    const payload: ApiTestPayload = {
      model,
      messages: [
        {
          role: 'user',
          content: '你好，请用一句话自我介绍。'
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      
      return {
        success: false,
        message: 'API连接失败',
        details: errorMessage
      };
    }
    
    const data = await response.json();
    
    // Validate response structure
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        success: false,
        message: 'API响应格式无效',
        details: 'Response does not contain expected structure'
      };
    }
    
    const content = data.choices[0].message.content;
    if (!content || content.trim().length === 0) {
      return {
        success: false,
        message: 'API返回空内容',
        details: 'Model returned empty response'
      };
    }
    
    return {
      success: true,
      message: 'API配置验证成功',
      details: `模型响应: ${content.slice(0, 50)}...`
    };
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch')) {
        return {
          success: false,
          message: '网络连接失败',
          details: '无法连接到API服务器，请检查网络设置'
        };
      }
      
      if (error.message.includes('ECONNREFUSED')) {
        return {
          success: false,
          message: '连接被拒绝',
          details: '无法连接到服务器，请检查URL是否正确'
        };
      }
      
      return {
        success: false,
        message: '验证过程中发生错误',
        details: error.message
      };
    }
    
    return {
      success: false,
      message: '未知错误',
      details: '请检查配置并重试'
    };
  }
}

export async function listOllamaModels(baseUrl: string = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.models || !Array.isArray(data.models)) {
      return [];
    }
    
    return data.models.map((model: any) => model.name).sort();
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    return [];
  }
}