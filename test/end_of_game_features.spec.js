import { test, expect } from '@playwright/test';

test.describe('End of Game Features', () => {
    test.beforeEach(async ({ page }) => {
        // Log browser errors/logs for easier debugging if needed
        page.on('console', msg => {
            if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
        });
        await page.goto('/');
    });

    test.describe('Local Celebration', () => {
        test('should show celebration phase and delay menu', async ({ page }) => {
            await page.evaluate(() => {
                window.game.mode = 'local';
                // Set some initial position to track movement
                window.game.ball.x = 0;
                window.game.ball.y = 0;
                window.game.ball.vx = 200;
                window.game.ball.vy = 200;
                window.game.triggerScore(10, 30);
            });

            // 1. Menu should be hidden during celebration
            const menuVisible = await page.locator('#game-menu').isVisible();
            expect(menuVisible).toBe(false);

            // 2. Ball should move
            const pos1 = await page.evaluate(() => ({ x: window.game.ball.x, y: window.game.ball.y }));
            await page.waitForTimeout(100);
            const pos2 = await page.evaluate(() => ({ x: window.game.ball.x, y: window.game.ball.y }));
            expect(pos2.x).not.toBe(pos1.x);

            // 3. After 2.5s, menu should show and it should be "PLAY AGAIN"
            await page.waitForTimeout(3000);
            const restartBtn = page.locator('#restartBtn');
            await expect(restartBtn).toBeVisible();
            await expect(restartBtn).toHaveText('PLAY AGAIN');

            // 4. Share score button should appear
            await expect(page.locator('#shareScoreBtn')).toBeVisible();
        });

        test('should have correct sharing message for local mode', async ({ page }) => {
            await page.evaluate(() => {
                window.game.mode = 'local';
                window.game.triggerScore(5, 15);
            });

            await page.waitForTimeout(3000);
            await page.locator('#shareScoreBtn').click();

            const twitterLink = await page.locator('#shareTwitter').getAttribute('href');
            expect(twitterLink).toContain(encodeURIComponent('I survived 15 seconds with a score of 5 !'));
            // Ensure URL is there too, but deduplicated (ShareManager appends it)
            const decodedLink = decodeURIComponent(twitterLink);
            expect(decodedLink).toContain('http://localhost:');
        });
    });

    test.describe('Multiplayer Celebration', () => {
        test('should sync celebration and sharing from server', async ({ page }) => {
            // Handle prompt
            page.on('dialog', dialog => dialog.accept('ROOM123'));

            // Mock online toggle
            await page.route('/api/instance', async route => {
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ instanceId: 'test-inst', isFlyInstance: true }) });
            });
            await page.locator('#onlineBtn').click();

            // Simulate receiving goal event and states
            await page.evaluate(() => {
                // Ensure share modal from going online is closed
                document.getElementById('share-modal').classList.remove('visible');

                // Mock starting the celebration
                window.game.startCelebration();
                window.game.gameState = 'SCORING';
                window.game.lastScore = 8;
                window.game.finalTime = 45;
                window.game.hasPlayed = true;

                // Mock state buffer for interpolation movement
                const now = Date.now();
                window.game.stateBuffer = [
                    {
                        timestamp: now - 200,
                        ball: { x: 0, y: 0 },
                        paddles: [],
                        rotation: 0,
                        difficulty: 1,
                        gameState: 'SCORING'
                    },
                    {
                        timestamp: now + 500,
                        ball: { x: 100, y: 100 },
                        paddles: [],
                        rotation: 0.1,
                        difficulty: 1,
                        gameState: 'SCORING'
                    }
                ];

                // Disable real socket updates to keep our mock state stable
                window.game.socket.off('gameState');
                window.game.socket.off('gameEvent');

                window.game.hideMenu();
            });

            // 1. Menu hidden
            await expect(page.locator('#game-menu')).toBeHidden();

            // 2. Ball moves
            const pos1 = await page.evaluate(() => ({ x: window.game.ball.x, y: window.game.ball.y }));
            await page.waitForTimeout(100);
            const pos2 = await page.evaluate(() => ({ x: window.game.ball.x, y: window.game.ball.y }));
            expect(pos2.x).not.toBe(pos1.x);

            // 3. Share button appears after celebration
            try {
                await page.waitForFunction(() => {
                    const btn = document.getElementById('shareScoreBtn');
                    return btn && window.getComputedStyle(btn).display === 'block';
                }, { timeout: 5000 });
            } catch (e) {
                const debugState = await page.evaluate(() => ({
                    gameState: window.game.gameState,
                    celebrationTimer: window.game.celebrationTimer,
                    hasPlayed: window.game.hasPlayed,
                    menuShown: window.game.wasCelebrationMenuShown,
                    shareBtnDisplay: document.getElementById('shareScoreBtn').style.display,
                    mode: window.game.mode
                }));
                console.log('Final Debug State:', debugState);
                throw e;
            }

            // 4. Correct "We" message with join suggestion
            await page.locator('#shareScoreBtn').click();
            const twitterLink = await page.locator('#shareTwitter').getAttribute('href');
            expect(twitterLink).toContain(encodeURIComponent('We survived 45 seconds with a score of 8 ! Join us at'));
        });
    });
});
