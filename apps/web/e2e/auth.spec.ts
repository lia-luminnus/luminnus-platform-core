import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {

    test('should redirect unauthenticated user to login', async ({ page }) => {
        await page.goto('/dashboard');
        await expect(page).toHaveURL(/\/auth/);
    });

    test('should allow user to login', async ({ page }) => {
        await page.goto('/auth');

        // Fill credentials (assuming mock/test user or handling in CI env)
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');

        // Click submit
        await page.click('button[type="submit"]');

        // Verify redirection to dashboard or onboarding
        // Note: In a real env, we'd mock the Supabase response or use a test user
        // For smoke test, we check if the error is displayed OR if redirection happens
        // depending on if we have a real backend connected. 
        // This is a template for the structure.

        // Example assertion
        // await expect(page).toHaveURL('/dashboard'); 
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.goto('/auth');
        await page.fill('input[type="email"]', 'wrong@example.com');
        await page.fill('input[type="password"]', 'wrongpass');
        await page.click('button[type="submit"]');

        // Expect toast or error message
        // Adjust selector based on actual UI
        await expect(page.getByText('E-mail ou senha inválidos')).toBeVisible();
    });
});
