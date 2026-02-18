import { test, expect } from '@playwright/test';
import { RcaFactory, TriggerFactory, TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

/**
 * Teste: full-app-flow.spec.ts
 * 
 * Proposta: Validar a jornada crítica do usuário com ISOLAMENTO TOTAL (API Mockada).
 * Ações: Criação de ativos, navegação por menus e verificação de integridade visual.
 * Execução: Playwright E2E com API Shadowing.
 * Fluxo: 1. Health Check -> 2. Navegação Sidebar -> 3. Validação de Dashboard -> 4. Verificação de Configurações.
 */

test.describe('RCA System - Validação de Fluxo Completo (MOCK)', () => {

  test.beforeEach(async ({ page }) => {
    // DEBUG: Captura logs do console do navegador
    page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
    page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

    // INTERCEPTAÇÃO TOTAL DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();

      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      if (url.includes('/api/assets')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([{ id: 'AREA-01', name: 'Área Mockada', type: 'AREA', children: [] }])
        });
      }
      if (url.includes('/api/rcas')) {
        return route.fulfill({
          status: 200,
          body: JSON.stringify([RcaFactory.create({ id: 'RCA-FLOW-01', what: 'Fluxo Mockado' })])
        });
      }
      if (url.includes('/api/triggers')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      if (url.includes('/api/actions')) return route.fulfill({ status: 200, body: JSON.stringify([]) });

      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('/');

    // Aguarda a aplicação estar pronta (evita blank screen)
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    // await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('Deve realizar a jornada de navegação básica', async ({ page }) => {
    // 1. Dashboard (Página Inicial)
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByText(/Fluxo Mockado/i)).not.toBeVisible(); // Dashboard não lista RCAs por texto bruto, mas KPI

    // 2. Navegar para Análises
    await page.keyboard.press('Alt+A');
    await expect(page.getByText('Fluxo Mockado')).toBeVisible();

    // 3. Navegar para Ativos
    await page.keyboard.press('Alt+H');
    await expect(page.getByText('Área Mockada')).toBeVisible();

    // 4. Configurações
    await page.keyboard.press('Alt+C');
    await expect(page.getByText(/Tipos de Análise|Analysis Types/i).first()).toBeVisible();
  });

});
