import { test, expect } from '@playwright/test';

/**
 * Teste: full-app-flow.spec.ts
 * 
 * Proposta: Validar a jornada crítica do usuário utilizando o BACKEND REAL (Teste de Fumaça/Integração).
 * Ações: Criação de ativos, navegação por menus e verificação de integridade visual.
 * Execução: Playwright E2E contra banco de dados real.
 * Fluxo: 1. Health Check -> 2. Criação de Hierarquia de Ativos -> 3. Validação de Dashboard -> 4. Verificação de Configurações.
 */

test.describe('RCA System - Validação de Fluxo Completo (Integração)', () => {

  const timestamp = Date.now();
  const areaName = `AREA_REAL_${timestamp}`;

  test.beforeEach(async ({ page }) => {
    // Monitoramento conforme BASE DE CONHECIMENTO
    page.on('pageerror', err => console.log(`ERRO DE PÁGINA: ${err.message}`));
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[CONSOLE ERROR]: ${msg.text()}`);
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Aguarda o fim do carregamento do Suspense (Lazy Loading)
    const loader = page.getByTestId('app-suspense-loading');
    if (await loader.isVisible()) {
      await expect(loader).not.toBeVisible({ timeout: 20000 });
    }
    
    // Garante que o menu lateral carregou
    await expect(page.locator('aside')).toBeVisible({ timeout: 10000 });
  });

  test('Deve realizar o Health Check do ambiente real', async ({ page }) => {
    // Verifica se o título principal está visível
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    
    // Tenta abrir o editor para validar se a taxonomia real carregou
    await page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
    
    // Aguarda o editor carregar
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();
    const taxonomyCheck = page.locator('select').first();
    await expect(taxonomyCheck).toBeVisible({ timeout: 15000 });
  });

  test('Caminho Crítico: Gestão de Ativos e Dashboard', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Navegar para Ativos via Sidebar
    await page.getByRole('button', { name: /Ativos|Assets/i }).click();
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();

    // 2. Criar nova Área
    const addBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first();
    await addBtn.click();
    
    await page.getByPlaceholder(/Laminador|Rolling|Nome do Ativo/i).fill(areaName);
    await page.getByRole('button', { name: /Salvar|Save/i }).click();

    // 3. Validar se apareceu na lista (timeout estendido para backend real)
    await expect(page.getByText(areaName)).toBeVisible({ timeout: 15000 });

    // 4. Dashboard e Gráficos
    await page.getByRole('button', { name: /Dashboard/i }).click();
    await expect(page.getByTestId('app-suspense-loading')).not.toBeVisible();
    
    // Verifica se os cards de KPI renderizaram
    const kpiCards = page.locator('.bg-white.p-6.rounded-2xl');
    await expect(kpiCards.first()).toBeVisible({ timeout: 15000 });
  });

  test('Integridade de UI: Configurações e Migração', async ({ page }) => {
    // Configurações
    await page.getByRole('button', { name: /Configurações|Settings/i }).click();
    await expect(page.getByText(/Tipos de Análise|Analysis Types/i).first()).toBeVisible();

    // Migração
    await page.getByRole('button', { name: /Migração|Migration/i }).click();
    await expect(page.getByText(/Backup|Restore/i).first()).toBeVisible();
  });

});