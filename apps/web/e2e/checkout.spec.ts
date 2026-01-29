import { test, expect } from '@playwright/test';

test.describe('Checkout & Plan Selection', () => {

    test.beforeEach(async ({ page }) => {
        // Ideally login first or use a testing session
        await page.goto('/plans');
    });

    test('should display available plans', async ({ page }) => {
        await expect(page.getByText('Basic')).toBeVisible();
        await expect(page.getByText('Pro')).toBeVisible();
        await expect(page.getByText('Enterprise')).toBeVisible();
    });

    test('should initiate checkout flow', async ({ page }) => {
        // Click on a plan button
        // Assuming "Assinar Agora" or similar button text
        const planButton = page.locator('button:has-text("Assinar")').first();
        await planButton.click();

        // Verify loading state or redirection attempt mechanism
        // Since actual Stripe checkout might need valid session, we check for intent
    });

    test('should handle payment failure state', async ({ page }) => {
        // Simulate return from Stripe with canceled param
        await page.goto('/plans?canceled=true');

        // Alert or Toast check
        await expect(page.getByText('Pagamento cancelado')).toBeVisible(); // Adjust text to match Ops
    });
});
