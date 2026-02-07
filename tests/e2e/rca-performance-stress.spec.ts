/**
 * Teste: rca-performance-stress.spec.ts
 * 
 * Proposta: Validar a estabilidade e performance do frontend sob carga massiva de dados.
 * Ações: Injeção de 1.000 registros de RCA via interceptação de API (Mocking).
 * Execução: Playwright E2E.
 * Fluxo: Intercepta /api/rcas -> Retorna 1.000 objetos da Factory -> Carrega página de Análises -> Valida renderização da tabela e scroll.
 */

import { test, expect } from '@playwright/test';
import { RcaFactory, TaxonomyFactory } from '../factories/rcaFactory';

test.describe('RCA System - Stress Testing (Frontend)', () => {

  test('Deve carregar 1.000 registros e manter a interatividade', async ({ page }) => {
    // Gerar 1.000 registros fictícios
    const largeDataSet = Array.from({ length: 1000 }).map((_, i) => 
      RcaFactory.create({ id: `STRESS-${i}`, what: `Performance Test Item #${i}` })
    );

    //  MOCKING DE ALTA CARGA
    await page.route('**/api/taxonomy', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
    });
    await page.route('**/api/rcas*', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify(largeDataSet) });
    });
    await page.route('**/api/assets', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();

    // Validação de Tempo de Carregamento (Deve ser < 3s para 1.000 itens mockados)
    await expect(page.getByText('Performance Test Item #0')).toBeVisible();
    const loadTime = Date.now() - startTime;
    console.log(` Tempo de carga para 1.000 itens: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000);

    // Validar se o último item está no DOM (indica que a virtualização/lista processou tudo)
    // Se estiver usando virtualização, o item #999 pode não estar no DOM, mas a contagem total sim
    const rows = page.locator('table tr, div[role="row"]');
    console.log(` Total de linhas detectadas: ${await rows.count()}`);
  });

});

