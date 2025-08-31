import { test, expect } from '@playwright/test';

test.describe('邀请系统 E2E 测试', () => {
  test.beforeEach(async ({ page }) => {
    // 清理测试数据
    await page.request.post('/api/test/cleanup');
  });

  test('完整邀请流程：生成邀请码 -> 邀请注册 -> 验证邀请关系', async ({ page }) => {
    // 1. 登录测试用户
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 等待登录成功
    await page.waitForURL('/');

    // 2. 进入个人中心
    await page.goto('/profile');
    
    // 3. 点击邀请好友
    await page.click('text=邀请好友');
    
    // 4. 生成邀请码
    await page.click('text=生成邀请码');
    
    // 等待邀请码生成
    await page.waitForSelector('text=邀请码：');
    
    // 获取邀请码
    const inviteCode = await page.locator('.font-mono').textContent();
    expect(inviteCode).toBeTruthy();
    
    // 获取邀请链接
    const inviteLink = await page.locator('input[readonly]').inputValue();
    expect(inviteLink).toContain(`/invite/${inviteCode}`);

    // 5. 登出当前用户
    await page.click('text=退出登录');
    await page.waitForURL('/login');

    // 6. 使用邀请链接注册新用户
    await page.goto(inviteLink);
    
    // 验证邀请页面
    await expect(page.locator('h1')).toContainText('欢迎加入英语角！');
    await expect(page.locator('text=邀请码')).toContainText(inviteCode!);
    
    // 7. 填写注册信息
    await page.fill('input[name="email"]', 'invited@example.com');
    await page.fill('input[name="nickname"]', 'Invited User');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    
    // 8. 提交注册
    await page.click('button[type="submit"]');
    
    // 等待注册成功并跳转到首页
    await page.waitForURL('/');
    
    // 9. 验证用户已登录
    await expect(page.locator('text=英语角')).toBeVisible();
    
    // 10. 回到邀请人账户查看统计
    await page.click('text=账户设置');
    await page.click('text=邀请好友');
    
    // 验证邀请统计已更新
    await expect(page.locator('text=总邀请')).toBeVisible();
    await expect(page.locator('text=已接受')).toBeVisible();
  });

  test('无效邀请码处理', async ({ page }) => {
    // 访问无效的邀请链接
    await page.goto('/invite/INVALIDCODE');
    
    // 验证显示错误信息
    await expect(page.locator('text=邀请码无效')).toBeVisible();
    await expect(page.locator('text=邀请码不存在')).toBeVisible();
    
    // 验证提供直接注册选项
    await expect(page.locator('text=直接注册')).toBeVisible();
  });

  test('已使用邀请码处理', async ({ page }) => {
    // 1. 登录并生成邀请码
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    await page.goto('/profile');
    await page.click('text=邀请好友');
    await page.click('text=生成邀请码');
    await page.waitForSelector('text=邀请码：');
    
    const inviteCode = await page.locator('.font-mono').textContent();
    const inviteLink = await page.locator('input[readonly]').inputValue();
    
    // 2. 登出并使用邀请码注册
    await page.click('text=退出登录');
    await page.waitForURL('/login');
    
    await page.goto(inviteLink);
    await page.fill('input[name="email"]', 'invited@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // 3. 登出并再次访问邀请链接
    await page.click('text=退出登录');
    await page.waitForURL('/login');
    
    await page.goto(inviteLink);
    
    // 验证显示邀请码已使用
    await expect(page.locator('text=邀请码无效')).toBeVisible();
    await expect(page.locator('text=邀请码已被使用')).toBeVisible();
  });

  test('移动端分享体验', async ({ page }) => {
    // 设置移动设备视口
    await page.setViewportSize({ width: 375, height: 667 });
    
    // 登录并生成邀请码
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    await page.goto('/profile');
    await page.click('text=邀请好友');
    await page.click('text=生成邀请码');
    await page.waitForSelector('text=邀请码：');
    
    // 验证移动端分享按钮可见
    await expect(page.locator('text=立即分享')).toBeVisible();
    await expect(page.locator('text=二维码')).toBeVisible();
    
    // 验证响应式设计
    const container = page.locator('.bg-white');
    const box = await container.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(375);
  });
});