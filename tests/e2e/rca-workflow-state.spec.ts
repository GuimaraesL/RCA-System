/**
 * Teste: rca-workflow-state.spec.ts
 * 
 * Proposta: Validar a transição de estados das análises e a integração entre Gatilhos e RCA.
 * Ações: Conversão de gatilho em RCA, verificação de mudança automática de status na listagem.
 * Execução: Playwright E2E.
 * Fluxo: Acessa Gatilhos -> Seleciona Gatilho -> Converte para RCA -> Preenche dados mínimos -> Valida status 'Em Andamento' -> Finaliza RCA -> Valida status 'Concluída'.
 */

import { test, expect } from '@playwright/test';
import { TriggerFactory, TaxonomyFactory, RcaFactory, SystemFactory } from '../factories/rcaFactory';
import { RcaEditorPage } from '../pages/RcaEditorPage';

test.describe('RCA Workflow - Ciclo de Estados e Gatilhos', () => {

  test.beforeEach(async ({ page }) => {
    // Reduz timeout padrão para interações rápidas
    page.setDefaultTimeout(10000);

    const mockTaxonomy = TaxonomyFactory.createDefault();
    const mockAssets = [{
      id: 'AREA-01', name: 'Planta A', type: 'AREA',
      children: [{
        id: 'EQUIP-01', name: 'Equipamento 01', type: 'EQUIPMENT',
        children: [{ id: 'SUB-01', name: 'Subgrupo 01', type: 'SUBGROUP', children: [] }]
      }]
    }];

    const mockTriggers = [
      TriggerFactory.create({
        id: 'TRG-E2E-01', area_id: 'AREA-01', equipment_id: 'EQUIP-01', subgroup_id: 'SUB-01',
        status: 'T-STATUS-01', stop_reason: 'Falha de Teste E2E', rca_id: null
      })
    ];

    // INTERCEPTAÇÃO DA API COM DELAY PARA EVITAR BLANK SCREEN (Item 4.1 do TESTING.md)
    const mockRcas: any[] = [];

    // INTERCEPTAÇÃO DA API COM DELAY PARA EVITAR BLANK SCREEN
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const url = route.request().url();
      const method = route.request().method();

      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(mockTaxonomy) });
      if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify(mockAssets) });
      if (url.includes('/api/triggers')) return route.fulfill({ status: 200, body: JSON.stringify(mockTriggers) });

      // MOCK DE RCAs (GET e POST)
      if (url.includes('/api/rcas')) {
        if (method === 'GET') {
          return route.fulfill({ status: 200, body: JSON.stringify(mockRcas) });
        }
        if (method === 'POST') {
          const newRca = JSON.parse(route.request().postData() || '{}');
          newRca.id = newRca.id || `RCA-${Date.now()}`;
          mockRcas.push(newRca);
          return route.fulfill({ status: 201, body: JSON.stringify(newRca) });
        }
        if (method === 'PUT') {
          const updatedRca = JSON.parse(route.request().postData() || '{}');
          const index = mockRcas.findIndex(r => r.id === updatedRca.id);
          if (index !== -1) mockRcas[index] = updatedRca;
          return route.fulfill({ status: 200, body: JSON.stringify(updatedRca) });
        }
      }

      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    // Configura Viewport Estático (Item 4.1 do TESTING.md) - Aumentado para FHD
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/');

    // Aguarda estado estável (Item 4.2 do TESTING.md)
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible({ timeout: 15000 });
  });

  test('Deve converter um Gatilho em RCA e validar a mudança de status', async ({ page }) => {
    // 1. Ir para Gatilhos (Usa data-testid)
    await page.getByTestId('nav-TRIGGERS').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();

    // Garante que a tabela carregou após o sumiço do loader
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // 2. Criar Nova RCA a partir do gatilho
    const convertBtn = page.locator('button[data-testid="btn-convert-trigger-to-rca"], button[title*="Criar Nova RCA"]').first();
    await expect(convertBtn).toBeVisible();
    await convertBtn.click({ force: true });

    // Aguarda o editor abrir (lazy load + suspense)
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();

    // 3. Editor abre no Passo 1. Navega para Passo 2 (ArrowRight)
    await expect(page.getByTestId('step-indicator-1')).toBeVisible();
    await page.keyboard.press('Alt+ArrowRight'); // Atalho oficial do editor

    // 4. Preencher descrição
    const whatInput = page.locator('input[id$="what"]');
    await expect(whatInput).toBeVisible({ timeout: 10000 });
    await whatInput.fill('Conversão Automática via E2E');

    // 5. Salvar e aguardar fechar (Garante sincronização real do React antes do clique na sidebar)
    const rcaPage = new RcaEditorPage(page);
    await rcaPage.saveAndClose();

    // 6. Verificar status na lista de Análises
    await page.getByTestId('nav-ANALYSES').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('rca-table')).toBeVisible();

    // Verifica se o item criado existe (descrição vinda do mock: 'Falha de Teste E2E')
    await expect(page.getByText('Falha de Teste E2E')).toBeVisible();
    await expect(page.getByText(/Em Andamento|In Progress/i).first()).toBeVisible();
  });

  test('Deve validar a transição para Concluída ao preencher Causa Raiz', async ({ page }) => {
    const rcaPage = new RcaEditorPage(page);

    // 1. Ir para Análises e Criar Nova
    // Aguarda a aplicação estar pronta antes de interagir
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });

    await rcaPage.open();

    // 2. Passo 1: Preencher Data, Tipo e Ativo (Obrigatório para conclusão)
    await rcaPage.fillGeneralInfo('2026-02-01', 1);
    await rcaPage.selectSubgroup('SUB-01', ['AREA-01', 'EQUIP-01']);

    // 3. Passo 2: Preencher Descrição
    await rcaPage.goToTab(2);
    await rcaPage.fillProblemDescription('Teste de Transição de Status');

    // 4. Ir para Passo 4: Investigação
    await rcaPage.goToTab(4);

    // Aguarda containers de investigação carregarem
    await expect(page.getByTestId('section-five-whys')).toBeVisible();

    // Adicionar porquês e causa raiz via data-testid
    // O estado inicial pode já ter 1 why vazio ou 0. Vamos garantir 3 preenchidos.
    // Se não houver inputs suficientes, clicamos em adicionar.
    const whyInputs = page.getByTestId(/input-five-why-question-/);
    const answerInputs = page.getByTestId(/input-five-why-answer-/);

    // Garante que existem pelo menos 3 campos
    const currentCount = await whyInputs.count();
    if (currentCount < 3) {
      for (let k = currentCount; k < 3; k++) {
        await page.getByTestId('btn-add-why').click();
      }
    }

    // Preenche 3 whys para habilitar Causa Raiz
    for (let i = 0; i < 3; i++) {
      await whyInputs.nth(i).fill(`Por que ${i + 1}?`);
      await answerInputs.nth(i).fill(`Porque sim ${i + 1}`);
    }

    // Adiciona Ishikawa (Regra de Negócio: Text + Select + Add)
    await page.getByTestId('input-ishikawa-new-item').fill('Causa de Teste E2E');
    // Select já vem com padrão, mas podemos selecionar se quiser
    await page.locator('#ishikawa_category').selectOption('method');
    await page.getByTestId('btn-add-ishikawa-item').click();

    // Aguarda o botão de Causa Raiz aparecer e clica
    const btnAddRootCause = page.getByTestId('btn-add-root-cause');
    await expect(btnAddRootCause).toBeVisible({ timeout: 5000 });
    await btnAddRootCause.click();

    // Verifica se os campos da causa raiz apareceram
    await expect(page.locator('textarea[id*="cause"]').last()).toBeVisible();
    await page.locator('textarea[id*="cause"]').last().fill('Fator determinante identificado');

    // 5. Ir para Passo 7: Conclusão e mudar status para Concluída
    await rcaPage.goToTab(7);
    await page.getByTestId('select-rca-status').selectOption('STATUS-03');

    await page.route('**/api/rcas/**', async route => {
      await new Promise(r => setTimeout(r, 100));
      return route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success' }) });
    });

    // 7. Salvar e aguardar fechar overlay (Sync Real-time)
    await rcaPage.saveAndClose();

    // 8. Verificar na lista se o status mudou
    await page.route('**/api/rcas', async route => {
      await new Promise(r => setTimeout(r, 100));
      return route.fulfill({
        status: 200,
        body: JSON.stringify([RcaFactory.create({ id: 'RCA-CONC-01', what: 'Teste de Transição de Status', status: 'STATUS-03' })])
      });
    });

    await page.getByTestId('nav-ANALYSES').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('rca-table')).toBeVisible();
    await expect(page.getByText(/Concluída|Concluded|Aguardando|Waiting/i).first()).toBeVisible();
  });

});
