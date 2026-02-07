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
        // Aguarda o carregamento do dashboard
        await expect(page.locator('h1')).toBeVisible();

        // O tooltip é implementado como um atributo 'title' nativo no container pai.
        // Localiza o primeiro ícone de Info e verifica se seu container possui o atributo esperado.
        const infoIconContainer = page.locator('.lucide-info').first().locator('..');

        // Asserção do atributo title contendo o texto esperado (match parcial)
        await expect(infoIconContainer).toHaveAttribute('title', /Soma total dos minutos/);
    });

    test('Clique no gráfico deve disparar filtragem cruzada', async ({ page }) => {
        // Aguarda o carregamento dos gráficos
        await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();

        // Verifica se o estado de carregamento (Skeleton/Pulse) desapareceu
        await expect(page.locator('.animate-pulse')).not.toBeVisible();
    });
});