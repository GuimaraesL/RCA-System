/**
 * Teste: rca-i18n-localization.spec.ts
 * 
 * Proposta: Validar a internacionalização (i18n) do sistema, garantindo a tradução correta da UI e a persistência do idioma.
 * Ações: Comutação entre Português e Inglês, verificação de labels em diferentes páginas e teste de persistência após recarregamento.
 * Execução: Playwright E2E.
 * Fluxo: 1. Verifica idioma inicial -> 2. Troca para Inglês -> 3. Valida Dashboard e Sidebar -> 4. Recarrega página -> 5. Valida persistência -> 6. Troca para Português -> 7. Valida retorno.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

test.describe('RCA System - Internacionalização (i18n)', () => {

  test.beforeEach(async ({ page }) => {
    // Monitora erros de página e console para diagnosticar crashes
    page.on('pageerror', err => console.log(` BROWSER CRASH: ${err.message}`));
    page.on('console', msg => console.log(`[BROWSER ${msg.type()}]: ${msg.text()}`));

    //  FULL API SHADOWING
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    
    // Aguarda o fim do carregamento inicial (Suspense)
    const loader = page.getByTestId('app-suspense-loading');
    if (await loader.isVisible()) {
      await expect(loader).not.toBeVisible({ timeout: 15000 });
    }

    // Garante que o layout base (aside) montou antes de prosseguir
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
  });

  test('Deve alternar entre idiomas e validar a tradução da UI', async ({ page }) => {
    // 1. Validar estado inicial (Português esperado por padrão)
    const dashboardTitle = page.locator('h1');
    await expect(dashboardTitle).toContainText('Painel de Controle');
    
    // 2. Trocar para Inglês
    await page.getByRole('button', { name: 'EN' }).click();
    
    // 3. Validar traduções na Dashboard
    await expect(dashboardTitle).toContainText('Dashboard');
    await expect(page.getByText('Consolidated view of failures, costs, and performance.')).toBeVisible();
    
    // 4. Validar traduções na Sidebar
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Triggers')).toBeVisible();
    await expect(sidebar.getByText('Analyses')).toBeVisible();
    await expect(sidebar.getByText('Action Plans')).toBeVisible();
    await expect(sidebar.getByText('Assets')).toBeVisible();

    // 5. Validar Persistência (Reload)
    await page.reload();
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();
    await expect(dashboardTitle).toContainText('Dashboard'); // Deve continuar em inglês

    // 6. Voltar para Português
    await page.getByRole('button', { name: 'PT' }).click();
    await expect(dashboardTitle).toContainText('Painel de Controle');
    await expect(sidebar.getByText('Gatilhos')).toBeVisible();
  });

  test('Deve validar a tradução de modais e componentes dinâmicos', async ({ page }) => {
    // Trocar para Inglês primeiro
    await page.getByRole('button', { name: 'EN' }).click();

    // Abrir modal de Gatilhos
    await page.getByRole('button', { name: 'Triggers' }).click();
    await page.getByRole('button', { name: 'New Trigger' }).click();

    // Validar labels do modal em Inglês
    const modal = page.locator('div.fixed.inset-0.z-50');
    await expect(modal.getByText('Edit Trigger Event')).toBeVisible();
    await expect(modal.getByText('Start Date/Time')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Save Trigger' })).toBeVisible();

    // Fechar e validar retorno para PT
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'PT' }).click();
    await expect(page.getByRole('button', { name: 'Gatilhos' })).toBeVisible();
  });

});

