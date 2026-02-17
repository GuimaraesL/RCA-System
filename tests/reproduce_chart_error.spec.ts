/**
 * Teste: reproduce_chart_error.spec.ts
 * 
 * Proposta: Validar a estabilidade dos gráficos (Recharts) e prevenir erros de redimensionamento (width/height 0).
 * Ações: Monitoramento de logs de erro e avisos no console do navegador durante a renderização inicial da dashboard.
 * Execução: Playwright E2E.
 * Fluxo: Injeta script de supressão de animações -> Navega para Dashboard -> Aguarda renderização dos gráficos -> Verifica ausência de erros de dimensões no console.
 */

import { test, expect } from '@playwright/test';

test('Dashboard não deve apresentar erros de dimensões nos gráficos Recharts', async ({ page }) => {
    // Inject flag to disable animations
    await page.addInitScript(() => {
        (window as any).isPlaywright = true;
    });

    const consoleErrors: string[] = [];

    // Listen for console errors
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            const text = msg.text();
            if (text.includes('width') && text.includes('height') && text.includes('chart')) {
                consoleErrors.push(text);
                console.log(`Caught relevant console message: ${text}`);
            }
        }
    });

    // Navigate to dashboard
    await page.goto('http://localhost:3000');

    // Wait for dashboard to load (look for a known element)
    await page.waitForSelector('h1', { timeout: 10000 });

    // Wait a bit for charts to render and potential resize events
    await page.waitForTimeout(3000);

    // Assert no errors were found
    expect(consoleErrors, `Found Recharts errors: ${consoleErrors.join('\n')}`).toHaveLength(0);
});
