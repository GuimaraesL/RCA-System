import { test, expect } from '@playwright/test';

test('Verificar visibilidade dos passos 6 e 7 no RCA Editor', async ({ page }) => {
    // Mock da API para retornar uma RCA padrão
    await page.route('**/api/taxonomy', async route => {
        route.fulfill({
            status: 200,
            body: JSON.stringify({
                analysisTypes: [
                    { id: 'TYP-MMYYYVMJ-306', name: 'RCA Completo' }
                ]
            })
        });
    });

    await page.goto('/');
    await page.getByTestId('nav-ANALYSES').click();
    await page.getByTestId('btn-new-analysis').click();

    // Aguarda o modal abrir
    await expect(page.getByTestId('rca-editor-footer')).toBeVisible();

    // Verifica indicadores de passos
    // O Stepper usa seletores como step-indicator-N
    await expect(page.getByTestId('step-indicator-1')).toBeVisible();
    await expect(page.getByTestId('step-indicator-2')).toBeVisible();
    await expect(page.getByTestId('step-indicator-3')).toBeVisible();
    await expect(page.getByTestId('step-indicator-4')).toBeVisible();
    await expect(page.getByTestId('step-indicator-5')).toBeVisible();
    
    // ESTES SÃO OS QUE O USUÁRIO DIZ QUE NÃO APARECEM
    await expect(page.getByTestId('step-indicator-6')).toBeVisible();
    await expect(page.getByTestId('step-indicator-7')).toBeVisible();
    
    await expect(page.getByTestId('step-indicator-8')).toBeVisible();
});
