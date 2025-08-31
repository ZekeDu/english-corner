// Database tests don't need jest-dom
// import '@testing-library/jest-dom'

// Jest setup for API configuration tests
process.env.NODE_ENV = 'test';
process.env.API_KEY_ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!';
process.env.SYSTEM_KIMI_API_KEY = 'sk-test-system-key';
process.env.SYSTEM_OPENAI_API_KEY = 'sk-test-openai-key';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock crypto for consistent encryption tests
jest.mock('crypto', () => ({
  createCipheriv: jest.fn(),
  createDecipheriv: jest.fn(),
  randomBytes: jest.fn(),
}));