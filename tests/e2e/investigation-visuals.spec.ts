/**
 * Teste: investigation-visuals.spec.ts
 * 
 * Proposta: Validar os elementos visuais da etapa de Investigação (Passo 4).
 * Ações: Verificação da renderização do diagrama de Ishikawa e interação com os 5 Porquês.
 * Execução: Playwright E2E.
 * Fluxo: 1. Abre Editor -> 2. Navega para Passo 4 -> 3. Valida categorias do Ishikawa -> 4. Testa inserção de causas e Porquês.
 */

import { test, expect } from '@playwright/test';

test.describe('Editor RCA - Visualização de Investigação (Passo 4)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Abre o Editor de RCA (Nova Análise)
        await page.click('text=Nova Análise');
        // Navega para o Passo 4
        // Clica em Próximo 3 vezes para chegar no Passo 4
        await page.click('button:has-text("Próxima")'); // Passo 1 -> 2
        await page.click('button:has-text("Próxima")'); // Passo 2 -> 3
        await page.click('button:has-text("Próxima")'); // Passo 3 -> 4
    });

    test('Diagrama de Ishikawa deve renderizar como cards', async ({ page }) => {
        // Verifica título do Passo 4
        await expect(page.locator('h2')).toContainText('Investigação');

        // Verifica Categorias (Método, Máquina, etc.)
        const categories = ['Método', 'Máquina', 'Mão de Obra', 'Material', 'Medida', 'Meio Ambiente'];

        for (const cat of categories) {
            await expect(page.locator(`text=${cat}`)).toBeVisible();
        }

        // Adiciona um item em "Método"
        await page.fill('input[placeholder="..."]', 'Falha de procedimento');
        await page.click('button:has-text("Adicionar")');

        // Verifica se o card aparece
        await expect(page.getByText('Falha de procedimento')).toBeVisible();

        // Verifica botão de exclusão
        const deleteBtn = page.locator('button[title="Excluir"]').first();
        await expect(deleteBtn).toBeAttached();
    });

    test('Interação com os 5 Porquês', async ({ page }) => {
        // Verifica estado inicial
        await expect(page.locator('text=5 Porquês')).toBeVisible();

        // Adiciona um Porquê
        await page.click('button:has-text("Adicionar Porquê")');

        // Verifica se os campos de input aparecem
        await expect(page.locator('input[placeholder="..."]').first()).toBeVisible();

        // Preenche inputs
        const inputs = page.locator('input[placeholder="..."]');
        await inputs.nth(0).fill('Por que parou?');
        await inputs.nth(1).fill('Falha no motor');

        // Verifica conteúdo
        await expect(page.locator('input[value="Por que parou?"]')).toBeVisible();
    });
});