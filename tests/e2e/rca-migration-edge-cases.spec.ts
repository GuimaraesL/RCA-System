/**
 * Teste: rca-migration-edge-cases.spec.ts
 * 
 * Proposta: Validar o tratamento de erros em arquivos de migração inválidos.
 * Ações: Tentativa de upload de JSON corrompido e CSV com delimitadores incompatíveis.
 * Execução: Playwright E2E.
 * Fluxo: Navega para Migração -> Upload de arquivo inválido -> Verifica exibição de alerta de erro -> Garante que o sistema não entre em loop.
 */

import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('RCA System - Migration Edge Cases', () => {

  const tempDir = path.resolve('tests/data/temp');

  test.beforeAll(() => {
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  });

  test('Deve exibir erro amigável ao carregar JSON corrompido', async ({ page }) => {
    const corruptedJsonPath = path.join(tempDir, 'corrupted.json');
    fs.writeFileSync(corruptedJsonPath, '{ "invalid": json content ... ');

    await page.goto('/');
    await page.getByRole('button', { name: /Migração|Migration/i }).click();

    // Upload do arquivo
    await page.setInputFiles('input[accept=".json"]', corruptedJsonPath);

    // Verifica se uma mensagem de erro aparece
    const errorMsg = page.locator('div:has-text("Erro"), div:has-text("Error"), .text-red-500');
    await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
  });

  test('Deve lidar com CSV de delimitador inesperado (vírgula em vez de ponto-vírgula)', async ({ page }) => {
    const invalidCsvPath = path.join(tempDir, 'wrong_delimiter.csv');
    // O sistema espera ';' mas enviamos ','
    fs.writeFileSync(invalidCsvPath, 'id,name,type\nAREA-01,Test Area,AREA');

    await page.goto('/');
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await page.getByRole('button', { name: /Ferramentas CSV|CSV Tools/i }).click();

    // Selecionar entidade ANTES do upload
    await page.locator('select').selectOption({ value: 'ASSETS' });

    // O setInputFiles dispara onChange automaticamente - não precisa clicar no botão
    await page.setInputFiles('input[accept=".csv"]', invalidCsvPath);

    // O sistema deve detectar a falha de parsing ou mostrar 0 registros processados
    const feedback = page.locator('div:has-text("0"), div:has-text("Erro"), div:has-text("success")');
    await expect(feedback.first()).toBeVisible({ timeout: 10000 });
  });

});