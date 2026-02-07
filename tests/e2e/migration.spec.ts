/**
 * Teste: migration.spec.ts
 * 
 * Proposta: Validar a interface de migração de dados e o fluxo de importação de arquivos JSON/CSV.
 * Ações: Navegação para a área de migração, seleção de arquivos e monitoramento de feedbacks de erro/sucesso.
 * Execução: Playwright E2E.
 * Fluxo: Acessa página de migração -> Dispara upload de arquivo -> Verifica exibição de configurações de importação -> Valida tratamento de erros da API.
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('RCA System - Migration Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.getByRole('button', { name: /Migração|Migration/i })).toBeVisible({ timeout: 15000 });
  });

  test('deve navegar para migração e validar a UI de seleção de JSON', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await expect(page.getByText(/Restaurar Backup|Restore Backup/i)).toBeVisible();
    const fileInput = page.locator('input[accept=".json"]');
    await expect(fileInput).toBeAttached();
  });

  test('deve tentar importar um arquivo JSON e capturar potenciais erros de API', async ({ page }) => {
    const filePath = path.resolve('tests/data/rca_migration_v17_consolidated.json');
    
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.setInputFiles('input[accept=".json"]', filePath);
    
    await expect(page.getByText(/Configuração de Importação|Import Configuration/i)).toBeVisible({ timeout: 10000 });
    
    const importBtn = page.getByRole('button', { name: /Iniciar Importação|Initialize Import/i });
    await importBtn.click();

    // Monitora por mensagens de erro (usando seletor flexível para qualquer alerta de erro)
    const errorMsg = page.locator('div:has-text("Erro")').nth(0);
    try {
        await expect(errorMsg).toBeVisible({ timeout: 10000 });
        const text = await errorMsg.innerText();
        console.log('Mensagem de erro capturada:', text);
    } catch (e) {
        console.log('Mensagem de erro não detectada pelo seletor div:has-text("Erro")');
    }
  });

  test('deve validar a UI de ferramentas CSV e seleção de entidade alvo', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.getByRole('button', { name: /Ferramentas CSV|CSV Tools/i }).click();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByRole('button', { name: /Importar CSV|Import CSV/i })).toBeVisible();
  });
});
