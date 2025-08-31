import { PrismaClient } from '@prisma/client';
import { ApiProvider, UserApiConfig, ApiConfigResponse, OpenAIConfig, KimiConfig, DeepSeekConfig } from '@/types/api-config';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'default-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

// Simple encryption for API keys - using fixed IV for testing compatibility
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text: string): string {
  if (!text || !text.includes(':')) return text;
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function getUserApiConfig(userId: number): Promise<ApiConfigResponse | null> {
  const config = await prisma.userApiConfig.findUnique({
    where: { userId }
  });

  if (!config) return null;

  return {
    id: config.id,
    provider: config.provider as ApiProvider,
    baseUrl: config.baseUrl || undefined,
    model: config.model,
    isValidated: config.isValidated,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

export async function createUserApiConfig(
  userId: number,
  config: UserApiConfig
): Promise<ApiConfigResponse> {
  const encryptedKey = encrypt(config.apiKey);

  const newConfig = await prisma.userApiConfig.create({
    data: {
      userId,
      provider: config.provider,
      apiKey: encryptedKey,
      baseUrl: config.baseUrl,
      model: config.model,
      isValidated: false // Will be validated separately
    }
  });

  return {
    id: newConfig.id,
    provider: newConfig.provider as ApiProvider,
    baseUrl: newConfig.baseUrl || undefined,
    model: newConfig.model,
    isValidated: newConfig.isValidated,
    createdAt: newConfig.createdAt.toISOString(),
    updatedAt: newConfig.updatedAt.toISOString()
  };
}

export async function updateUserApiConfig(
  userId: number,
  config: Partial<UserApiConfig>
): Promise<ApiConfigResponse> {
  const updateData: any = {
    provider: config.provider,
    model: config.model,
    isValidated: false // Reset validation on update
  };

  if (config.apiKey) {
    updateData.apiKey = encrypt(config.apiKey);
  }
  if (config.baseUrl !== undefined) {
    updateData.baseUrl = config.baseUrl;
  }

  const updatedConfig = await prisma.userApiConfig.update({
    where: { userId },
    data: updateData
  });

  return {
    id: updatedConfig.id,
    provider: updatedConfig.provider as ApiProvider,
    baseUrl: updatedConfig.baseUrl || undefined,
    model: updatedConfig.model,
    isValidated: updatedConfig.isValidated,
    createdAt: updatedConfig.createdAt.toISOString(),
    updatedAt: updatedConfig.updatedAt.toISOString()
  };
}

export async function deleteUserApiConfig(userId: number): Promise<void> {
  await prisma.userApiConfig.delete({
    where: { userId }
  });
}

export async function getDecryptedApiConfig(userId: number): Promise<(UserApiConfig & { id: string }) | null> {
  const config = await prisma.userApiConfig.findUnique({
    where: { userId }
  });

  if (!config) return null;

  const provider = config.provider as ApiProvider;
  
  switch (provider) {
    case ApiProvider.OPENAI:
      return {
        id: config.id,
        provider: ApiProvider.OPENAI,
        apiKey: decrypt(config.apiKey),
        baseUrl: config.baseUrl || undefined,
        model: config.model as OpenAIConfig['model']
      };
    case ApiProvider.KIMI:
      return {
        id: config.id,
        provider: ApiProvider.KIMI,
        apiKey: decrypt(config.apiKey),
        baseUrl: config.baseUrl || undefined,
        model: config.model as KimiConfig['model']
      };
    case ApiProvider.DEEPSEEK:
      return {
        id: config.id,
        provider: ApiProvider.DEEPSEEK,
        apiKey: decrypt(config.apiKey),
        baseUrl: config.baseUrl || undefined,
        model: config.model as DeepSeekConfig['model']
      };
    case ApiProvider.OLLAMA:
      return {
        id: config.id,
        provider: ApiProvider.OLLAMA,
        apiKey: decrypt(config.apiKey),
        baseUrl: config.baseUrl!,
        model: config.model
      };
    default:
      return null;
  }
}

export async function setApiConfigValidation(userId: number, isValidated: boolean): Promise<void> {
  await prisma.userApiConfig.update({
    where: { userId },
    data: { isValidated }
  });
}