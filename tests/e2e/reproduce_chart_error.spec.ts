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
    // Injeta flag para desabilitar animações
    await page.addInitScript(() => {
        (window as any).isPlaywright = true;
    });

    const consoleErrors: string[] = [];

    // Escuta por erros de console
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            const text = msg.text();
            if (text.includes('width') && text.includes('height') && text.includes('chart')) {
                consoleErrors.push(text);
                console.log(`Mensagem de console relevante capturada: ${text}`);
            }
        }
    });

    // Navega para a dashboard
    await page.goto('/');

    // Aguarda o carregamento da dashboard (procura por um elemento conhecido)
    await page.waitForSelector('h1', { timeout: 10000 });

    // Aguarda um momento para a renderização dos gráficos e possíveis eventos de redimensionamento
    await page.waitForTimeout(3000);

    // Verifica se nenhum erro foi encontrado
    expect(consoleErrors, `Erros Recharts encontrados: ${consoleErrors.join('\n')}`).toHaveLength(0);
});
