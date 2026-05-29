import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('stack-generator page loads', async ({ page }) => {
    await page.goto('/stack-generator');
    await expect(page.locator('text=Build Stack').first()).toBeVisible();
  });

  test('repo-translator page loads', async ({ page }) => {
    await page.goto('/repo-translator');
    await expect(page.locator('text=Translate Repo').first()).toBeVisible();
  });

  test('marketplace page loads', async ({ page }) => {
    await page.goto('/marketplace');
    await expect(page.locator('text=Marketplace').first()).toBeVisible();
  });

  test('collections page loads', async ({ page }) => {
    await page.goto('/collections');
    await expect(page.locator('text=Collections').first()).toBeVisible();
  });

  test('404 page loads for unknown routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.locator('text=404').first()).toBeVisible();
  });
});
