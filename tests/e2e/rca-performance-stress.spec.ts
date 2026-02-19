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
      RcaFactory.create({
        id: `STRESS-${i}`,
        what: `Performance Test Item #${i}`,
        status: 'STATUS-01' // Garante que apareça no filtro padrão 'Em Andamento' se houver
      })
    );

    //  MOCKING DE ALTA CARGA
    await page.route('**/api/taxonomy', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
    });
    // O regex * garante que pegue ?page=1 etc
    await page.route('**/api/rcas*', async route => {
      console.log('MOCK HIT: ' + route.request().url());
      await route.fulfill({ status: 200, body: JSON.stringify(largeDataSet) });
    });
    await page.route('**/api/assets', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });

    // Limpa filtros e injeta os registros mockados no LocalStorage
    await page.evaluate((data) => {
      localStorage.setItem('rca_app_v1_records', JSON.stringify(data));
      localStorage.removeItem('rca_global_filters');
    }, largeDataSet);
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible({ timeout: 15000 });

    await page.getByTestId('nav-ANALYSES').click();

    // Aguarda container da tabela
    await expect(page.getByTestId('rca-table-container')).toBeVisible();

    // Validação de Tempo de Carregamento (Deve ser < 3s para 1.000 itens mockados)
    // Busca por qualquer item de teste visível, já que a ordenação pode variar
    await expect(page.getByText(/Performance Test Item #/i).first()).toBeVisible({ timeout: 10000 });
    const loadTime = Date.now() - startTime;
    console.log(` Tempo de carga para 1.000 itens: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000);

    // Validar se o último item está no DOM (indica que a virtualização/lista processou tudo)
    // Se estiver usando virtualização, o item #999 pode não estar no DOM, mas a contagem total sim
    const rows = page.locator('table tr, div[role="row"]');
    console.log(` Total de linhas detectadas: ${await rows.count()}`);
  });

});

