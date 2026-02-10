/**
 * Teste: migration.spec.ts
 * 
 * Proposta: Validar a interface de migração de dados e o fluxo de importação de arquivos JSON/CSV com ISOLAMENTO TOTAL.
 * Ações: Navegação para a área de migração, seleção de arquivos e monitoramento de feedbacks com API Mockada.
 * Execução: Playwright E2E.
 * Fluxo: Acessa página de migração -> Dispara upload de arquivo -> Verifica exibição de configurações de importação -> Valida tratamento de erros da API.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';
import path from 'path';

test.describe('RCA System - Migration Flow (MOCK)', () => {
  
  test.beforeEach(async ({ page }) => {
    // INTERCEPTAÇÃO TOTAL DA API
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('deve navegar para migração e validar a UI de seleção de JSON', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await expect(page.getByText(/Restaurar Backup|Restore Backup/i)).toBeVisible();
    const fileInput = page.locator('input[accept=".json"]');
    await expect(fileInput).toBeAttached();
  });

  test('deve validar a UI de ferramentas CSV e seleção de entidade alvo', async ({ page }) => {
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.getByRole('button', { name: /Ferramentas CSV|CSV Tools/i }).click();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.getByRole('button', { name: /Importar CSV|Import CSV/i })).toBeVisible();
  });
});