
import { test, expect } from '@playwright/test';

test.describe('RCA Investigation Visuals (Step 4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Open RCA Editor (New Analysis)
        await page.click('text=Nova Análise');
        // Navigate to Step 4
        // Click Next 3 times to get to Step 4
        await page.click('button:has-text("Próximo")'); // Step 1 -> 2
        await page.click('button:has-text("Próximo")'); // Step 2 -> 3
        await page.click('button:has-text("Próximo")'); // Step 3 -> 4
    });

    test('Ishikawa (Fishbone) diagram renders as cards', async ({ page }) => {
        // Verify Step 4 title
        await expect(page.locator('h2')).toContainText('Investigação');

        // Check for Categories (Method, Machine, etc.)
        const categories = ['Método', 'Máquina', 'Mão de Obra', 'Material', 'Medida', 'Meio Ambiente'];

        for (const cat of categories) {
            await expect(page.locator(`text=${cat}`)).toBeVisible();
        }

        // Add an item to "Método"
        // Select category (default is Method)
        // Type in input
        await page.fill('input[placeholder="..."]', 'Lack of procedure');
        await page.click('button:has-text("Adicionar")');

        // Verify card appears
        await expect(page.locator('text=Lack of procedure')).toBeVisible();

        // Verify delete button on hover (simulated by focusing or force click)
        const deleteBtn = page.locator('button[title="Excluir"]').first();
        await expect(deleteBtn).toBeAttached();
    });

    test('5 Whys interaction', async ({ page }) => {
        // Check initial state
        await expect(page.locator('text=5 Porquês')).toBeVisible();

        // Add a Why
        await page.click('button:has-text("Adicionar Porquê")');

        // Check input fields appear
        await expect(page.locator('input[placeholder="..."]').first()).toBeVisible();

        // Fill inputs
        const inputs = page.locator('input[placeholder="..."]');
        await inputs.nth(0).fill('Why did it stop?');
        await inputs.nth(1).fill('Motor failure');

        // Verify content
        await expect(page.locator('input[value="Why did it stop?"]')).toBeVisible();
    });
});
