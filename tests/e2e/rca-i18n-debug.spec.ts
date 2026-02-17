/**
 * Teste: rca-i18n-debug.spec.ts
 * 
 * Proposta: Depurar a funcionalidade de tradução em tempo real na interface do usuário.
 * Ações: Alternância de idioma para Inglês e verificação de que os componentes do Wizard e botões de ação refletem a mudança imediatamente.
 * Execução: Playwright E2E.
 * Fluxo: Carrega aplicação -> Muda para EN -> Navega até o Editor -> Verifica textos de cabeçalho e botões (General Data, Add Why).
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

test('Deve depurar a função de tradução I18N', async ({ page }) => {
    // INTERCEPTAÇÃO DA API
    await page.route('**/api/**', async route => {
        const url = route.request().url();
        if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
        if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
        if (url.includes('/api/assets')) {
            return route.fulfill({ 
                status: 200, 
                body: JSON.stringify([{ 
                    id: 'AREA-01', 
                    name: 'Planta A - Manufatura', 
                    type: 'AREA', 
                    children: [
                        { 
                            id: 'EQ-01', 
                            name: 'Sistema de Óleo de Laminação', 
                            type: 'EQUIPMENT', 
                            children: [
                                { id: 'SUB-01', name: 'Equipamentos Auxiliares', type: 'SUBGROUP', children: [] }
                            ]
                        }
                    ] 
                }]) 
            });
        }
        return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
    
    // Alterna para EN
    await page.getByRole('button', { name: 'EN' }).click();
    
    // Navegar para Análises
    await page.getByRole('button', { name: /Analyses/i }).click();
    await page.getByRole('button', { name: /New Analysis/i }).click();
    
    // Seleciona Ativos na árvore
    await page.getByText('Planta A - Manufatura').click();
    const equipment = page.getByText('Sistema de Óleo de Laminação');
    await equipment.waitFor({ state: 'visible' });
    await equipment.click();
    const subgroup = page.getByText('Equipamentos Auxiliares');
    await subgroup.waitFor({ state: 'visible' });
    await subgroup.click();
    
    // Verifica se os textos do Wizard mudaram para EN
    await expect(page.getByText(/General Data/i)).toBeVisible();
    
    // Vai para Passo 4 (Investigation)
    await page.getByText(/Investigation/i).click();
    
    // Testa botões em EN
    await expect(page.getByRole('button', { name: /Add Why/i }).first()).toBeVisible();
});