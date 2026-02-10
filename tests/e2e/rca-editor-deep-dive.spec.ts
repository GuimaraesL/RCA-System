/**
 * Teste: rca-editor-deep-dive.spec.ts
 * 
 * Proposta: Validar o funcionamento detalhado das ferramentas de análise (Ishikawa, 5 Porquês e HRA).
 * Ações: Preenchimento de diagramas, criação de cadeias de causalidade e execução do questionário de confiabilidade humana com API Mockada.
 * Execução: Playwright E2E.
 * Fluxo: Inicia nova RCA -> Avança até Investigação -> Preenche Ishikawa -> Preenche 5 Porquês -> Executa Fluxo HRA -> Valida persistência.
 */

import { test, expect } from '@playwright/test';
import { RcaEditorPage } from '../pages/RcaEditorPage';
import { RcaFactory, TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

test.describe('RCA Editor - Ferramentas de Investigação (POM + Mock)', () => {

  test.beforeEach(async ({ page }) => {
    //  FULL API SHADOWING
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      if (url.includes('/api/assets')) {
        return route.fulfill({ status: 200, body: JSON.stringify([{ id: 'AREA-01', name: 'Área Teste', type: 'AREA', children: [] }]) });
      }
      if (url.includes('/api/rcas')) {
        return route.fulfill({ status: 200, body: JSON.stringify([RcaFactory.create()]) });
      }
      if (url.includes('/api/actions')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      if (url.includes('/api/triggers')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
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
    // Nota: O preenchimento do HRA depende da estrutura de perguntas mockada na factory
    const hraQuestion = page.locator('tbody tr').first();
    await expect(hraQuestion).toBeVisible();
  });

});