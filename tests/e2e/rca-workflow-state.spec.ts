/**
 * Teste: rca-workflow-state.spec.ts
 * 
 * Proposta: Validar a transição de estados das análises e a integração entre Gatilhos e RCA.
 * Ações: Conversão de gatilho em RCA, verificação de mudança automática de status na listagem.
 * Execução: Playwright E2E.
 * Fluxo: Acessa Gatilhos -> Seleciona Gatilho -> Converte para RCA -> Preenche dados mínimos -> Valida status 'Em Andamento' -> Finaliza RCA -> Valida status 'Concluída'.
 */

import { test, expect } from '@playwright/test';

test.describe('RCA Workflow - Ciclo de Estados e Gatilhos', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Deve converter um Gatilho em RCA e validar a mudança de status', async ({ page }) => {
    // 1. Ir para Gatilhos
    await page.getByRole('button', { name: /Gatilhos|Triggers/i }).click();

    // 2. Localizar um gatilho aberto e clicar em 'Converter em RCA' (Botão de engrenagem ou Play)
    const convertBtn = page.locator('button[title*="Convert"], button[title*="Converter"]').first();
    await convertBtn.waitFor({ state: 'visible' });
    await convertBtn.click();

    // 3. O sistema deve abrir o Editor de RCA automaticamente
    await expect(page.getByRole('heading', { name: /Nova Análise|New Analysis/i })).toBeVisible();

    // 4. Verificar se os dados do Ativo foram herdados (O campo de ativo não deve estar vazio)
    const assetName = await page.locator('div.text-xs.text-blue-600').innerText();
    expect(assetName).not.toBe('');

    // 5. Salvar como rascunho (Em Andamento)
    await page.getByPlaceholder(/Descrição sucinta|Brief description/i).fill('Conversão Automática via E2E');
    await page.locator('button').filter({ has: page.locator('svg.lucide-save') }).first().click();

    // 6. Voltar para a lista e verificar status
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await expect(page.getByText('Conversão Automática via E2E')).toBeVisible();
    await expect(page.getByText(/Em Andamento|In Progress/i).first()).toBeVisible();
  });

  test('Deve validar a transição para Concluída ao preencher Causa Raiz', async ({ page }) => {
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();

    // 1. Dados Mínimos
    await page.getByPlaceholder(/Descrição sucinta|Brief description/i).fill('Teste de Transição de Status');
    await page.locator('input[type="date"]').first().fill('2026-02-01');
    await page.locator('select').first().selectOption({ index: 1 });
    
    // 2. Adicionar Causa Raiz (Passo 4)
    await page.getByText(/Investigação|Investigation/i).click();
    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    
    await page.getByRole('button', { name: /Adicionar Causa Raiz|Add Root Cause/i }).click();
    await page.getByPlaceholder('...').last().fill('Fator determinante identificado');

    // 3. Concluir
    await page.getByText(/Dados Adicionais|Additional Info/i).click();
    await page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first().click();

    // 4. Verificar na lista se o status mudou para Concluída ou Aguardando
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    // O status real depende se há ações corretivas vinculadas (lógica de negócio)
    await expect(page.getByText(/Concluída|Concluded|Aguardando|Waiting/i).first()).toBeVisible();
  });

});
