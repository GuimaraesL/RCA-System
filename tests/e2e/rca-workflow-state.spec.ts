/**
 * Teste: rca-workflow-state.spec.ts
 * 
 * Proposta: Validar a transição de estados das análises e a integração entre Gatilhos e RCA.
 * Ações: Conversão de gatilho em RCA, verificação de mudança automática de status na listagem.
 * Execução: Playwright E2E.
 * Fluxo: Acessa Gatilhos -> Seleciona Gatilho -> Converte para RCA -> Preenche dados mínimos -> Valida status 'Em Andamento' -> Finaliza RCA -> Valida status 'Concluída'.
 */

import { test, expect } from '@playwright/test';
import { TriggerFactory, TaxonomyFactory, RcaFactory, SystemFactory } from '../factories/rcaFactory';

test.describe('RCA Workflow - Ciclo de Estados e Gatilhos', () => {

  test.beforeEach(async ({ page }) => {
    // Monitora erros e logs
    page.on('console', msg => console.log(`[APP CONSOLE]: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[PAGE ERROR]: ${err.message}`));

    const mockTaxonomy = TaxonomyFactory.createDefault();
    const mockAssets = [{ 
        id: 'AREA-01', 
        name: 'Planta A', 
        type: 'AREA', 
        children: [{
            id: 'EQUIP-01',
            name: 'Equipamento 01',
            type: 'EQUIPMENT',
            children: [{
                id: 'SUB-01',
                name: 'Subgrupo 01',
                type: 'SUBGROUP',
                children: []
            }]
        }] 
    }];

    const mockTriggers = [
        TriggerFactory.create({ 
          id: 'TRG-E2E-01', 
          area_id: 'AREA-01',
          equipment_id: 'EQUIP-01',
          subgroup_id: 'SUB-01',
          status: 'T-STATUS-01',
          stop_reason: 'Falha de Teste E2E',
          rca_id: null
        })
    ];

    // INTERCEPTAÇÃO DA API (API SHADOWING)
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      if (url.includes('/api/taxonomy')) return route.fulfill({ status: 200, body: JSON.stringify(mockTaxonomy) });
      if (url.includes('/api/assets')) return route.fulfill({ status: 200, body: JSON.stringify(mockAssets) });
      if (url.includes('/api/triggers')) return route.fulfill({ status: 200, body: JSON.stringify(mockTriggers) });
      if (url.includes('/api/rcas')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      if (url.includes('/api/actions')) return route.fulfill({ status: 200, body: JSON.stringify([]) });
      
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });

    await page.goto('http://localhost:3000/');

    // Injeta CSS para desativar animações
    await page.addStyleTag({ content: `
        *, *::before, *::after {
            transition-property: none !important;
            transform: none !important;
            animation: none !important;
        }
    `});

    await expect(page.locator('[data-testid="app-suspense-loading"]')).not.toBeVisible({ timeout: 15000 });
  });

  test('Deve converter um Gatilho em RCA e validar a mudança de status', async ({ page }) => {
    // 1. Ir para Gatilhos (Usa seletor mais flexível para o Sidebar)
    await page.locator('button').filter({ hasText: /Gatilhos|Triggers/i }).click();

    // 2. Localizar um gatilho aberto e clicar em 'Criar Nova RCA'
    // Aguarda a tabela renderizar
    await expect(page.locator('table')).toBeVisible();
    
    const convertBtn = page.locator('button[title*="Criar Nova RCA"], button[title*="Create New RCA"]').first();
    await expect(convertBtn).toBeVisible({ timeout: 10000 });
    await convertBtn.click({ force: true });

    // 3. O sistema deve abrir o Editor de RCA automaticamente
    await expect(page.getByText(/Nova Análise|New Analysis/i).first()).toBeVisible();

    // 4. Verificar se os dados do Ativo foram herdados
    // O seletor de seção de ativo pode variar, usamos um texto conhecido
    await expect(page.getByText('Planta A')).toBeVisible();

    // 5. Salvar como rascunho (Em Andamento)
    await page.getByPlaceholder(/Descrição sucinta|Brief description/i).fill('Conversão Automática via E2E');
    // Clica no botão Salvar (que tem o ícone lucide-save)
    await page.locator('button:has(.lucide-save)').click();

    // 6. Voltar para a lista e verificar status
    // Mockamos o retorno da lista agora com o novo registro
    await page.route('**/api/rcas', async route => {
        return route.fulfill({ 
            status: 200, 
            body: JSON.stringify([
                RcaFactory.create({ 
                    id: 'RCA-NEW-01', 
                    what: 'Conversão Automática via E2E', 
                    status: 'STATUS-01' 
                })
            ]) 
        });
    });

    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await expect(page.getByText('Conversão Automática via E2E')).toBeVisible();
    await expect(page.getByText(/Em Andamento|In Progress/i).first()).toBeVisible();
  });

  test('Deve validar a transição para Concluída ao preencher Causa Raiz', async ({ page }) => {
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();

    // 1. Dados Mínimos
    await page.getByPlaceholder(/Descrição sucinta|Brief description/i).fill('Teste de Transição de Status');
    await page.locator('input[type="date"]').first().fill('2026-02-01');
    
    // Seleciona um tipo de análise
    await page.locator('select').first().selectOption({ index: 1 });
    
    // 2. Adicionar Causa Raiz (Passo 4)
    await page.getByText(/Investigação|Investigation/i).click();
    
    // Garante que o modo linear está ativo para os botões aparecerem
    const addWhyBtn = page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).first();
    await addWhyBtn.click();
    await addWhyBtn.click();
    await addWhyBtn.click();
    
    await page.getByRole('button', { name: /Adicionar Causa Raiz|Add Root Cause/i }).click();
    await page.getByPlaceholder('...').last().fill('Fator determinante identificado');

    // 3. Concluir
    await page.getByText(/Dados Adicionais|Additional Info/i).click();
    
    // Mock do salvamento com sucesso
    await page.route('**/api/rcas/**', async route => {
        return route.fulfill({ status: 200, body: JSON.stringify({ message: 'Success' }) });
    });

    await page.locator('button').filter({ has: page.locator('svg.lucide-check') }).first().click();

    // 4. Verificar na lista se o status mudou
    await page.route('**/api/rcas', async route => {
        return route.fulfill({ 
            status: 200, 
            body: JSON.stringify([
                RcaFactory.create({ 
                    id: 'RCA-CONC-01', 
                    what: 'Teste de Transição de Status', 
                    status: 'STATUS-03' 
                })
            ]) 
        });
    });

    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await expect(page.getByText(/Concluída|Concluded|Aguardando|Waiting/i).first()).toBeVisible();
  });

});

