import { getUserApiConfig, getDecryptedApiConfig } from './api-config';
import { ApiProvider } from '@/types/api-config';

// 系统默认Kimi配置
const SYSTEM_KIMI_API_BASE_URL = process.env.KIMI_API_BASE_URL || 'https://api.moonshot.cn/v1';
const SYSTEM_KIMI_API_URL = `${SYSTEM_KIMI_API_BASE_URL}/chat/completions`;
const SYSTEM_KIMI_API_KEY = process.env.KIMI_API_KEY;

// 支持的模型类型
type ModelType = 
  | 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini'
  | 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k'
  | 'deepseek-chat' | 'deepseek-reasoner'
  | string; // For Ollama models

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface APIConfig {
  model: ModelType;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

interface AIResponse {
  reply: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  private static instance: AIService;
  private maxRetries = 3;
  private retryDelay = 1000; // 1秒
  private defaultConfig: APIConfig = {
    model: (process.env.KIMI_MODEL as ModelType) || 'moonshot-v1-8k',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0
  };

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }


  private getApiEndpoints(provider: ApiProvider, baseUrl?: string) {
    switch (provider) {
      case ApiProvider.OPENAI:
        return {
          endpoint: `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`,
          authHeader: 'Authorization'
        };
      case ApiProvider.KIMI:
        return {
          endpoint: `${baseUrl || 'https://api.moonshot.cn/v1'}/chat/completions`,
          authHeader: 'Authorization'
        };
      case ApiProvider.DEEPSEEK:
        return {
          endpoint: `${baseUrl || 'https://api.deepseek.com'}/chat/completions`,
          authHeader: 'Authorization'
        };
      case ApiProvider.OLLAMA:
        return {
          endpoint: `${baseUrl || 'http://localhost:11434'}/v1/chat/completions`,
          authHeader: null // Ollama doesn't require auth
        };
      default:
        return {
          endpoint: SYSTEM_KIMI_API_URL,
          authHeader: 'Authorization'
        };
    }
  }

  private async callKimiAPI(
    messages: Message[],
    apiKey: string,
    provider: ApiProvider = ApiProvider.KIMI,
    baseUrl?: string,
    config: APIConfig = this.defaultConfig,
    retries = 0
  ): Promise<any> {
    try {
      const { endpoint, authHeader } = this.getApiEndpoints(provider, baseUrl);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader && apiKey) {
        headers[authHeader] = `Bearer ${apiKey}`;
      }

      // 构建请求体
      const requestBody: any = {
        model: config.model,
        temperature: Math.max(0, Math.min(1, config.temperature)),
        stream: false,
      };

      // 所有提供商都使用OpenAI兼容格式
      requestBody.messages = messages;
      requestBody.max_tokens = Math.max(1, Math.min(8192, config.maxTokens));
      requestBody.top_p = config.topP;
      requestBody.frequency_penalty = config.frequencyPenalty;
      requestBody.presence_penalty = config.presencePenalty;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API错误: ${response.status}`;
        
        // 根据状态码提供更详细的错误信息
        switch (response.status) {
          case 400:
            errorMessage = '请求参数错误，请检查输入内容';
            break;
          case 401:
            errorMessage = 'API密钥无效或已过期';
            break;
          case 403:
            errorMessage = 'API密钥权限不足';
            break;
          case 429:
            errorMessage = '请求过于频繁，请稍后再试';
            break;
          case 500:
            errorMessage = '服务器内部错误，请稍后再试';
            break;
          case 503:
            errorMessage = '服务暂时不可用，请稍后再试';
            break;
          default:
            errorMessage = `API错误: ${response.status} ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 验证标准响应格式
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('API响应格式错误');
      }

      return data;
    } catch (error) {
      if (retries < this.maxRetries) {
        console.warn(`重试API调用 (${retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
        return this.callKimiAPI(messages, apiKey, provider, baseUrl, config, retries + 1);
      }
      throw error;
    }
  }

  private createSystemPrompt(): Message {
    return {
      role: 'system',
      content: `You are an English learning assistant. When I send you English words, phrases, sentences, or an English description, please help me understand the meaning that the English is trying to convey, correct any expression or grammatical errors in the sentences, and provide new examples for the incorrect parts to help me understand and master the language.`
    };
  }

  private createAssistantWelcome(): Message {
    return {
      role: 'assistant',
      content: '请用中文进行解释和说明。'
    };
  }

  async generateReply(
    userId: number, 
    message: string, 
    options?: Partial<APIConfig>,
    conversationHistory?: Message[]
  ): Promise<AIResponse> {
    return this.generateReplyStream(userId, message, undefined, options, conversationHistory);
  }

  async generateReplyStream(
    userId: number,
    message: string,
    onChunk?: (chunk: string) => void,
    options?: Partial<APIConfig>,
    conversationHistory?: Message[]
  ): Promise<AIResponse> {
    try {
      // 1. 获取用户的API配置
      let apiKey: string;
      let provider: ApiProvider;
      let baseUrl: string | undefined;
      let model: string;

      // 2. 使用用户配置或系统默认
      const userApiConfig = await getUserApiConfig(userId);
      const userConfigWithKey = await getDecryptedApiConfig(userId);
      
      if (userApiConfig && userConfigWithKey) {
        // 对于Ollama，不需要验证即可使用
        // 对于其他提供商，需要验证才能使用
        const shouldUseUserConfig = userApiConfig.isValidated || 
                                  userConfigWithKey.provider === ApiProvider.OLLAMA;
        
        if (shouldUseUserConfig) {
          apiKey = userConfigWithKey.apiKey;
          provider = userConfigWithKey.provider;
          baseUrl = userConfigWithKey.baseUrl;
          model = userConfigWithKey.model;
        } else {
          // 回退到系统默认Kimi API
          if (!SYSTEM_KIMI_API_KEY) {
            throw new Error('系统API密钥未配置，请联系管理员');
          }
          apiKey = SYSTEM_KIMI_API_KEY;
          provider = ApiProvider.KIMI;
          baseUrl = SYSTEM_KIMI_API_BASE_URL;
          model = this.defaultConfig.model;
        }
      } else {
        // 回退到系统默认Kimi API
        if (!SYSTEM_KIMI_API_KEY) {
          throw new Error('系统API密钥未配置，请联系管理员');
        }
        apiKey = SYSTEM_KIMI_API_KEY;
        provider = ApiProvider.KIMI;
        baseUrl = SYSTEM_KIMI_API_BASE_URL;
        model = this.defaultConfig.model;
      }

      // 3. 合并配置选项
      const config = {
        ...this.defaultConfig,
        model: model as ModelType,
        ...options
      };

      // 4. 构建消息数组
      let messages: Message[];
      
      if (conversationHistory && conversationHistory.length > 0) {
        // 使用提供的对话历史（包含system、user、assistant角色）
        messages = [...conversationHistory];
        // 确保最后一条是用户消息
        if (messages[messages.length - 1]?.role !== 'user') {
          messages.push({ role: 'user', content: message });
        }
      } else {
        // 使用默认的system + assistant + user消息
        messages = [
          this.createSystemPrompt(),
          this.createAssistantWelcome(),
          { role: 'user', content: message }
        ];
      }

      // 5. 调用AI API（流式）
      if (onChunk) {
        return await this.callKimiAPIStream(
          messages,
          apiKey,
          provider,
          onChunk,
          baseUrl,
          config,
          0,
          message
        );
      } else {
        // 5. 调用AI API（非流式）
        const response = await this.callKimiAPI(
          messages, 
          apiKey, 
          provider, 
          baseUrl, 
          config
        );

        // 6. 提取回复内容
        const reply = response.choices[0]?.message?.content;
        if (!reply) {
          throw new Error('AI响应内容为空');
        }

        return {
          reply,
          usage: response.usage
        };
      }

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // 提供友好的错误消息
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('AI服务暂时不可用，请稍后再试');
    }
  }

  async testUserApiConfig(userId: number): Promise<boolean> {
    try {
      const userApiConfig = await getUserApiConfig(userId);
      const userConfigWithKey = await getDecryptedApiConfig(userId);
      
      if (!userApiConfig || !userApiConfig.isValidated || !userConfigWithKey) {
        return false;
      }

      const testMessages: Message[] = [
        { role: 'user', content: 'Hello' }
      ];

      const response = await this.callKimiAPI(
        testMessages,
        userConfigWithKey.apiKey,
        userConfigWithKey.provider,
        userConfigWithKey.baseUrl,
        this.defaultConfig
      );
      
      return !!(response.choices && response.choices.length > 0);
    } catch {
      return false;
    }
  }

  private async callKimiAPIStream(
    messages: Message[],
    apiKey: string,
    provider: ApiProvider,
    onChunk: (chunk: string) => void,
    baseUrl?: string,
    config: APIConfig = this.defaultConfig,
    retries = 0,
    originalMessage?: string
  ): Promise<AIResponse> {
    try {
      const { endpoint, authHeader } = this.getApiEndpoints(provider, baseUrl);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authHeader && apiKey) {
        headers[authHeader] = `Bearer ${apiKey}`;
      }

      // 构建请求体
      const requestBody: any = {
        model: config.model,
        temperature: Math.max(0, Math.min(1, config.temperature)),
        stream: true, // 启用流式
      };

      // 所有提供商都使用OpenAI兼容格式
      requestBody.messages = messages;
      requestBody.max_tokens = Math.max(1, Math.min(8192, config.maxTokens));
      requestBody.top_p = config.topP;
      requestBody.frequency_penalty = config.frequencyPenalty;
      requestBody.presence_penalty = config.presencePenalty;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API错误: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error('响应流不可用');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }

              try {
                const parsed = JSON.parse(data);
                
                // 处理OpenAI兼容格式
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullContent += content;
                  onChunk(content);
                }
              } catch {
                // 忽略解析错误的行
              }
            }
          }
        }

        return {
          reply: fullContent,
          usage: undefined // 流式响应通常不包含usage
        };
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (retries < this.maxRetries) {
        console.warn(`重试API调用 (${retries + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retries + 1)));
        return this.callKimiAPIStream(messages, apiKey, provider, onChunk, baseUrl, config, retries + 1, originalMessage);
      }
      throw error;
    }
  }
}

// 导出单例实例
export const aiService = AIService.getInstance();