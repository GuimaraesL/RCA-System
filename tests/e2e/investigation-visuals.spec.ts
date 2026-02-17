/**
 * Teste: investigation-visuals.spec.ts
 * 
 * Proposta: Validar os elementos visuais da etapa de Investigação (Passo 4).
 * Ações: Verificação de renderização do Diagrama de Ishikawa e interação com a ferramenta de 5 Porquês utilizando seletores contextualizados.
 * Execução: Playwright E2E.
 * Fluxo: Acessa Editor RCA -> Navega para Investigação -> Adiciona item em Ishikawa -> Verifica card -> Adiciona pergunta nos 5 Porquês -> Valida inputs.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory, RcaFactory } from '../factories/rcaFactory';

test.describe('Editor RCA - Visualização de Investigação (Passo 4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 1024 });

        // INTERCEPTAÇÃO DA API
        await page.route('**/api/**', async route => {
            const url = route.request().url();
            if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
            if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(TaxonomyFactory.createDefault()) });
            if (url.includes('/api/rcas')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
            if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
            return route.fulfill({ status: 200, body: JSON.stringify([]) });
        });

        await page.goto('http://localhost:3000/');
        
        // Desativa animações globalmente para o teste
        await page.addStyleTag({ content: `*, *::before, *::after { transition: none !important; animation: none !important; }` });

        await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });

        await page.getByRole('button', { name: /Análises|Analyses/i }).click();
        await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
        
        // Navega para o Passo 4 (Investigação)
        await page.getByText(/Investigação|Investigation/i).click();
    });

    test('Diagrama de Ishikawa deve renderizar como cards', async ({ page }) => {
        // Localiza o container de Ishikawa (baseado no título h3)
        const ishikawaSection = page.locator('div', { has: page.locator('h3', { hasText: /Ishikawa/i }) });
        await expect(ishikawaSection).toBeVisible();

        // Verifica Categorias
        await expect(ishikawaSection.locator('h4', { hasText: /Método|Method/i })).toBeVisible();

        // Adiciona um item (Usa o ID específico do input e o botão dentro do container)
        await page.locator('#ishikawa_new_item').fill('Falha de procedimento operacional');
        await ishikawaSection.getByRole('button', { name: /Adicionar|Add/i }).click({ force: true });

        // Verifica se o card aparece
        await expect(page.getByText('Falha de procedimento operacional')).toBeVisible({ timeout: 10000 });
    });

    test('Interação com os 5 Porquês', async ({ page }) => {
        // Localiza o container de 5 Porquês (baseado no título h3)
        const whysSection = page.locator('div', { has: page.locator('h3', { hasText: /5 Porquês|5 Whys/i }) });
        await expect(whysSection).toBeVisible();

        // No estado vazio, o botão diz "Adicionar" (t('wizard.add'))
        const addBtn = whysSection.getByRole('button', { name: /Adicionar|Add/i });
        await addBtn.click({ force: true });

        // Agora os campos de input devem aparecer
        const whyInput = page.locator('input[id*="five_whys_0_question"]');
        const answerInput = page.locator('input[id*="five_whys_0_answer"]');
        
        await whyInput.fill('Por que parou?');
        await answerInput.fill('Falha no motor');

        await expect(whyInput).toHaveValue('Por que parou?');
        await expect(answerInput).toHaveValue('Falha no motor');
    });
});
