/**
 * Teste: rca-editor-deep-dive.spec.ts
 * 
 * Proposta: Validar o funcionamento detalhado das ferramentas de análise (Ishikawa, 5 Porquês e HRA).
 * Ações: Preenchimento de diagramas, criação de cadeias de causalidade e execução do questionário de confiabilidade humana.
 * Execução: Playwright E2E.
 * Fluxo: Inicia nova RCA -> Avança até Investigação -> Preenche Ishikawa -> Preenche 5 Porquês -> Executa Fluxo HRA -> Valida persistência.
 */

import { test, expect } from '@playwright/test';

test.describe('RCA Editor - Ferramentas de Investigação (Deep Dive)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
  });

  test('Deve preencher Ishikawa e 5 Porquês com sucesso', async ({ page }) => {
    // Navegar para o Passo 4 (Investigação)
    await page.getByText(/Investigação|Investigation/i).click();

    // --- 1. Validação do Ishikawa ---
    // Adicionar item em Método
    await page.locator('select').nth(0).selectOption({ index: 0 }); // Assume 0 é Método/Method
    await page.getByPlaceholder('...').first().fill('Falha no procedimento operacional');
    await page.getByRole('button', { name: /Adicionar|Add/i }).first().click();
    
    // Adicionar item em Máquina
    await page.locator('select').nth(0).selectOption({ index: 1 }); // Assume 1 é Máquina/Machine
    await page.getByPlaceholder('...').first().fill('Desgaste excessivo do rolamento');
    await page.getByRole('button', { name: /Adicionar|Add/i }).first().click();

    await expect(page.getByText('Falha no procedimento operacional')).toBeVisible();
    await expect(page.getByText('Desgaste excessivo do rolamento')).toBeVisible();

    // --- 2. Validação dos 5 Porquês (Modo Linear) ---
    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    
    const whyRows = page.locator('div.group.flex.items-start');
    await whyRows.nth(0).locator('input').first().fill('A máquina parou');
    await whyRows.nth(0).locator('input').last().fill('O motor sobreaqueceu');

    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    await whyRows.nth(1).locator('input').first().fill('O motor sobreaqueceu');
    await whyRows.nth(1).locator('input').last().fill('Falta de lubrificação');

    // --- 3. Definição da Causa Raiz (Habilitada após 3 porquês) ---
    await page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    await whyRows.nth(2).locator('input').last().fill('Filtro obstruído');

    const addRootCauseBtn = page.getByRole('button', { name: /Adicionar Causa Raiz|Add Root Cause/i });
    await expect(addRootCauseBtn).toBeEnabled();
    await addRootCauseBtn.click();

    await page.locator('select').last().selectOption({ index: 1 }); // Seleciona um M (ex: Máquina)
    await page.getByPlaceholder('...').last().fill('Causa Raiz Final Identificada');
  });

  test('Deve completar o fluxo de Confiabilidade Humana (HRA)', async ({ page }) => {
    // Acessar aba HRA
    const hraTab = page.getByText(/Confiabilidade Humana|Human Reliability/i);
    await hraTab.click();

    // --- 1. Questionário ---
    // Clicar em Sim na primeira pergunta
    await page.locator('button >> svg.lucide-square').first().click(); 
    // Adicionar comentário na primeira pergunta
    await page.getByPlaceholder(/Adicionar comentário|Add comment/i).first().fill('Operador não treinado para esta tarefa específica');

    // --- 2. Conclusões HRA ---
    // Selecionar a primeira conclusão (ex: Erro de Execução)
    const conclusionBtn = page.locator('div.space-y-4 button >> svg.lucide-square').first();
    await conclusionBtn.click();
    await page.getByPlaceholder(/Descreva resumidamente|Describe briefly/i).fill('Falha na interpretação do painel de controle');

    // --- 3. Validação do Coordenador ---
    await page.getByRole('button', { name: /SIM|YES/i }).last().click();
    await page.locator('textarea').last().fill('Validação realizada conforme entrevista');

    // Verificar se os dados permanecem ao trocar de aba e voltar
    await page.getByText(/Dados Gerais|General Data/i).click();
    await hraTab.click();
    
    await expect(page.getByText('Operador não treinado')).toBeVisible();
    await expect(page.getByText('Falha na interpretação')).toBeVisible();
  });

});
