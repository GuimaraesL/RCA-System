/**
 * Teste: modals-ui.spec.ts
 * 
 * Proposta: Validar o ciclo de vida completo e a experiência do usuário (UI/UX) nos modais principais do sistema.
 * Ações: Interações simuladas de abertura, edição de campos, validação de persistência entre abas e fechamento seguro.
 * Execução: Playwright E2E em navegador Chromium.
 * Fluxo: Navegação para áreas específicas -> Gatilho de abertura do modal -> Preenchimento de formulários -> Validação de mensagens/estados -> Fechamento e verificação de remoção do DOM.
 */

import { test, expect } from '@playwright/test';

test.describe('Unified Modal Flows', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.locator('aside')).toBeVisible();
  });

  /**
   * 1. Fluxo do Modal de Gatilhos
   * Cobertura: Abertura, tratamento de erros de validação, edição e cancelamento.
   */
  test('Trigger Modal - Full Workflow', async ({ page }) => {
    await page.getByRole('button', { name: /Gatilhos|Triggers/i }).click();

    // Abertura
    await page.getByRole('button', { name: /Novo Gatilho|New Trigger/i }).click();
    const modalTitle = page.getByText(/Editar Evento Gatilho|Edit Trigger Event/i);
    await expect(modalTitle).toBeVisible();

    // Validação (Tentativa de salvar vazio)
    const saveBtn = page.getByRole('button', { name: /Salvar Gatilho|Save Trigger/i });
    await saveBtn.click({ force: true });
    // Deve permanecer aberto devido a erros de validação (bug mapeado: conflito de 'description')
    await expect(modalTitle).toBeVisible();

    // Edição de campos
    await page.locator('input[type="datetime-local"]').first().fill('2026-02-06T10:00');
    await page.locator('input[type="text"]').nth(0).fill('E2E TEST TYPE');
    await page.locator('input[type="text"]').nth(1).fill('E2E TEST REASON');

    // Cancelamento
    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(modalTitle).not.toBeVisible();
  });

  /**
   * 2. Fluxo do Editor de RCA
   * Cobertura: Navegação entre abas, edição de campos persistentes e fechamento.
   */
  test('RCA Editor - Full Workflow', async ({ page }) => {
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();

    // Abertura
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
    const editorHeader = page.getByRole('heading', { name: /Nova Análise|New Analysis/i });
    await expect(editorHeader).toBeVisible();

    // Edição de campo (5W1H)
    await page.getByText(/Problema|Problem/i).click();
    const whatInput = page.getByPlaceholder(/Descrição sucinta|Brief description/i);
    await whatInput.fill('MODAL FLOW TEST');

    // Verificar persistência entre trocas de aba
    await page.getByText(/Dados Gerais|General Data/i).click();
    await page.getByText(/Problema|Problem/i).click();
    await expect(whatInput).toHaveValue('MODAL FLOW TEST');

    // Fechamento via botão de retorno (ArrowLeft)
    await page.locator('button:has(svg.lucide-arrow-left)').first().click();
    await expect(editorHeader).not.toBeVisible();
  });

  /**
   * 3. Fluxo do Modal de Plano de Ação
   * Cobertura: Criação de ações e preenchimento de metadados.
   */
  test('Action Plan - Full Workflow', async ({ page }) => {
    await page.getByRole('button', { name: /Planos de Ação|Action Plans/i }).click();

    // Abertura
    await page.locator('main button').filter({ has: page.locator('svg.lucide-plus') }).click();
    const modalTitle = page.getByText(/Novo Plano de Ação|New Action Plan/i);
    await expect(modalTitle).toBeVisible();

    // Edição
    await page.locator('textarea').fill('E2E Corretive Action');
    await page.locator('input[type="text"]').first().fill('E2E Responsible');

    // Cancelamento
    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(modalTitle).not.toBeVisible();
  });

  /**
   * 4. Fluxo do Modal de Confirmação
   * Cobertura: Interação segura para exclusão de registros.
   */
  test('Delete Confirmation - Flow', async ({ page }) => {
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();

    // Dispara deleção via evento de despacho para evitar bloqueios de layout
    const deleteBtn = page.locator('button[title*="Excluir"], button[title*="Delete"]').nth(2);
    await deleteBtn.waitFor({ state: 'visible' });
    await deleteBtn.dispatchEvent('click');

    // Verificação de conteúdo do modal
    const confirmTitle = page.getByText(/Confirmar Exclusão|Confirm Deletion/i);
    await expect(confirmTitle).toBeVisible();

    // Cancelamento da interação
    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(confirmTitle).not.toBeVisible();
  });

  /**
   * 5. Fluxo de Salvamento de Gatilho (Teste de Regressão)
   * Cobertura: Valida se o conflito entre 'stop_reason' e 'description' impede o salvamento.
   */
  test('Trigger Modal - Save Interaction', async ({ page }) => {
    await page.getByRole('button', { name: /Gatilhos|Triggers/i }).click();

    // Abertura do novo gatilho
    await page.getByRole('button', { name: /Novo|New/i }).first().click();
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // Preenchimento de campos obrigatórios
    await modal.locator('input[type="datetime-local"]').first().fill('2026-02-01T12:00');
    await modal.locator('input[type="datetime-local"]').nth(1).fill('2026-02-01T13:00');

    // Seleção de ativo no componente customizado
    const assetItem = modal.locator('div.border.rounded li').first();
    if (await assetItem.isVisible()) {
      await assetItem.click();
    }

    // Tipo e Razão da parada
    await modal.getByText(/Tipo de Parada|Stop Type/i).locator('..').locator('input').fill('Test Stop');
    await modal.getByText(/Razão Parada|Stop Reason|Motivo da Parada/i).locator('..').locator('input').fill('Fix Verification');

    // Metadados adicionais
    const analysisSelect = modal.locator('select').nth(0);
    await analysisSelect.selectOption({ index: 1 });
    await modal.getByText(/Responsável|Responsible/i).locator('..').locator('input').fill('Automated Tester');

    // Salvamento
    await page.getByRole('button', { name: /Salvar Gatilho|Save Trigger/i }).click();

    // Verificação de fechamento (Indica sucesso operacional)
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

});

