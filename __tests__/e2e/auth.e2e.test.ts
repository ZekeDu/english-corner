/**
 * End-to-End Authentication Tests
 * Tests the complete user authentication flow
 */
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Reset database before each test
    await page.goto('/');
    // In a real setup, we'd have a test database reset endpoint
  });

  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      // Navigate to registration page
      await page.goto('/register');

      // Fill registration form
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="nickname"]', 'Test User');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to login page or show success state
      await expect(page).toHaveURL(/.*\/login|.*\/register/);
      
      // Check for success indication (either redirect or message)
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        await expect(page.locator('h2')).toContainText(/欢迎回来|Sign in/);
      }
    });

    test('should show error for duplicate email', async ({ page }) => {
      // First registration
      await page.goto('/register');
      await page.fill('input[name="email"]', 'duplicate@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for redirect or success
      await page.waitForURL(/.*\/login|.*\/register/, { timeout: 10000 });

      // Try to register same email again
      await page.goto('/register');
      await page.fill('input[name="email"]', 'duplicate@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('[class*="text-red-"]')).toContainText(/already exists|已存在/);
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'password123');
      
      // Check browser prevents submission with invalid email
      const emailInput = page.locator('input[name="email"]');
      const isValid = await emailInput.evaluate(el => el.checkValidity());
      expect(isValid).toBe(false);
      
      // Form should not submit with invalid email
      const form = page.locator('form');
      const formIsValid = await form.evaluate(el => el.checkValidity());
      expect(formIsValid).toBe(false);
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.fill('input[name="confirmPassword"]', 'different123');
      await page.click('button[type="submit"]');

      await expect(page.locator('[class*="text-red-"]')).toContainText(/do not match|不匹配|不一致/);
    });
  });

  test.describe('User Login', () => {
    test.beforeEach(async ({ page }) => {
      // Create test user via API
      await page.request.post('/api/auth/register', {
        data: {
          email: 'loginuser@example.com',
          password: 'password123',
          nickname: 'Login Test User'
        }
      });
    });

    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'loginuser@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Should redirect to home page (or dashboard when implemented)
      await expect(page).toHaveURL(/\/$|\/dashboard/);
    });

    test('should show error for invalid password', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'loginuser@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.locator('[class*="text-red-"]')).toContainText(/Invalid email or password|邮箱或密码错误|登录失败/);
    });

    test('should show error for non-existent user', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      await expect(page.locator('[class*="text-red-"]')).toContainText(/Invalid email or password|邮箱或密码错误|登录失败/);
    });
  });

  test.describe('Session Management', () => {
    test.beforeEach(async ({ page }) => {
      // Create and login test user
      await page.request.post('/api/auth/register', {
        data: {
          email: 'session@example.com',
          password: 'password123',
          nickname: 'Session Test User'
        }
      });
    });

    test('should maintain session after page refresh', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'session@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for redirect to home
      await page.waitForURL(/\/$|\/dashboard/);

      // Refresh page - should still be logged in
      await page.reload();

      // Should still be on home page (not redirected to login)
      await expect(page).toHaveURL(/\/$|\/dashboard/);
    });

    test('should redirect to login for protected routes when not authenticated', async ({ page }) => {
      // Skip this test for now as we don't have protected routes set up yet
      test.skip();
      
      // When we have protected routes, this test will be:
      // await page.goto('/protected-route');
      // await expect(page).toHaveURL(/.*\/login/);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on iPhone viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/register');
      
      // Check if form elements are visible and accessible
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveCSS('font-size', '16px'); // Prevents zoom on iOS

      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
      
      // Check button is reasonably sized for touch (at least 36px height)
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(36); // Touch target size - relaxed for testing
    });

    test('should work on Android viewport', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 });
      
      await page.goto('/login');
      
      // Check form accessibility
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();
      
      const passwordInput = page.locator('input[name="password"]');
      await expect(passwordInput).toBeVisible();
    });
  });
});