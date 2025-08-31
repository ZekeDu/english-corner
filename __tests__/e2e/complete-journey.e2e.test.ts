import { test, expect } from '@playwright/test';

// 测试配置
test.describe.configure({ mode: 'serial' });

test.describe('English Corner 完整用户旅程 E2E测试', () => {
  
  test('阶段1-4完整流程：从项目初始化到AI对话', async ({ page }) => {
    // 阶段1：项目初始化验证
    await test.step('项目初始化验证', async () => {
      await page.goto('/');
      await expect(page).toHaveTitle(/English Corner/);
      await expect(page.locator('body')).toBeVisible();
      // 验证Tailwind样式生效
      await expect(page.locator('h1')).toBeVisible();
    });

    // 阶段2：用户注册与认证
    await test.step('用户注册流程', async () => {
      await page.goto('/register');
      
      // 填写注册表单
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'TestPassword123');
      await page.fill('input[name="nickname"]', 'Test User');
      await page.click('button[type="submit"]');
      
      // 验证注册成功
      await page.waitForURL('/login');
      await expect(page.locator('text=注册成功')).toBeVisible();
    });

    await test.step('用户登录流程', async () => {
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'TestPassword123');
      await page.click('button[type="submit"]');
      
      // 验证登录成功
      await page.waitForURL('/');
      await expect(page.locator('text=欢迎回来')).toBeVisible();
    });

    // 阶段3：数据库验证
    await test.step('数据库连接验证', async () => {
      // 验证用户信息已保存
      const userProfile = await page.locator('[data-testid="user-profile"]');
      await expect(userProfile).toContainText('Test User');
    });

    // 阶段4：AI对话功能验证
    await test.step('首次对话创建', async () => {
      await page.fill('textarea[placeholder*="输入消息"]', 'Hello, I want to practice English');
      await page.click('button[data-testid="send-message"]');
      
      // 验证AI回复
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="ai-message"]')).toContainText(/Hello|English/);
      
      // 验证对话保存
      await page.click('[data-testid="history-button"]');
      await expect(page.locator('text=Hello, I want to practice English')).toBeVisible();
    });

    await test.step('多轮对话继续', async () => {
      await page.goBack();
      
      // 继续对话
      await page.fill('textarea[placeholder*="输入消息"]', 'Can you help me with grammar?');
      await page.click('button[data-testid="send-message"]');
      
      // 验证上下文保持
      const messages = await page.locator('[data-testid="message"]').all();
      expect(messages.length).toBeGreaterThan(2);
    });

    await test.step('对话历史管理', async () => {
      await page.click('[data-testid="history-button"]');
      
      // 验证对话列表
      await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
      
      // 搜索功能
      await page.fill('input[placeholder*="搜索对话"]', 'grammar');
      await expect(page.locator('[data-testid="conversation-item"]')).toContainText('grammar');
      
      // 删除对话
      await page.click('[data-testid="delete-conversation"]');
      await expect(page.locator('text=暂无对话')).toBeVisible();
    });
  });

  test('移动端认证与对话完整流程', async ({ page }) => {
    // 模拟iPhone SE
    await page.setViewportSize({ width: 375, height: 667 });
    
    await test.step('移动端注册', async () => {
      await page.goto('/register');
      
      // 验证触摸友好的按钮
      const registerButton = page.locator('button[type="submit"]');
      const buttonBox = await registerButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      
      await page.fill('input[name="email"]', 'mobile@example.com');
      await page.fill('input[name="password"]', 'MobilePass123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('/login');
    });

    await test.step('移动端对话', async () => {
      await page.fill('input[name="email"]', 'mobile@example.com');
      await page.fill('input[name="password"]', 'MobilePass123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('/');
      
      // 测试键盘适配
      const input = page.locator('textarea');
      await input.focus();
      
      // 验证输入框不被键盘遮挡
      const inputBox = await input.boundingBox();
      expect(inputBox?.y).toBeGreaterThan(100);
      
      // 发送消息
      await input.fill('Testing mobile experience');
      await page.click('button[data-testid="send-message"]');
      
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
    });
  });

  test('错误处理与边界情况', async ({ page }) => {
    await test.step('网络错误处理', async () => {
      // 模拟网络中断
      await page.route('**/api/chat', route => route.abort());
      
      await page.goto('/');
      await page.fill('textarea', 'Test message');
      await page.click('button[data-testid="send-message"]');
      
      // 验证错误提示
      await expect(page.locator('text=网络连接失败')).toBeVisible();
    });

    await test.step('认证过期处理', async () => {
      // 模拟认证过期
      await page.context().clearCookies();
      
      await page.reload();
      
      // 验证重定向到登录页
      await page.waitForURL('/login');
      await expect(page.locator('text=请重新登录')).toBeVisible();
    });
  });

  test('性能基准测试', async ({ page }) => {
    await test.step('首屏加载性能', async () => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(2000); // 2秒内加载完成
    });

    await test.step('移动端性能', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      // 验证触摸目标大小
      const loginButton = page.locator('button[type="submit"]');
      const buttonBox = await loginButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThanOrEqual(44);
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    });
  });
});

// 移动端专项测试
test.describe('Mobile Responsive Tests', () => {
  const devices = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12 Pro', width: 390, height: 844 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'iPad Pro', width: 1024, height: 1366 }
  ];

  devices.forEach(device => {
    test(`${device.name} 响应式测试`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });
      
      // 测试注册页面
      await page.goto('/register');
      await expect(page.locator('form')).toBeVisible();
      
      // 测试对话页面
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPass123');
      await page.click('button[type="submit"]');
      
      await page.waitForURL('/');
      await expect(page.locator('textarea')).toBeVisible();
      
      // 验证布局适应
      const container = page.locator('[data-testid="main-container"]');
      const box = await container.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(device.width);
    });
  });
});

// 网络条件测试
test.describe('Network Conditions', () => {
  test('慢网络下的用户体验', async ({ page }) => {
    // 模拟3G网络
    await page.context().route('**/*', route => {
      setTimeout(() => route.continue(), 1000);
    });
    
    await page.goto('/');
    
    // 验证加载状态显示
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // 测试离线模式提示
    await page.context().setOffline(true);
    await page.reload();
    
    await expect(page.locator('text=离线模式')).toBeVisible();
  });
});

// 辅助函数
async function loginUser(page: any, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}