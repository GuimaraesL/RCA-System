/**
 * Teste: rca-validation-rules.spec.ts
 * 
 * Proposta: Validar as regras de preenchimento obrigatório e o feedback visual de erros do editor.
 * Ações: Tentativa de salvamento incompleto, identificação de campos com bordas vermelhas e validação de mensagens com API Mockada.
 * Execução: Playwright E2E.
 * Fluxo: Inicia RCA -> Tenta salvar sem dados -> Verifica indicação de erro no 'O que ocorreu' e 'Ativo' -> Preenche dados -> Valida conclusão.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';
import { RcaEditorPage } from '../pages/RcaEditorPage';

test.describe('RCA Editor - Regras de Validação e Erros', () => {
  let rcaPage: RcaEditorPage;

  test.beforeEach(async ({ page }) => {
    // INTERCEPTAÇÃO TOTAL DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) {
        const taxonomy = TaxonomyFactory.createDefault();
        // Configura campos obrigatórios específicos para o teste
        taxonomy.mandatoryFields.rca.create = ['what', 'subgroup_id', 'analysis_type', 'failure_date'];
        return route.fulfill({ status: 200, body: JSON.stringify(taxonomy) });
      }
      if (url.includes('/api/assets')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([{
            id: 'AREA-01', name: 'Área Teste', type: 'AREA', children: [
              {
                id: 'EQ-01', name: 'Equipamento Teste', type: 'EQUIPMENT', children: [
                  { id: 'SUB-01', name: 'Subgrupo Teste', type: 'SUBGROUP', children: [] }
                ]
              }
            ]
          }])
        });
      }
      if (url.includes('/api/rcas')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      return route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible({ timeout: 15000 });

    rcaPage = new RcaEditorPage(page);
    await rcaPage.open();
    await expect(page.getByTestId('rca-editor-overlay')).toBeVisible();
  });

  test('Deve exibir erros de validação ao tentar salvar campos obrigatórios vazios', async ({ page }) => {
    // 1. Tenta salvar rascunho sem preencher nada
    await rcaPage.saveBtn.click();

    // 2. Verificar se a seção de Ativos (Passo 1) está com erro
    const assetContainer = page.getByTestId('asset-selector-container');
    await expect(assetContainer).toHaveClass(/border-rose-300|border-red-500/);

    // 3. Ir para o Passo 2 (Problema) e verificar o campo 'what'
    await rcaPage.goToTab(2);
    const whatInput = page.getByTestId('input-what');
    await expect(whatInput).toHaveClass(/border-rose-500|border-red-500/);
  });

  test('Deve permitir salvar após preencher campos obrigatórios dinâmicos', async ({ page }) => {
    // 1. Preencher Ativo (Passo 1)
    await rcaPage.goToTab(1);
    await rcaPage.selectSubgroup('SUB-01', ['AREA-01', 'EQ-01']);

    // 2. Preencher Data da Falha e Tipo
    await rcaPage.fillGeneralInfo('2026-02-01', 1);

    // 4. Preencher 'O que ocorreu' (Passo 2)
    await rcaPage.goToTab(2);
    await rcaPage.fillProblemDescription('Falha de teste controlada via E2E');

    // 5. Salvar e Fechar
    await rcaPage.saveAndClose();

    // Se salvou, o overlay não deve mais estar visível e podemos navegar
    await expect(page.getByTestId('rca-editor-overlay')).not.toBeVisible();
  });

});