import { testApiConfiguration, listOllamaModels } from '../api-validator';
import { ApiProvider } from '@/types/api-config';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('API Validator Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('testApiConfiguration', () => {
    it('should validate OpenAI API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello! I\'m an AI assistant.'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
            'Content-Type': 'application/json'
          })
        })
      );

      expect(result).toEqual({
        success: true,
        message: 'API配置验证成功',
        details: expect.stringContaining('模型响应')
      });
    });

    it('should validate Kimi API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: '你好，我是Kimi AI助手。'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.KIMI,
        apiKey: 'sk-kimi-key',
        model: 'moonshot-v1-8k'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.moonshot.cn/v1/chat/completions',
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should validate DeepSeek API successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from DeepSeek'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.DEEPSEEK,
        apiKey: 'sk-deepseek-key',
        model: 'deepseek-chat'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/chat/completions',
        expect.any(Object)
      );

      expect(result.success).toBe(true);
    });

    it('should handle API error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid API key'
          }
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.OPENAI,
        apiKey: 'invalid-key',
        model: 'gpt-4o'
      });

      expect(result).toEqual({
        success: false,
        message: 'API连接失败',
        details: 'Invalid API key'
      });
    });

    it('should handle network failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await testApiConfiguration({
        provider: ApiProvider.KIMI,
        apiKey: 'sk-test-key',
        model: 'moonshot-v1-8k'
      });

      expect(result).toEqual({
        success: false,
        message: '验证过程中发生错误',
        details: 'Network error'
      });
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: ''
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      });

      expect(result).toEqual({
        success: false,
        message: 'API返回空内容',
        details: 'Model returned empty response'
      });
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          invalid: 'format'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-test-key',
        model: 'gpt-4o'
      });

      expect(result).toEqual({
        success: false,
        message: 'API响应格式无效',
        details: 'Response does not contain expected structure'
      });
    });

    it('should validate Ollama API without API key', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello from Ollama'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await testApiConfiguration({
        provider: ApiProvider.OLLAMA,
        apiKey: '', // No API key required
        model: 'llama2',
        baseUrl: 'http://localhost:11434'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );

      expect(result.success).toBe(true);
    });

    it('should use custom base URL when provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Hello'
            }
          }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await testApiConfiguration({
        provider: ApiProvider.OPENAI,
        apiKey: 'sk-test-key',
        model: 'gpt-4o',
        baseUrl: 'https://custom-openai.com/v1'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://custom-openai.com/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  describe('listOllamaModels', () => {
    it('should return list of Ollama models', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama2' },
            { name: 'mistral' },
            { name: 'codellama' }
          ]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await listOllamaModels('http://localhost:11434');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags'
      );

      expect(result).toEqual(['codellama', 'llama2', 'mistral']); // Sorted
    });

    it('should return empty array when no models found', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: []
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await listOllamaModels('http://localhost:11434');
      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await listOllamaModels('http://localhost:11434');
      expect(result).toEqual([]);
    });

    it('should handle invalid response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          invalid: 'format'
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await listOllamaModels('http://localhost:11434');
      expect(result).toEqual([]);
    });

    it('should use custom base URL', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [{ name: 'llama2' }]
        })
      };

      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      await listOllamaModels('http://custom-ollama:8080');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://custom-ollama:8080/api/tags'
      );
    });
  });
});