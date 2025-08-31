import { PrismaClient } from '@prisma/client';
import { 
  getUserApiConfig, 
  createUserApiConfig, 
  updateUserApiConfig, 
  deleteUserApiConfig,
  getDecryptedApiConfig,
  setApiConfigValidation
} from '../api-config';
import { ApiProvider } from '@/types/api-config';

// Mock crypto module
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('test-iv-16-bytes')),
  createCipheriv: jest.fn(() => ({
    update: jest.fn(() => 'encrypted-data'),
    final: jest.fn(() => '-final'),
  })),
  createDecipheriv: jest.fn(() => ({
    update: jest.fn(() => 'decrypted-data'),
    final: jest.fn(() => '-final'),
  })),
}));

// Mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    userApiConfig: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  })),
}));

describe('API Configuration Service', () => {
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient();
    
    // Set up mock environment
    process.env.API_KEY_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
  });

  describe('getUserApiConfig', () => {
    it('should return null when no config exists', async () => {
      mockPrisma.userApiConfig.findUnique.mockResolvedValue(null);

      const result = await getUserApiConfig(1);
      expect(result).toBeNull();
    });

    it('should return config data without API key', async () => {
      const mockConfig = {
        id: 'config-1',
        provider: ApiProvider.OPENAI,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.userApiConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await getUserApiConfig(1);
      expect(result).toEqual({
        id: 'config-1',
        provider: ApiProvider.OPENAI,
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      });
    });
  });

  describe('createUserApiConfig', () => {
    it('should create new config with encrypted API key', async () => {
      const mockCreate = {
        id: 'new-config',
        provider: ApiProvider.KIMI,
        apiKey: 'encrypted-key',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
        isValidated: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      mockPrisma.userApiConfig.create.mockResolvedValue(mockCreate);

      const result = await createUserApiConfig(1, {
        provider: ApiProvider.KIMI,
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
      });

      expect(mockPrisma.userApiConfig.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          provider: ApiProvider.KIMI,
          apiKey: expect.any(String), // Encrypted key
          baseUrl: 'https://api.moonshot.cn/v1',
          model: 'moonshot-v1-8k',
          isValidated: false,
        },
      });

      expect(result).toEqual({
        id: 'new-config',
        provider: ApiProvider.KIMI,
        baseUrl: 'https://api.moonshot.cn/v1',
        model: 'moonshot-v1-8k',
        isValidated: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
    });
  });

  describe('updateUserApiConfig', () => {
    it('should update config and reset validation', async () => {
      const mockUpdate = {
        id: 'updated-config',
        provider: ApiProvider.DEEPSEEK,
        apiKey: 'updated-encrypted-key',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        isValidated: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      mockPrisma.userApiConfig.update.mockResolvedValue(mockUpdate);

      const result = await updateUserApiConfig(1, {
        provider: ApiProvider.DEEPSEEK,
        apiKey: 'new-api-key',
        model: 'deepseek-chat',
      });

      expect(mockPrisma.userApiConfig.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          provider: ApiProvider.DEEPSEEK,
          apiKey: expect.any(String), // Encrypted key
          model: 'deepseek-chat',
          isValidated: false,
        },
      });

      expect(result.isValidated).toBe(false);
    });
  });

  describe('getDecryptedApiConfig', () => {
    it('should return decrypted API key', async () => {
      const mockConfig = {
        id: 'config-1',
        provider: ApiProvider.OPENAI,
        apiKey: 'encrypted-key',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        isValidated: true,
      };

      mockPrisma.userApiConfig.findUnique.mockResolvedValue(mockConfig);

      const result = await getDecryptedApiConfig(1);
      
      expect(result).toMatchObject({
        id: 'config-1',
        provider: ApiProvider.OPENAI,
        apiKey: expect.any(String), // Decrypted key
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
      });
    });
  });

  describe('deleteUserApiConfig', () => {
    it('should delete user config', async () => {
      mockPrisma.userApiConfig.delete.mockResolvedValue({});

      await deleteUserApiConfig(1);

      expect(mockPrisma.userApiConfig.delete).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });
  });

  describe('setApiConfigValidation', () => {
    it('should update validation status', async () => {
      await setApiConfigValidation(1, true);

      expect(mockPrisma.userApiConfig.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { isValidated: true },
      });
    });
  });
});