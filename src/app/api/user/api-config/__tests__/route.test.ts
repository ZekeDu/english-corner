import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '../route';
import { getServerSession } from 'next-auth';
import { getUserApiConfig, createUserApiConfig, updateUserApiConfig, deleteUserApiConfig } from '@/lib/api-config';

// Mock dependencies
jest.mock('next-auth');
jest.mock('@/lib/api-config');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockGetUserApiConfig = getUserApiConfig as jest.MockedFunction<typeof getUserApiConfig>;
const mockCreateUserApiConfig = createUserApiConfig as jest.MockedFunction<typeof createUserApiConfig>;
const mockUpdateUserApiConfig = updateUserApiConfig as jest.MockedFunction<typeof updateUserApiConfig>;
const mockDeleteUserApiConfig = deleteUserApiConfig as jest.MockedFunction<typeof deleteUserApiConfig>;

describe('/api/user/api-config Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/api-config', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: '未授权' });
    });

    it('should return user API config when authenticated', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      const mockConfig = {
        id: 'config-1',
        provider: 'OPENAI',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockGetUserApiConfig.mockResolvedValue(mockConfig);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockConfig);
      expect(mockGetUserApiConfig).toHaveBeenCalledWith(1);
    });

    it('should return null when no config exists', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockGetUserApiConfig.mockResolvedValue(null);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockGetUserApiConfig.mockRejectedValue(new Error('Database error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '获取配置失败' });
    });
  });

  describe('POST /api/user/api-config', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/api-config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'OPENAI',
          apiKey: 'sk-test-key',
          model: 'gpt-4o'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: '未授权' });
    });

    it('should create new config when none exists', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockGetUserApiConfig.mockResolvedValue(null);

      const mockNewConfig = {
        id: 'new-config',
        provider: 'KIMI',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
        isValidated: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      mockCreateUserApiConfig.mockResolvedValue(mockNewConfig);

      const request = new NextRequest('http://localhost:3000/api/user/api-config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'KIMI',
          apiKey: 'sk-test-key',
          model: 'moonshot-v1-8k'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNewConfig);
      expect(mockCreateUserApiConfig).toHaveBeenCalledWith(1, {
        provider: 'KIMI',
        apiKey: 'sk-test-key',
        model: 'moonshot-v1-8k'
      });
    });

    it('should update existing config', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockGetUserApiConfig.mockResolvedValue({ id: 'existing-config' });

      const mockUpdatedConfig = {
        id: 'updated-config',
        provider: 'DEEPSEEK',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        isValidated: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      };

      mockUpdateUserApiConfig.mockResolvedValue(mockUpdatedConfig);

      const request = new NextRequest('http://localhost:3000/api/user/api-config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'DEEPSEEK',
          apiKey: 'sk-new-key',
          baseUrl: 'https://api.deepseek.com',
          model: 'deepseek-chat'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUpdatedConfig);
      expect(mockUpdateUserApiConfig).toHaveBeenCalledWith(1, {
        provider: 'DEEPSEEK',
        apiKey: 'sk-new-key',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat'
      });
    });

    it('should return 400 for missing required parameters', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      const request = new NextRequest('http://localhost:3000/api/user/api-config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'OPENAI'
          // Missing apiKey and model
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({ error: '缺少必要参数' });
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockCreateUserApiConfig.mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/user/api-config', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'OPENAI',
          apiKey: 'sk-test-key',
          model: 'gpt-4o'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '保存配置失败' });
    });
  });

  describe('DELETE /api/user/api-config', () => {
    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({ error: '未授权' });
    });

    it('should delete user API config', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockDeleteUserApiConfig.mockResolvedValue(undefined);

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(mockDeleteUserApiConfig).toHaveBeenCalledWith(1);
    });

    it('should handle errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: 'test@example.com', id: '1' }
      });

      mockDeleteUserApiConfig.mockRejectedValue(new Error('Database error'));

      const response = await DELETE();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: '删除配置失败' });
    });
  });
});