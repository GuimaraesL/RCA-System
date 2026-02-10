/**
 * Teste: rca-validation-rules.spec.ts
 * 
 * Proposta: Validar as regras de preenchimento obrigatório e o feedback visual de erros do editor.
 * Ações: Tentativa de salvamento incompleto, identificação de campos com bordas vermelhas e validação de mensagens com API Mockada.
 * Execução: Playwright E2E.
 * Fluxo: Inicia RCA -> Tenta salvar sem dados -> Verifica indicação de erro no 'O que ocorreu' e 'Ativo' -> Preenche dados -> Valida conclusão.
 */

import { test, expect } from '@playwright/test';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

test.describe('RCA Editor - Regras de Validação e Erros', () => {

  test.beforeEach(async ({ page }) => {
    // INTERCEPTAÇÃO TOTAL DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) {
        const taxonomy = TaxonomyFactory.createDefault();
        // Configura campos obrigatórios específicos para o teste
        taxonomy.mandatoryFields.rca.create = ['what', 'subgroup_id', 'analysis_type', 'failure_date'];
        return route.fulfill({ status: 200, body: JSON.stringify(taxonomy) });
      }
      if (url.includes('/api/assets')) {
        return route.fulfill({ 
          status: 200, 
          body: JSON.stringify([{ id: 'AREA-01', name: 'Área Teste', type: 'AREA', children: [
            { id: 'EQ-01', name: 'Equipamento Teste', type: 'EQUIPMENT', children: [
                { id: 'SUB-01', name: 'Subgrupo Teste', type: 'SUBGROUP', children: [] }
            ]}
          ]}]) 
        });
      }
      if (url.includes('/api/rcas')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      return route.fulfill({ status: 200, body: JSON.stringify({}) });
    });

    await page.goto('http://localhost:3000/');
    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
    
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
    await expect(page.getByText(/Nova Análise|New Analysis/i).first()).toBeVisible();
  });

  test('Deve exibir erros de validação ao tentar salvar campos obrigatórios vazios', async ({ page }) => {
    // 1. Tenta salvar rascunho sem preencher nada
    const saveBtn = page.locator('button:has(.lucide-save)');
    await saveBtn.click();

    // 2. Verificar se a seção de Ativos (Passo 1) está com erro
    const assetContainer = page.locator('#asset-selector-container');
    await expect(assetContainer).toHaveClass(/border-red-500/);

    // 3. Ir para o Passo 2 (Problema) e verificar o campo 'what'
    await page.getByText(/Problema|Problem/i).click();
    const whatInput = page.locator('#what');
    await expect(whatInput).toHaveClass(/border-red-500/);
  });

  test('Deve permitir salvar após preencher campos obrigatórios dinâmicos', async ({ page }) => {
    // 1. Preencher Ativo (Passo 1)
    await page.getByText(/Gerais|General/i).click();
    // Navega na árvore e seleciona o subgrupo
    await page.getByText('Área Teste').click();
    await page.getByText('Equipamento Teste').click();
    await page.getByText('Subgrupo Teste').click();

    // 2. Preencher Data da Falha
    await page.locator('#failure_date').fill('2026-02-01');

    // 3. Preencher Tipo de Análise
    await page.locator('#analysis_type').selectOption({ index: 1 });

    // 4. Preencher 'O que ocorreu' (Passo 2)
    await page.getByText(/Problema|Problem/i).click();
    await page.locator('#what').fill('Falha de teste controlada via E2E');

    // 5. Salvar
    const saveBtn = page.locator('button:has(.lucide-save)');
    await saveBtn.click();

    // Se salvou, os erros de validação devem desaparecer
    await expect(page.locator('.border-red-500')).not.toBeVisible();
  });

});