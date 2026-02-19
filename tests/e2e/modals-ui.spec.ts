/**
 * Teste: modals-ui.spec.ts
 * 
 * Proposta: Validar o ciclo de vida completo e a experiência do usuário (UI/UX) nos modais principais do sistema.
 * Ações: Interações simuladas de abertura, edição de campos, validação de persistência entre abas e fechamento seguro com API Mockada.
 * Execução: Playwright E2E em navegador Chromium.
 * Fluxo: Configura Mocks globais -> Navegação para áreas -> Abertura de modais -> Preenchimento -> Validação de fechamento e persistência.
 */

import { test, expect } from '@playwright/test';
import { RcaFactory, TriggerFactory, TaxonomyFactory, ActionFactory, SystemFactory } from '../factories/rcaFactory';
import { TriggerModalPage } from '../pages/TriggerModalPage';

test.describe('Fluxos de Modais Unificados', () => {

  test.beforeEach(async ({ page }) => {
    // Monitora erros de página e console
    page.on('pageerror', err => console.log(`ERRO DE PÁGINA: ${err.message}`));
    page.on('console', msg => console.log(`[CONSOLE ${msg.type()}]: ${msg.text()}`));

    // Injeta flag de ambiente de teste
    await page.addInitScript(() => {
      (window as any).isPlaywright = true;
    });

    // INTERCEPTAÇÃO TOTAL DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) {
        const defaultTaxonomy = TaxonomyFactory.createDefault();
        // Ajusta campos obrigatórios para o teste de salvamento simplificado
        if (defaultTaxonomy.mandatoryFields && defaultTaxonomy.mandatoryFields.trigger) {
          defaultTaxonomy.mandatoryFields.trigger.save = ['start_date', 'responsible', 'status'];
        }
        return route.fulfill({ status: 200, body: JSON.stringify(defaultTaxonomy) });
      }
      if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'AREA-01', name: 'Área Teste', type: 'AREA', children: [] }]) });
      if (url.includes('/api/rcas')) {
        return route.fulfill({ status: 200, body: JSON.stringify([RcaFactory.create({ id: 'RCA-E2E-01', what: 'Registro de Teste E2E' })]) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible({ timeout: 15000 });
  });

  /**
   * 1. Fluxo do Modal de Gatilhos
   */
  test('Modal de Gatilhos - Ciclo Completo', async ({ page }) => {
    const triggerModal = new TriggerModalPage(page);

    await triggerModal.open();
    await triggerModal.save();

    // Deve permanecer aberto devido a erros de validação
    await expect(triggerModal.modal).toBeVisible();

    await triggerModal.fillDates('2026-02-06T10:00', '2026-02-06T11:00');
    await triggerModal.fillDetails('TIPO TESTE E2E', 'RAZÃO TESTE E2E', 'Responsável E2E');

    await triggerModal.cancel();
  });

  /**
   * 2. Fluxo do Editor de RCA
   */
  test('Editor de RCA - Ciclo Completo', async ({ page }) => {
    await page.getByTestId('nav-ANALYSES').click();
    await page.getByTestId('btn-new-analysis').click();

    const editorHeader = page.getByRole('heading', { name: /Nova Análise|New Analysis/i });
    await expect(editorHeader).toBeVisible();

    // Edição de campo (5W1H)
    await page.getByText(/Problema|Problem/i).click();
    const whatInput = page.getByPlaceholder(/Descrição sucinta|Brief description/i);
    await whatInput.fill('TESTE DE FLUXO DE MODAL');

    // Navegação entre abas via rodapé
    await page.getByRole('button', { name: /Próxim[ao]|Next/i }).click();
    await page.getByRole('button', { name: /Anterior|Previous/i }).click();

    await expect(whatInput).toHaveValue('TESTE DE FLUXO DE MODAL');

    // Fechamento
    await page.getByRole('button', { name: /Cancelar|Cancel/i }).first().click();
    await expect(editorHeader).not.toBeVisible();
  });

  /**
   * 3. Fluxo do Modal de Plano de Ação
   */
  test('Plano de Ação - Ciclo Completo', async ({ page }) => {
    await page.getByTestId('nav-ACTIONS').click();

    await page.locator('main button').filter({ has: page.locator('svg.lucide-plus') }).click();
    const modalTitle = page.getByText(/Novo Plano de Ação|New Action Plan/i);
    await expect(modalTitle).toBeVisible();

    await page.locator('#action_description').fill('Ação Corretiva E2E');
    await page.locator('#action_responsible').fill('Responsável E2E');
    await page.locator('#action_date').fill('2024-12-31');

    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(modalTitle).not.toBeVisible();
  });

  /**
   * 4. Fluxo do Modal de Confirmação
   */
  test('Confirmação de Exclusão - Fluxo', async ({ page }) => {
    await page.getByTestId('nav-ANALYSES').click();

    const tableBody = page.locator('tbody');
    await tableBody.waitFor({ state: 'visible', timeout: 10000 });

    const row = tableBody.locator('tr').first();
    await row.waitFor({ state: 'visible', timeout: 10000 });

    const deleteBtn = page.getByTestId('delete-rca-btn').first();
    await deleteBtn.scrollIntoViewIfNeeded();

    await deleteBtn.evaluate((btn: HTMLElement) => {
      btn.click();
    });

    const confirmTitle = page.getByText(/Confirmar Exclusão|Confirm Deletion/i);
    await expect(confirmTitle).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(confirmTitle).not.toBeVisible();
  });

  /**
   * 5. Fluxo de Salvamento de Gatilho (Regressão)
   */
  test('Modal de Gatilhos - Interação de Salvamento', async ({ page }) => {
    await page.getByTestId('nav-TRIGGERS').click();
    await page.getByTestId('btn-new-trigger').click();

    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    await page.getByTestId('input-trigger-start-date').fill('2026-02-01T12:00');
    await page.getByTestId('input-trigger-responsible').fill('Testador Automatizado');
    await page.getByTestId('select-trigger-status').selectOption({ index: 1 });

    const saveBtn = page.locator('div.border-t button', { hasText: /Salvar Gatilho|Save Trigger/i });
    await saveBtn.click();

    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

});