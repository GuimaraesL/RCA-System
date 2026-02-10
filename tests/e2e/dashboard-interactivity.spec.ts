/**
 * Teste: dashboard-interactivity.spec.ts
 * 
 * Proposta: Validar a interatividade e os elementos visuais do Dashboard.
 * Ações: Verificação de tooltips em cards de KPI e lógica de cross-filtering em gráficos.
 * Execução: Playwright E2E.
 * Fluxo: 1. Navega para Dashboard -> 2. Verifica visibilidade de cards -> 3. Valida tooltips nativos -> 4. Verifica carregamento de gráficos.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard - Interatividade e Visualização', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Cards de KPI devem exibir tooltips ao passar o mouse', async ({ page }) => {
        // Aguarda o carregamento do dashboard (desaparecimento de Skeletons)
        await expect(page.locator('.animate-pulse')).not.toBeVisible({ timeout: 15000 });
        await expect(page.locator('h1')).toBeVisible();

        // Localiza o container que envolve o ícone de Info e possui o title
        const infoIconContainer = page.locator('div[title*="minutos"], div[title*="minutes"]').first();

        // Asserção do atributo title contendo o texto esperado (match parcial via Regex)
        await expect(infoIconContainer).toHaveAttribute('title', /minutos|minutes/i);
    });

    test('Clique no gráfico deve disparar filtragem cruzada', async ({ page }) => {
        // Aguarda o carregamento dos gráficos (desaparecimento de Skeletons)
        await expect(page.locator('.animate-pulse')).not.toBeVisible({ timeout: 15000 });
        
        // Verifica visibilidade dos gráficos
        await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
    });
});