
import { test, expect } from '@playwright/test';

test('Debug I18N Translation Function', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    
    // Inject a small script to test translation if accessible via window, 
    // but since it's inside React Context, we have to look at the UI.
    
    await page.getByRole('button', { name: 'EN' }).click();
    
    // Navigate to step 6
    await page.getByRole('button', { name: 'Analyses' }).click();
    await page.getByRole('button', { name: 'New Analysis' }).click();
    
    // Wait for tree and select
    await page.getByText('AREA_01').or(page.locator('.lucide-folder')).first().click();
    await page.getByText('SUBGROUP_01').click();
    
    // Go to step 6
    await page.locator('div:has-text("6")').last().click();
    await page.waitForTimeout(1000);
    
    const activities = await page.locator('main table td.font-medium').allInnerTexts();
    console.log('--- ACTIVITIES IN STEP 6 (EN MODE) ---');
    activities.forEach((a, i) => console.log(`${i}: ${a}`));
    
    // Go to step 8
    await page.locator('div:has-text("4")').last().click();
    await page.getByRole('button', { name: /Add|Add Why/i }).first().click();
    await page.locator('input[id*="answer"]').first().fill('test');
    await page.getByRole('button', { name: /Add|Add Why/i }).first().click();
    await page.locator('input[id*="answer"]').nth(1).fill('test');
    await page.getByRole('button', { name: /Add|Add Why/i }).first().click();
    await page.locator('input[id*="answer"]').nth(2).fill('test');
    
    await page.getByRole('button', { name: /Add Root Cause/i }).click();
    await page.locator('select[id*="root_cause"]').first().selectOption('M2'); 
    
    const hraBtn = page.getByRole('button', { name: /Human Reliability|HRA/i });
    await hraBtn.click();
    await page.waitForTimeout(1000);
    
    const questions = await page.locator('main table td:nth-child(2)').allInnerTexts();
    console.log('--- QUESTIONS IN HRA (EN MODE) ---');
    questions.forEach((q, i) => console.log(`${i}: ${q}`));
});
