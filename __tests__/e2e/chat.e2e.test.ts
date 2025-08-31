import { test, expect } from '@playwright/test';

/**
 * 端到端测试 - 用户对话场景
 * 测试完整用户流程：登录→对话→保存→查看历史
 */

test.describe('Chat E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 设置测试环境
    await page.goto('http://localhost:3000');
  });

  test.describe('用户对话流程', () => {
    test('应该支持新用户注册和对话', async ({ page }) => {
      // 1. 访问注册页面
      await page.goto('http://localhost:3000/register');
      
      // 2. 填写注册信息
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      
      // 3. 提交注册
      await page.click('button[type="submit"]');
      
      // 4. 验证重定向到主页
      await expect(page).toHaveURL('http://localhost:3000/');
      
      // 5. 验证页面标题
      await expect(page.locator('h1')).toContainText('英语角');
    });

    test('应该支持用户登录', async ({ page }) => {
      // 1. 访问登录页面
      await page.goto('http://localhost:3000/login');
      
      // 2. 填写登录信息
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      
      // 3. 提交登录
      await page.click('button[type="submit"]');
      
      // 4. 验证登录成功
      await expect(page).toHaveURL('http://localhost:3000/');
    });

    test('应该支持对话功能', async ({ page }) => {
      // 1. 用户登录
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 2. 等待页面加载
      await page.waitForURL('http://localhost:3000/');
      
      // 3. 输入消息
      const messageInput = page.locator('textarea[placeholder*="输入英文"]');
      await messageInput.fill('Hello, how are you?');
      
      // 4. 发送消息
      const sendButton = page.locator('button[type="submit"], button:has-text("发送")');
      await sendButton.click();
      
      // 5. 验证消息显示
      await expect(page.locator('text=Hello, how are you?')).toBeVisible();
      
      // 6. 验证AI回复
      const aiReply = page.locator('.message-assistant');
      await expect(aiReply).toBeVisible();
      expect(await aiReply.textContent()).toContain('你好');
    });

    test('应该支持对话历史查看', async ({ page }) => {
      // 1. 用户登录
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 2. 发送测试消息
      await page.waitForURL('http://localhost:3000/');
      const messageInput = page.locator('textarea');
      await messageInput.fill('Test message');
      await page.click('button[type="submit"]');
      
      // 3. 保存对话
      const saveButton = page.locator('button:has-text("保存")');
      await saveButton.click();
      
      // 4. 访问历史页面
      await page.goto('http://localhost:3000/history');
      
      // 5. 验证历史记录
      await expect(page.locator('text=Test message')).toBeVisible();
    });

    test('应该支持移动端体验', async ({ page }) => {
      // 设置移动设备视口
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 1. 用户登录
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 2. 验证移动端适配
      await page.waitForURL('http://localhost:3000/');
      
      // 3. 检查输入框位置
      const inputContainer = page.locator('.chat-input-container');
      await expect(inputContainer).toBeVisible();
      
      // 4. 检查响应式设计
      const container = page.locator('.container');
      const box = await container.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });
  });

  test.describe('错误处理', () => {
    test('应该处理未认证访问', async ({ page }) => {
      // 直接访问需要认证的页面
      await page.goto('http://localhost:3000/');
      
      // 应该重定向到登录页
      await expect(page).toHaveURL(/\/login/);
    });

    test('应该处理空消息', async ({ page }) => {
      // 登录用户
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 尝试发送空消息
      await page.waitForURL('http://localhost:3000/');
      const sendButton = page.locator('button[type="submit"]');
      await sendButton.click();
      
      // 应该显示错误提示
      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });

    test('应该处理网络错误', async ({ page }) => {
      // 模拟网络错误
      await page.route('**/api/chat', route => route.abort());
      
      // 登录用户
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 尝试发送消息
      await page.waitForURL('http://localhost:3000/');
      const messageInput = page.locator('textarea');
      await messageInput.fill('Test message');
      await page.click('button[type="submit"]');
      
      // 应该显示网络错误
      const errorMessage = page.locator('.error-message');
      await expect(errorMessage).toBeVisible();
    });
  });

  test.describe('数据持久化', () => {
    test('应该保存对话历史', async ({ page }) => {
      // 1. 用户登录
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 2. 发送多条消息
      await page.waitForURL('http://localhost:3000/');
      
      const messages = ['Hello', 'How are you?', 'What time is it?'];
      
      for (const message of messages) {
        const messageInput = page.locator('textarea');
        await messageInput.fill(message);
        await page.click('button[type="submit"]');
        
        // 等待回复
        await page.waitForTimeout(1000);
      }
      
      // 3. 保存对话
      const saveButton = page.locator('button:has-text("保存")');
      await saveButton.click();
      
      // 4. 检查历史
      await page.goto('http://localhost:3000/history');
      
      // 5. 验证所有消息都存在
      for (const message of messages) {
        await expect(page.locator(`text=${message}`)).toBeVisible();
      }
    });

    test('应该支持对话删除', async ({ page }) => {
      // 1. 用户登录
      await page.goto('http://localhost:3000/login');
      await page.fill('input[type="email"]', 'testuser@example.com');
      await page.fill('input[type="password"]', 'Test123456');
      await page.click('button[type="submit"]');
      
      // 2. 发送消息并保存
      await page.waitForURL('http://localhost:3000/');
      const messageInput = page.locator('textarea');
      await messageInput.fill('Test message to delete');
      await page.click('button[type="submit"]');
      await page.click('button:has-text("保存")');
      
      // 3. 访问历史页面
      await page.goto('http://localhost:3000/history');
      
      // 4. 删除对话
      const deleteButton = page.locator('button:has-text("删除")').first();
      await deleteButton.click();
      
      // 5. 确认删除
      const confirmButton = page.locator('button:has-text("确认")');
      await confirmButton.click();
      
      // 6. 验证对话已删除
      await expect(page.locator('text=Test message to delete')).not.toBeVisible();
    });
  });
});