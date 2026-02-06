import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RCA System - Migration Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.getByRole('button', { name: /Migração|Migration/i })).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to migration and validate JSON selection UI', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await expect(page.getByText(/Restaurar Backup|Restore Backup/i)).toBeVisible();
    const fileInput = page.locator('input[accept=".json"]');
    await expect(fileInput).toBeAttached();
  });

  test('should attempt to import a JSON file and capture potential API errors', async ({ page }) => {
    const filePath = path.resolve('tests/data/rca_migration_v17_consolidated.json');
    
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.setInputFiles('input[accept=".json"]', filePath);
    
    await expect(page.getByText(/Configuração de Importação|Import Configuration/i)).toBeVisible({ timeout: 10000 });
    
    const importBtn = page.getByRole('button', { name: /Iniciar Importação|Initialize Import/i });
    await importBtn.click();

    // Monitora por mensagens de erro (usando seletor flexível para qualquer alerta de erro)
    const errorMsg = page.locator('div:has-text("Erro")').nth(0);
    // Não vamos falhar o teste se o erro não aparecer exatamente em 10s para podermos ver o console
    try {
        await expect(errorMsg).toBeVisible({ timeout: 10000 });
        const text = await errorMsg.innerText();
        console.log('Capture error message:', text);
    } catch (e) {
        console.log('Mensagem de erro não detectada pelo seletor div:has-text("Erro")');
    }
  });

  test('should validate CSV tools UI and target entity selection', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.getByRole('button', { name: /Ferramentas CSV|CSV Tools/i }).click();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByRole('button', { name: /Importar CSV|Import CSV/i })).toBeVisible();
  });
});
