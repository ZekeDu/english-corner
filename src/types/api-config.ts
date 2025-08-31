export enum ApiProvider {
  OPENAI = 'OPENAI',
  KIMI = 'KIMI',
  DEEPSEEK = 'DEEPSEEK',
  OLLAMA = 'OLLAMA'
}

export interface BaseApiConfig {
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface OpenAIConfig extends BaseApiConfig {
  provider: ApiProvider.OPENAI;
  baseUrl?: string;
  model: 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini';
}

export interface KimiConfig extends BaseApiConfig {
  provider: ApiProvider.KIMI;
  baseUrl?: string;
  model: 'moonshot-v1-8k' | 'moonshot-v1-32k' | 'moonshot-v1-128k';
}

export interface DeepSeekConfig extends BaseApiConfig {
  provider: ApiProvider.DEEPSEEK;
  baseUrl?: string;
  model: 'deepseek-chat' | 'deepseek-reasoner';
}

export interface OllamaConfig extends BaseApiConfig {
  provider: ApiProvider.OLLAMA;
  baseUrl: string;
  model: string;
}

export type UserApiConfig = OpenAIConfig | KimiConfig | DeepSeekConfig | OllamaConfig;

export interface ApiConfigResponse {
  id: string;
  provider: ApiProvider;
  baseUrl?: string;
  model: string;
  isValidated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTestRequest {
  provider: ApiProvider;
  apiKey: string;
  baseUrl?: string;
  model: string;
}

export interface ApiTestResponse {
  success: boolean;
  message: string;
  details?: string;
}

export interface ModelOption {
  value: string;
  label: string;
  description?: string;
}

export interface ProviderConfig {
  name: string;
  label: string;
  defaultBaseUrl: string;
  models: ModelOption[];
  requiresApiKey: boolean;
  description: string;
}

export const PROVIDER_CONFIGS: Record<ApiProvider, ProviderConfig> = {
  [ApiProvider.OPENAI]: {
    name: 'OpenAI',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o', description: 'Most capable model' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast and cost-effective' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'High intelligence' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and efficient' }
    ],
    requiresApiKey: true,
    description: 'OpenAI GPT models'
  },
  [ApiProvider.KIMI]: {
    name: 'Kimi',
    label: '月之暗面 Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    models: [
      { value: 'moonshot-v1-8k', label: 'Kimi 8K', description: '8K context window' },
      { value: 'moonshot-v1-32k', label: 'Kimi 32K', description: '32K context window' },
      { value: 'moonshot-v1-128k', label: 'Kimi 128K', description: '128K context window' }
    ],
    requiresApiKey: true,
    description: 'Kimi models from Moonshot AI'
  },
  [ApiProvider.DEEPSEEK]: {
    name: 'DeepSeek',
    label: '深度求索',
    defaultBaseUrl: 'https://api.deepseek.com',
    models: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat', description: 'General purpose chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: 'Advanced reasoning' }
    ],
    requiresApiKey: true,
    description: 'DeepSeek AI models'
  },
  [ApiProvider.OLLAMA]: {
    name: 'Ollama',
    label: 'Ollama 本地模型',
    defaultBaseUrl: 'http://localhost:11434',
    models: [
      { value: 'llama2', label: 'Llama 2', description: 'Meta Llama 2' },
      { value: 'mistral', label: 'Mistral', description: 'Mistral AI model' },
      { value: 'codellama', label: 'Code Llama', description: 'Code-focused model' },
      { value: 'vicuna', label: 'Vicuna', description: 'Vicuna chat model' }
    ],
    requiresApiKey: false,
    description: 'Local Ollama models'
  }
};