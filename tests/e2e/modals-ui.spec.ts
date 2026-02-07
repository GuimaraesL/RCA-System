/**
 * Teste: modals-ui.spec.ts
 * 
 * Proposta: Validar o ciclo de vida completo e a experiência do usuário (UI/UX) nos modais principais do sistema.
 * Ações: Interações simuladas de abertura, edição de campos, validação de persistência entre abas e fechamento seguro.
 * Execução: Playwright E2E em navegador Chromium.
 * Fluxo: Navegação para áreas específicas -> Gatilho de abertura do modal -> Preenchimento de formulários -> Validação de mensagens/estados -> Fechamento e verificação de remoção do DOM.
 */

import { test, expect } from '@playwright/test';
import { RcaFactory, TriggerFactory, TaxonomyFactory, ActionFactory, SystemFactory } from '../factories/rcaFactory';
import { TriggerModalPage } from '../pages/TriggerModalPage';

test.describe('Unified Modal Flows', () => {

  test.beforeEach(async ({ page }) => {
    // Monitora erros de página e console
    page.on('pageerror', err => console.log(`❌ BROWSER CRASH: ${err.message}`));
    page.on('console', msg => console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`));

    // Injeta flag ANTES do carregamento
    await page.addInitScript(() => {
      (window as any).isPlaywright = true;
    });

    // 🛡️ FULL API SHADOWING
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      if (url.includes('/api/rcas')) {
        const mockRcas = [
          RcaFactory.create({ id: 'RCA-E2E-001', what: 'Falha de Rolamento' }),
          RcaFactory.create({ id: 'RCA-E2E-002', what: 'Vazamento de Óleo' })
        ];
        return route.fulfill({ status: 200, body: JSON.stringify(mockRcas) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    // Diagnóstico de Estrutura
    const html = await page.content();
    console.log(`📄 ESTRUTURA DOM (Primeiros 500 chars): ${html.substring(0, 500)}`);

    const loader = page.getByTestId('app-suspense-loading');
    if (await loader.isVisible()) {
      await expect(loader).not.toBeVisible({ timeout: 15000 });
    }
  });

  /**
   * 1. Fluxo do Modal de Gatilhos
   * Cobertura: Abertura, tratamento de erros de validação, edição e cancelamento.
   */
  test('Trigger Modal - Full Workflow', async ({ page }) => {
    const triggerModal = new TriggerModalPage(page);

    // Abertura
    await triggerModal.open();

    // Validação (Tentativa de salvar vazio)
    await triggerModal.save();
    // Deve permanecer aberto devido a erros de validação (bug mapeado: conflito de 'description')
    await expect(triggerModal.modal).toBeVisible();

    // Edição de campos
    await triggerModal.fillDates('2026-02-06T10:00', '2026-02-06T11:00');
    await triggerModal.fillDetails('E2E TEST TYPE', 'E2E TEST REASON', 'E2E Responsible');

    // Cancelamento
    await triggerModal.cancel();
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

    // Espera a tabela carregar e renderizar ao menos uma linha
    const row = page.locator('tbody tr').first();
    await row.waitFor({ state: 'visible' });

    // Dispara deleção (scrollIntoViewIfNeeded resolve problemas de overflow horizontal)
    const deleteBtn = page.locator('button[title*="Excluir"], button[title*="Delete"]').first();
    await deleteBtn.scrollIntoViewIfNeeded();
    await deleteBtn.click({ force: true });

    // Verificação de conteúdo do modal
    const confirmTitle = page.getByText(/Confirmar Exclusão|Confirm Deletion/i);
    await expect(confirmTitle).toBeVisible({ timeout: 10000 });

    // Cancelamento da interação
    await page.getByRole('button', { name: /Cancelar|Cancel/i }).click();
    await expect(confirmTitle).not.toBeVisible();
  });

  /**
   * 5. Fluxo de Salvamento de Gatilho (Teste de Regressão)
   * Cobertura: Valida se a correção da nomenclatura de campos obrigatórios permite o salvamento.
   */
  test('Trigger Modal - Save Interaction', async ({ page }) => {
    // Monitora logs do console
    page.on('console', msg => console.log(`BROWSER [${msg.type()}]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    await page.getByRole('button', { name: /Gatilhos|Triggers/i }).click();

    // Abertura do novo gatilho
    await page.getByRole('button', { name: /Novo Gatilho|New Trigger/i }).click();
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal).toBeVisible();

    // 1. Datas (Identificadas pela ordem e tipo)
    await modal.locator('input[type="datetime-local"]').first().fill('2026-02-01T12:00');
    await modal.locator('input[type="datetime-local"]').nth(1).fill('2026-02-01T13:00');

    // 2. Seleção de Ativo (Primeiro item da lista de subgrupos)
    const assetItem = modal.locator('div.border.rounded li').first();
    if (await assetItem.isVisible()) {
      await assetItem.click();
    }

    // 3. Preenchimento via Ordem de Inputs (Abordagem Blindada contra I18n)
    const textInputs = modal.locator('input[type="text"]');
    await textInputs.nth(0).fill('E2E Stop Type');   // Primeiro input de texto
    await textInputs.nth(1).fill('E2E Stop Reason'); // Segundo input de texto
    await textInputs.nth(2).fill('E2E Responsible'); // Terceiro input de texto

    // 4. Selects (Tipo de Análise e Status)
    const selects = modal.locator('select');
    await selects.nth(0).selectOption({ index: 1 }); // Tipo de Análise
    await selects.nth(1).selectOption({ index: 1 }); // Status

    // 5. Tentativa de Salvamento
    const saveBtn = page.getByRole('button', { name: /Salvar Gatilho|Save Trigger/i });
    await saveBtn.click();

    // DIAGNÓSTICO: Se o modal não fechar em 2s, verificamos quais campos têm a classe de erro (border-red-500)
    try {
      await expect(modal).not.toBeVisible({ timeout: 2000 });
    } catch (e) {
      const errorFields = await modal.locator('.border-red-500').evaluateAll(elements =>
        elements.map(el => {
          const label = el.parentElement?.querySelector('label')?.innerText || 'Campo sem label';
          return label;
        })
      );
      console.log('❌ CAMPOS COM ERRO DE VALIDAÇÃO:', errorFields);
      throw new Error(`Falha no salvamento. Campos obrigatórios pendentes: ${errorFields.join(', ')}`);
    }
  });

});

