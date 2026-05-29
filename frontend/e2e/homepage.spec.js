import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads with correct title and branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GitStack/);
    await expect(page.locator('text=GitStack').first()).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Verify key nav links are present
    await expect(page.locator('[data-testid="nav-tools"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-collections"]')).toBeVisible();
    await expect(page.locator('text=Build Stack').first()).toBeVisible();
  });

  test('skip-to-content link is present', async ({ page }) => {
    await page.goto('/');
    const skipLink = page.locator('text=Skip to main content');
    await expect(skipLink).toBeVisible();
  });

  test('navigates to tools page', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="nav-tools"]').click();
    await expect(page).toHaveURL(/\/tools/);
    await expect(page.locator('text=Tools').first()).toBeVisible();
  });
});
