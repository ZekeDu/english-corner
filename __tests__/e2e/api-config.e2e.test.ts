import { test, expect } from '@playwright/test';

test.describe('API Configuration E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test.describe('API Management UI', () => {
    test('should navigate to API settings', async ({ page }) => {
      await page.goto('/profile');
      
      // Click on API Configuration in sidebar
      await page.click('text=API配置');
      
      // Verify we're on API settings page
      await expect(page.locator('h1, h2, h3')).toContainText('API配置');
      await expect(page.locator('text=配置您自己的大模型API')).toBeVisible();
    });

    test('should display current API configuration status', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Check if system default message is shown when no config exists
      await expect(page.locator('text=当前使用系统默认的Kimi API')).toBeVisible();
    });

    test('should configure OpenAI API successfully', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Select OpenAI provider
      await page.click('[data-testid="provider-select"]');
      await page.click('text=OpenAI - OpenAI GPT models');
      
      // Enter API key
      await page.fill('input[type="password"]', 'sk-test-openai-key');
      
      // Select model
      await page.click('[data-testid="model-select"]');
      await page.click('text=GPT-4o - Most capable model');
      
      // Test API
      await page.click('button:has-text("测试API")');
      
      // Wait for test result
      await expect(page.locator('text=API配置验证成功')).toBeVisible();
      
      // Save configuration
      await page.click('button:has-text("保存配置")');
      
      // Verify success message or redirect
      await expect(page.locator('text=已保存')).toBeVisible();
    });

    test('should configure Kimi API successfully', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Select Kimi provider
      await page.click('[data-testid="provider-select"]');
      await page.click('text=月之暗面 Kimi - Kimi models from Moonshot AI');
      
      // Enter API key
      await page.fill('input[type="password"]', 'sk-test-kimi-key');
      
      // Select model
      await page.click('[data-testid="model-select"]');
      await page.click('text=Kimi 8K - 8K context window');
      
      // Test API
      await page.click('button:has-text("测试API")');
      
      // Wait for test result
      await expect(page.locator('text=API配置验证成功')).toBeVisible();
      
      // Save configuration
      await page.click('button:has-text("保存配置")');
    });

    test('should handle API validation failure gracefully', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Select OpenAI provider
      await page.click('[data-testid="provider-select"]');
      await page.click('text=OpenAI - OpenAI GPT models');
      
      // Enter invalid API key
      await page.fill('input[type="password"]', 'invalid-api-key');
      
      // Select model
      await page.click('[data-testid="model-select"]');
      await page.click('text=GPT-4o');
      
      // Test API
      await page.click('button:has-text("测试API")');
      
      // Wait for error message
      await expect(page.locator('text=API连接失败')).toBeVisible();
      
      // Should not allow saving invalid config
      await expect(page.locator('button:has-text("保存配置")')).toBeDisabled();
    });

    test('should delete API configuration', async ({ page }) => {
      // First create a config
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Create and save a config
      await page.click('[data-testid="provider-select"]');
      await page.click('text=OpenAI');
      await page.fill('input[type="password"]', 'sk-test-key');
      await page.click('[data-testid="model-select"]');
      await page.click('text=GPT-4o');
      await page.click('button:has-text("测试API")');
      await expect(page.locator('text=API配置验证成功')).toBeVisible();
      await page.click('button:has-text("保存配置")');
      
      // Verify config is created
      await page.reload();
      await expect(page.locator('text=OpenAI')).toBeVisible();
      
      // Delete configuration
      await page.click('button:has-text("删除配置")');
      await page.waitForTimeout(1000); // Wait for confirmation
      
      // Verify deletion
      await page.reload();
      await expect(page.locator('text=当前使用系统默认的Kimi API')).toBeVisible();
    });

    test('should handle Ollama local model configuration', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Select Ollama provider
      await page.click('[data-testid="provider-select"]');
      await page.click('text=Ollama 本地模型');
      
      // Enter custom base URL
      await page.fill('input[type="url"]', 'http://localhost:11434');
      
      // Wait for models to load (mock response)
      await page.waitForTimeout(1000);
      
      // Select model if available
      const modelSelect = page.locator('[data-testid="model-select"]');
      if (await modelSelect.isVisible()) {
        await modelSelect.click();
        const modelOptions = page.locator('[role="option"]');
        if (await modelOptions.first().isVisible()) {
          await modelOptions.first().click();
        }
      }
      
      // Test API
      await page.click('button:has-text("测试API")');
    });

    test('should persist API configuration across page reloads', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Configure DeepSeek
      await page.click('[data-testid="provider-select"]');
      await page.click('text=深度求索');
      await page.fill('input[type="password"]', 'sk-test-deepseek-key');
      await page.click('[data-testid="model-select"]');
      await page.click('text=DeepSeek Chat');
      await page.click('button:has-text("测试API")');
      await expect(page.locator('text=API配置验证成功')).toBeVisible();
      await page.click('button:has-text("保存配置")');
      
      // Reload page and verify config persists
      await page.reload();
      await page.click('text=API配置');
      
      // Verify the saved configuration is displayed
      await expect(page.locator('text=深度求索')).toBeVisible();
      await expect(page.locator('text=DeepSeek Chat')).toBeVisible();
    });
  });

  test.describe('API Configuration Fallback Testing', () => {
    test('should use system K2 when user config is invalid', async ({ page }) => {
      // Mock invalid config scenario
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Create invalid config
      await page.click('[data-testid="provider-select"]');
      await page.click('text=OpenAI');
      await page.fill('input[type="password"]', 'invalid-key');
      await page.click('[data-testid="model-select"]');
      await page.click('text=GPT-4o');
      await page.click('button:has-text("保存配置")');
      
      // Navigate to chat and test that system K2 is used
      await page.goto('/');
      await page.fill('textarea', 'Hello, test fallback');
      await page.click('button[type="submit"]');
      
      // Verify response comes through (this would need proper mocking)
      await page.waitForTimeout(2000);
    });

    test('should use user config when valid', async ({ page }) => {
      await page.goto('/profile');
      await page.click('text=API配置');
      
      // Create valid config
      await page.click('[data-testid="provider-select"]');
      await page.click('text=Kimi');
      await page.fill('input[type="password"]', 'sk-valid-kimi-key');
      await page.click('[data-testid="model-select"]');
      await page.click('text=Kimi 8K');
      await page.click('button:has-text("测试API")');
      await expect(page.locator('text=API配置验证成功')).toBeVisible();
      await page.click('button:has-text("保存配置")');
      
      // Test chat functionality with user config
      await page.goto('/');
      await page.fill('textarea', 'Hello, test user config');
      await page.click('button[type="submit"]');
      
      // Verify response comes through
      await page.waitForTimeout(2000);
    });
  });
});