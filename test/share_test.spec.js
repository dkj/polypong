import { test, expect } from '@playwright/test';

test.describe('Sharing Functionality', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should open share modal from menu', async ({ page }) => {
        const shareBtn = page.locator('#shareMenuBtn');
        await expect(shareBtn).toBeVisible();
        await shareBtn.click();

        const modal = page.locator('#share-modal');
        await expect(modal).toHaveClass(/visible/);
        await expect(page.locator('#shareTitle')).toHaveText('SHARE POLYPONGON');
        await expect(page.locator('#shareQRCanvas')).toBeVisible();
    });

    test('should open invite modal when going online', async ({ page }) => {
        // Mock API response
        await page.route('/api/instance', async route => {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ instanceId: 'test-inst', isFlyInstance: true }) });
        });

        const onlineBtn = page.locator('#onlineBtn');
        await expect(onlineBtn).toBeVisible();
        await onlineBtn.click();

        const modal = page.locator('#share-modal');
        await expect(modal).toHaveClass(/visible/);
        await expect(page.locator('#shareTitle')).toHaveText('INVITE TO GAME');

        const urlInput = page.locator('#shareUrlInput');
        await expect(urlInput).toHaveValue(/room=[A-Z0-9]+/);
    });

    test('should copy URL to clipboard', async ({ page, context }) => {
        await context.grantPermissions(['clipboard-read', 'clipboard-write']);

        await page.locator('#shareMenuBtn').click();

        const copyBtn = page.locator('#copyBtn');
        await copyBtn.click();

        await expect(copyBtn).toHaveText('COPIED!');

        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        const expectedUrl = await page.evaluate(() => window.location.origin);
        expect(clipboardText.replace(/\/$/, '')).toBe(expectedUrl.replace(/\/$/, ''));
    });

    test('should trigger web share API', async ({ page }) => {
        // Mock navigator.share
        await page.addInitScript(() => {
            const mockShare = async (data) => {
                window.lastSharedData = data;
            };
            Object.defineProperty(navigator, 'share', {
                value: mockShare,
                configurable: true
            });
            Object.defineProperty(navigator, 'canShare', {
                value: () => true,
                configurable: true
            });
        });

        await page.goto('/'); // Reload to apply init script
        await page.locator('#shareMenuBtn').click();
        await page.locator('#webShareBtn').click();

        // Wait for data to be populated
        await page.waitForFunction(() => window.lastSharedData !== undefined);

        const sharedData = await page.evaluate(() => window.lastSharedData);
        expect(sharedData.title).toBe('PolyPongon');
    });

    test('should close modal', async ({ page }) => {
        await page.locator('#shareMenuBtn').click();
        const modal = page.locator('#share-modal');
        await expect(modal).toHaveClass(/visible/);

        await page.locator('#closeShareBtn').click();
        await expect(modal).not.toHaveClass(/visible/);
    });
});
