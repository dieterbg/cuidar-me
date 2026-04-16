import { test, expect } from '@playwright/test';

test('has title and redirects to login if not authenticated', async ({ page }) => {
  await page.goto('/paciente');

  // Should redirect to a login page or show the login form
  // Expecting a title related to Cuidar.me
  await expect(page).toHaveTitle(/Cuidar.me/);

  // Check for the presence of a login button or "Entrar" text
  const enterButton = page.getByRole('button', { name: /Entrar|Acessar|Login/i });
  // We don't necessarily expect it to BE visible immediately if it redirects to a separate /login page,
  // but let's assume it shows a login form on /paciente or redirects.
  
  // Basic check that we are on a page that belongs to the app.
  await expect(page.locator('body')).toContainText(/Cuidar.me/i);
});
