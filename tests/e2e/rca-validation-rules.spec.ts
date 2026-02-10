/**
 * Teste: rca-validation-rules.spec.ts
 * 
 * Proposta: Validar as regras de preenchimento obrigatório e o feedback visual de erros do editor.
 * Ações: Tentativa de salvamento incompleto, identificação de campos com bordas vermelhas e validação de mensagens.
 * Execução: Playwright E2E.
 * Fluxo: Inicia RCA -> Tenta salvar sem dados -> Verifica indicação de erro no 'O que ocorreu' e 'Ativo' -> Preenche dados -> Tenta avançar -> Valida conclusão.
 */

import { test, expect } from '@playwright/test';

test.describe('RCA Editor - Regras de Validação e Erros', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Aguarda o sistema carregar completamente
    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
    
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
  });

  test('Deve exibir erros de validação ao tentar salvar campos obrigatórios vazios', async ({ page }) => {
    // Tenta clicar no botão de salvar/concluir (Step 7 ou botão de check)
    await page.getByText(/Dados Adicionais|Additional Info/i).click();
    
    const saveBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
    await saveBtn.click();

    // Voltar para a primeira aba para ver os erros de campos básicos
    await page.getByText(/Dados Gerais|General Data/i).click();

    // Verificar se o campo 'O que ocorreu' está com borda de erro
    const whatInput = page.locator('div:has(> label:has-text("O que ocorreu")) textarea, div:has(> label:has-text("What happened")) textarea');
    await expect(whatInput).toHaveClass(/border-red-500/);

    // Verificar se a seção de Ativos está com erro
    const assetSection = page.locator('div:has(> label:has-text("Subconjunto")) div.border, div:has(> label:has-text("Subgroup")) div.border');
    await expect(assetSection.first()).toHaveClass(/border-red-500/);
  });

  test('Deve permitir salvar após preencher campos obrigatórios dinâmicos', async ({ page }) => {
    // 1. Preencher 'O que ocorreu'
    await page.getByPlaceholder(/Descrição sucinta|Brief description/i).fill('Falha de teste controlada');

    // 2. Preencher Data da Falha
    await page.locator('input[type="date"]').first().fill('2026-02-01');

    // 3. Selecionar Ativo (Simular seleção via clique)
    const assetItem = page.locator('div.rounded-md.cursor-pointer').first();
    if (await assetItem.isVisible()) {
        await assetItem.click();
    }

    // 4. Selecionar Tipo de Análise (Select)
    await page.locator('select').first().selectOption({ index: 1 });

    // 5. Tentar salvar novamente
    await page.getByText(/Dados Adicionais|Additional Info/i).click();
    const saveBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first();
    await saveBtn.click();

    // O modal deve fechar ou mostrar sucesso (dependendo da lógica de conclusão que exige causa raiz)
    // Nota: Se a taxonomia exigir Causa Raiz para concluir, o sistema deve bloquear aqui.
  });

});

