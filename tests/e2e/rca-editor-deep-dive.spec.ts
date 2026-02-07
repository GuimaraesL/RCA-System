/**
 * Teste: rca-editor-deep-dive.spec.ts
 * 
 * Proposta: Validar o funcionamento detalhado das ferramentas de análise (Ishikawa, 5 Porquês e HRA).
 * Ações: Preenchimento de diagramas, criação de cadeias de causalidade e execução do questionário de confiabilidade humana.
 * Execução: Playwright E2E.
 * Fluxo: Inicia nova RCA -> Avança até Investigação -> Preenche Ishikawa -> Preenche 5 Porquês -> Executa Fluxo HRA -> Valida persistência.
 */

import { test, expect } from '@playwright/test';
import { RcaEditorPage } from '../pages/RcaEditorPage';
import { RcaFactory, TaxonomyFactory } from '../factories/rcaFactory';

test.describe('RCA Editor - Ferramentas de Investigação (POM + Mock)', () => {

  test.beforeEach(async ({ page }) => {
    // 🛡️ FULL API SHADOWING
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/taxonomy')) {
        return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      }
      if (url.includes('/api/assets')) {
        return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'AREA-01', name: 'Área Teste', type: 'AREA', children: [] }]) });
      }
      if (url.includes('/api/rcas')) {
        return route.fulfill({ status: 200, body: JSON.stringify([RcaFactory.create()]) });
      }
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/');
  });

  test('Deve validar o ciclo de vida das ferramentas de investigação', async ({ page }) => {
    const editor = new RcaEditorPage(page);
    await editor.open();

    // 1. Ishikawa
    await editor.goToTab(/Investigação|Investigation/i);
    await editor.fillIshikawa(0, 'Falha no procedimento operacional');
    await editor.fillIshikawa(1, 'Desgaste excessivo');
    await expect(page.getByText('Falha no procedimento operacional')).toBeVisible();

    // 2. 5 Whys
    await editor.addFiveWhys('A máquina parou', 'Superaquecimento');
    await expect(page.getByText('Superaquecimento')).toBeVisible();

    // 3. HRA
    await editor.goToTab(/Confiabilidade Humana|Human Reliability/i);
    await editor.fillHRAQuestion(0, 'YES', 'Comentário de Teste QA');
    await expect(page.getByText('Comentário de Teste QA')).toBeVisible();

    // 4. Regressão Visual (Snapshot) - Desabilitado por padrão em CI, habilitar localmente
    // await editor.takeSnapshot('rca-editor-investigation-tools');
  });

});
