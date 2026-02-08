import { test, expect } from '@playwright/test';

test('Dashboard should not have Recharts width/height errors', async ({ page }) => {
    // Inject flag to disable animations
    await page.addInitScript(() => {
        (window as any).isPlaywright = true;
    });

    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            const text = msg.text();
            if (text.includes('width') && text.includes('height') && text.includes('chart')) {
                consoleErrors.push(text);
                console.log(`Caught relevant console message: ${text}`);
            }
        }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:3000');

    // Wait for dashboard to load (look for a known element)
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait a bit for charts to render and potential resize events
    await page.waitForTimeout(3000);

    // Assert no errors were found
    expect(consoleErrors, `Found Recharts errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
});
