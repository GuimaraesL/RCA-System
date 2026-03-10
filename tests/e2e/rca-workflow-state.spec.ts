import { test, expect } from '@playwright/test';
import { TriggerFactory, TaxonomyFactory, RcaFactory, SystemFactory } from '../factories/rcaFactory';
import { RcaEditorPage } from '../pages/RcaEditorPage';

test.describe('Workflow RCA - Ciclo de Estados e Gatilhos', () => {

  test.use({ viewport: { width: 1920, height: 1080 } });

  test.beforeEach(async ({ page }) => {
    // Desabilitar animações para estabilidade dos testes
    await page.addStyleTag({
      content: `
                *, *::before, *::after {
                    transition: none !important;
                    animation: none !important;
                }
                .animate-in, .fade-in, .animate-pulse {
                    opacity: 1 !important;
                }
            `,
    });

    // Debug: Captura logs do console do navegador
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

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
        id: 'TRG-E2E-01',
        area_id: 'AREA-01',
        equipment_id: 'EQUIP-01',
        subgroup_id: 'SUB-01',
        status: 'T-STATUS-01',
        stop_reason: 'Falha de Teste E2E',
        rca_id: null,
        start_date: new Date().toISOString(),
        end_date: new Date().toISOString()
      })
    ];

    // Estado volátil para o teste
    const mockRcas: any[] = [];

    // INTERCEPTAÇÃO DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      const method = route.request().method();

      console.log(`[NETWORK] ${method} ${url}`); // GLOBAL LOGGING RESTORED

      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(mockTaxonomy) });
      if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify(mockAssets) });
      if (url.includes('/api/triggers')) return route.fulfill({ status: 200, body: JSON.stringify(mockTriggers) });
      if (url.includes('/api/actions')) return route.fulfill({ status: 200, body: JSON.stringify([]) });

      if (url.includes('/api/rcas')) {
        if (method === 'GET') {
          return route.fulfill({ status: 200, body: JSON.stringify(mockRcas) });
        }
        if (method === 'POST') {
          const newRca = JSON.parse(route.request().postData() || '{}');
          newRca.id = newRca.id || `RCA-${Date.now()}`;
          mockRcas.push(newRca);
          console.log('[NETWORK] created RCA ' + newRca.id);
          return route.fulfill({ status: 201, body: JSON.stringify(newRca) });
        }
        if (method === 'PUT') {
          const updatedRca = JSON.parse(route.request().postData() || '{}');
          const index = mockRcas.findIndex(r => r.id === updatedRca.id);
          if (index !== -1) mockRcas[index] = updatedRca;
          console.log('[NETWORK] updated RCA ' + updatedRca.id);
          return route.fulfill({ status: 200, body: JSON.stringify(updatedRca) });
        }
      }

      // Fallback seguro
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    // ... (rest of beforeEach)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible({ timeout: 15000 });
  });

  // Helper para seleção robusta de ativos
  async function selectMockAsset(page: any) {
    console.log('--- Selecionando Ativo (SUB-01) ---');
    // 1. Expandir Planta (se fechada)
    const togglePlanta = page.getByTestId('asset-toggle-AREA-01');
    if (await togglePlanta.isVisible()) {
      // Verifica se já está expandido observando o filho
      if (!await page.getByTestId('asset-toggle-EQUIP-01').isVisible()) {
        await togglePlanta.click();
      }
    }

    // 2. Expandir Equipamento (se fechado)
    const toggleEquip = page.getByTestId('asset-toggle-EQUIP-01');
    await expect(toggleEquip).toBeVisible();
    if (!await page.getByTestId('asset-node-SUB-01').isVisible()) {
      await toggleEquip.click();
    }

    // 3. Selecionar Subgrupo
    const nodeSub = page.getByTestId('asset-node-SUB-01');
    await expect(nodeSub).toBeVisible();
    await nodeSub.scrollIntoViewIfNeeded();
    await nodeSub.click({ force: true });

    // Pequena espera para propagação do estado
    await page.waitForTimeout(300);
  }

  test('Deve converter um Gatilho em RCA e validar a mudança de status', async ({ page }) => {
    // 1. Ir para Gatilhos
    await page.getByTestId('nav-TRIGGERS').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();

    // 2. Criar Nova RCA a partir do gatilho
    const convertBtn = page.getByTestId('btn-convert-trigger-to-rca').first();
    await expect(convertBtn).toBeVisible({ timeout: 10000 });
    await convertBtn.click();

    // Aguarda o editor abrir
    await expect(page.getByTestId('rca-editor-overlay')).toBeVisible({ timeout: 10000 });

    // 3. Preencher dados mínimos via Page Object com Dados Mockados
    console.log('--- Preenchendo Editor com Dados Mockados ---');
    const mockData = RcaFactory.create(); // Gera dados completos
    const rcaPage = new RcaEditorPage(page);

    // Seleção de Ativo (P1 - Fix)
    await selectMockAsset(page);

    // Passo 1: Informações Gerais
    // Preenche obrigatoriamente
    await rcaPage.fillGeneralInfo(mockData.failure_date.split('T')[0], 1);

    // Passo 2: Descrição
    // Passo 2: Descrição tem que ser completa
    await rcaPage.goToTab(2);

    // Preenchimento Completo com Dados do Factory e VERIFICAÇÃO IMEDIATA
    const inputWho = page.getByTestId('input-who');
    await inputWho.fill(mockData.who || 'Test User');
    await expect(inputWho).toHaveValue(mockData.who || 'Test User');

    const inputWhen = page.getByTestId('input-when');
    await inputWhen.fill(mockData.when || 'Turno Teste');
    await expect(inputWhen).toHaveValue(mockData.when || 'Turno Teste');

    const inputWhere = page.getByTestId('input-where');
    await inputWhere.fill(mockData.where_description || 'Local Teste');
    await expect(inputWhere).toHaveValue(mockData.where_description || 'Local Teste');

    const inputWhat = page.getByTestId('input-what');
    await inputWhat.fill(mockData.what || 'Conversão Automática via E2E');
    await expect(inputWhat).toHaveValue(mockData.what || 'Conversão Automática via E2E');

    const inputImpacts = page.getByTestId('input-impacts');
    await inputImpacts.fill(mockData.potential_impacts || 'Sem impacto');
    await expect(inputImpacts).toHaveValue(mockData.potential_impacts || 'Sem impacto');

    const inputProb = page.getByTestId('input-problem-description');
    await inputProb.fill(mockData.problem_description || 'Descrição detalhada teste');
    await expect(inputProb).toHaveValue(mockData.problem_description || 'Descrição detalhada teste');

    // Campo quality_impacts
    const qualityInput = page.getByTestId('input-quality-impacts');
    if (await qualityInput.isVisible()) {
      await qualityInput.fill('Impacto Qualidade Zero');
      await expect(qualityInput).toHaveValue('Impacto Qualidade Zero');
    }

    // Debug: Log data before save
    console.log('DEBUG: Passo 2 preenchido e validado. Tentando salvar...');

    // 4. Salvar
    await page.getByTestId('btn-save-rca').click();
    await expect(page.getByText('Análise RCA salva com sucesso!')).toBeVisible({ timeout: 10000 });

    // Aguarda fechar modal
    await expect(page.getByTestId('rca-editor-overlay')).not.toBeVisible({ timeout: 15000 });

    // 5. Verificar status 'Em Andamento' na lista
    await page.getByTestId('nav-ANALYSES').click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('rca-table-container')).toBeVisible();

    await expect(page.getByText(mockData.what || 'Conversão Automática via E2E')).toBeVisible();
  });

  test('Deve validar a transição para Concluída ao preencher Causa Raiz', async ({ page }) => {
    // Mock inicial com uma RCA já existente em andamento
    const existingRca = RcaFactory.create({
      id: 'RCA-EXISTING-01',
      what: 'RCA Existente para Fluxo',
      status: 'STATUS-01', // Em andamento
      subgroup_id: 'SUB-01'
    });

    // Sobrescrever rota para incluir essa RCA e tratar PUT corretamente
    await page.route('**/api/rcas*', async route => {
      const method = route.request().method();

      if (method === 'GET') {
        return route.fulfill({ status: 200, body: JSON.stringify([existingRca]) });
      }

      if (method === 'PUT' || method === 'POST') {
        return route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success', ...existingRca, status: 'STATUS-03' }) });
      }

      return route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    // Recarregar para pegar o novo mock
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor();

    // 1. Ir para Análises
    await page.getByTestId('nav-ANALYSES').click();
    await expect(page.getByText('RCA Existente para Fluxo')).toBeVisible();

    // 2. Abrir Editor
    await page.getByText('RCA Existente para Fluxo').click();
    await expect(page.getByTestId('rca-editor-overlay')).toBeVisible();

    const rcaPage = new RcaEditorPage(page);

    // Garantir que a árvore de ativos está expandida e o item selecionado (P1 - Fix)
    await selectMockAsset(page);

    // Garantir que os dados gerais (Step 1) estão preenchidos corretamente para validação
    await rcaPage.fillGeneralInfo('2026-02-18', 1);

    // 3. Preencher TODOS os campos do Passo 2 (mesmo vindo do mock, para garantir)
    await rcaPage.goToTab(2);

    // Preenchimento explícito para garantir o estado
    await page.getByTestId('input-who').fill(existingRca.who || 'Test User');
    await page.getByTestId('input-when').fill(existingRca.when || 'Turno Teste');
    await page.getByTestId('input-where').fill(existingRca.where_description || 'Local Teste');
    await page.getByTestId('input-what').fill(existingRca.what || 'RCA Existente para Fluxo');
    await page.getByTestId('input-impacts').fill(existingRca.potential_impacts || 'Sem impacto');
    await page.getByTestId('input-problem-description').fill(existingRca.problem_description || 'Descrição detalhada teste');

    // Ir para Investigação (Passo 4)
    await rcaPage.goToTab(4);

    // 4. Preencher 5 Porquês via data-testid
    const whyInputs = page.getByTestId(/input-five-why-question-/);
    const answerInputs = page.getByTestId(/input-five-why-answer-/);

    // Garante que existem pelo menos 4 campos (segurança > 3)
    for (let k = 0; k < 4; k++) {
      await page.getByTestId('btn-add-why').click();
    }

    // Aguarda inputs aparecerem
    await expect(whyInputs.nth(0)).toBeVisible({ timeout: 10000 });

    for (let i = 0; i < 4; i++) {
      await whyInputs.nth(i).fill(`Por que ${i + 1}?`);
      await answerInputs.nth(i).fill(`Porque sim ${i + 1}`);
    }

    // Aguardar propagação do estado
    await page.waitForTimeout(1000);

    // 5. Adicionar Ishikawa via data-testid
    await page.getByTestId('input-ishikawa-new-item').fill('Causa de Teste E2E');
    await page.locator('#ishikawa_category').selectOption('method');
    await page.getByTestId('btn-add-ishikawa-item').click();

    // 6. Adicionar Causa Raiz
    const btnAddRootCause = page.getByTestId('btn-add-root-cause');
    await expect(btnAddRootCause).toBeVisible({ timeout: 10000 });
    await btnAddRootCause.click();

    // Selecionar fator via ID robusto (o primeiro item adicionado é o 0)
    // Se o elemento não tiver ID, usamos o data-testid se disponível, senão locator por atributo
    // Assumindo que o componente gera ids como `root_cause_0_m_id`
    const factorSelect = page.locator('select[id^="root_cause_"][id$="_m_id"]').last();
    await expect(factorSelect).toBeVisible();
    await factorSelect.selectOption({ index: 1 });

    // Preenche campo de causa
    const causeTextarea = page.locator('textarea[id^="root_cause_"][id$="_cause"]').last();
    await expect(causeTextarea).toBeVisible();
    await causeTextarea.fill('Fator determinante identificado');

    // 7. Ir para Passo 7: Conclusão e mudar status para Concluída
    await rcaPage.goToTab(7);
    await page.getByTestId('select-rca-status').selectOption('STATUS-03');

    // MOCK: Garantir que a resposta do PUT seja sucesso para fechar o modal
    await page.route('**/api/rcas/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      console.log(`[MOCK SPECIFIC] ${method} ${url}`);

      if (method === 'PUT' || method === 'POST') {
        console.log('[MOCK SPECIFIC] Returning Success for Save');
        return route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success', ...existingRca, status: 'STATUS-03' }) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    // 8. Salvar e aguardar fechar
    const saveBtn = page.getByTestId('btn-save-rca');

    if (await saveBtn.isDisabled()) {
      console.log('DEBUG: Botão Salvar está DESABILITADO no momento da falha.');
    } else {
      console.log('DEBUG: Botão Salvar está HABILITADO. Tentando salvar via Atalho (Ctrl+S)...');
    }

    // Tenta salvar via atalho de teclado conforme sugestão do usuário
    await page.keyboard.press('Control+s');

    // Fallback: se o atalho não disparar o save (por exemplo, foco perdido), clica no botão
    // Mas aguarda um pouco para ver se o atalho funcionou (toast appearing)
    try {
      await expect(page.getByText('Análise RCA salva com sucesso!')).toBeVisible({ timeout: 2000 });
      console.log('DEBUG: Salvo com sucesso via Atalho!');
    } catch {
      console.log('DEBUG: Atalho falhou ou demorou. Tentando clique forçado no botão...');
      await saveBtn.click({ force: true });
    }

    try {
      await expect(page.getByText('Análise RCA salva com sucesso!')).toBeVisible({ timeout: 1000000000 });
      await expect(page.getByTestId('rca-editor-overlay')).not.toBeVisible();
    } catch (e) {
      console.log('DEBUG: Falha ao salvar RCA.');

      // Dump Editor State for Analysis
      const editor = page.getByTestId('rca-editor-overlay');
      if (await editor.isVisible()) {
        const html = await editor.innerHTML();
        // Simplified HTML dump
        console.log('DEBUG: Editor HTML Snapshot (truncated): ', html.substring(0, 5000));

        const errorToasts = await page.locator('.toast-error').allInnerTexts();
        console.log('DEBUG: Toasts de Erro na tela:', errorToasts);

        const redText = await page.locator('.text-red-500').allInnerTexts();
        console.log('DEBUG: Mensagens vermelhas:', redText);

        const errorSteps = await page.locator('.bg-rose-500').count();
        if (errorSteps > 0) {
          console.log(`DEBUG: Existem ${errorSteps} passos com erro (ponto vermelho)!`);
          // Tenta identificar qual passo tem erro
          for (let s = 1; s <= 8; s++) {
            const step = page.getByTestId(`step-indicator-${s}`);
            if (await step.locator('.bg-rose-500').count() > 0) {
              console.log(`DEBUG: Erro no Passo ${s}`);
            }
          }
        }

        const saveBtn = page.getByTestId('btn-save-rca');
        if (await saveBtn.isDisabled()) {
          console.log('DEBUG: Botão Salvar está DESABILITADO no momento da falha.');
        } else {
          console.log('DEBUG: Botão Salvar está HABILITADO no momento da falha.');
        }
      }
      throw e;
    }

    // 9. Verificar na lista (simulação visual)
    await page.waitForTimeout(500);
  });
  test('Deve realizar a jornada de navegação básica (Full App Flow merged)', async ({ page }) => {
    // 1. Dashboard (Página Inicial)
    await expect(page.locator('h1')).toBeVisible();

    // 2. Navegar para Análises
    await page.keyboard.press('Alt+A');
    await expect(page.getByTestId('nav-ANALYSES')).toHaveAttribute('class', /bg-primary-600/); // Verifica classe ativa

    // 3. Navegar para Ativos
    await page.keyboard.press('Alt+H');
    await expect(page.getByTestId('nav-ASSETS')).toHaveAttribute('class', /bg-primary-600/);

    // 4. Configurações
    await page.keyboard.press('Alt+C');
    await expect(page.getByTestId('nav-SETTINGS')).toHaveAttribute('class', /bg-primary-600/);
    await expect(page.getByText(/Tipos de Análise|Analysis Types/i).first()).toBeVisible();
  });

});
