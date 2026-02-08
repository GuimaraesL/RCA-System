import { test, expect } from '@playwright/test';
import { en } from '../../src/i18n/locales/en';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

/**
 * RCA System - I18N Advanced Crawler (V6 - Final Fix)
 * 
 * Este teste agora:
 * 1. Expande a árvore de ativos corretamente.
 * 2. Usa uma regex de acentos completa (áéíóú...).
 * 3. Detecta chaves de tradução não processadas (ex: checklists.precision...).
 * 4. Garante a navegação até o Passo 6.
 */

test.describe('I18N Advanced Crawler - Step 6 Focus', () => {

  const setupNeutralMocks = async (page) => {
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      
      if (url.includes('/api/taxonomy')) {
        const taxonomy = TaxonomyFactory.createDefault();
        taxonomy.analysisTypes = taxonomy.analysisTypes.map(t => ({ ...t, name: `TYPE_${t.id}` }));
        taxonomy.analysisStatuses = taxonomy.analysisStatuses.map(s => ({ ...s, name: `STATUS_${s.id}` }));
        taxonomy.specialties = taxonomy.specialties.map(s => ({ ...s, name: `SPEC_${s.id}` }));
        taxonomy.rootCauseMs = taxonomy.rootCauseMs.map(m => ({ ...m, name: `6M_${m.id}` }));
        return route.fulfill({ status: 200, body: JSON.stringify(taxonomy) });
      }

      if (url.includes('/api/assets')) {
         return route.fulfill({ status: 200, body: JSON.stringify([
            { id: 'AREA-01', name: 'AREA_01', type: 'AREA', children: [
                { id: 'EQUIP-01', name: 'EQUIP_01', type: 'EQUIPMENT', children: [
                    { id: 'SUB-01', name: 'SUBGROUP_01', type: 'SUBGROUP' }
                ]}
            ]}
         ])});
      }

      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
  };

  test('Deve encontrar vazamentos no Passo 6 (Checklist)', async ({ page }) => {
    await setupNeutralMocks(page);
    await page.goto('http://localhost:3000/');
    
    // 1. Inglês
    await page.getByRole('button', { name: 'EN' }).click();
    
    // 2. Abrir Editor
    await page.getByRole('button', { name: en.sidebar.analyses }).click();
    await page.getByRole('button', { name: en.analysesPage.newButton }).click();
    
    // 3. Selecionar Ativo (EXPANDINDO A ÁRVORE)
    await page.getByText('AREA_01').click();
    await page.getByText('EQUIP_01').click();
    await page.getByText('SUBGROUP_01').click();

    // 4. Navegar para o Passo 6
    // Usamos o seletor do indicador de passo
    await page.locator('div:has-text("6")').last().click();
    await page.waitForTimeout(800);

    // 5. Captura o conteúdo da tabela
    const step6Table = page.locator('main table');
    await expect(step6Table).toBeVisible();
    const tableText = await step6Table.innerText();

    // 6. DETECÇÃO DE VAZAMENTOS
    
    // A) Acentos (á, é, í, ó, ú, ã, õ, ç, etc.)
    const ptAccentsRegex = /[áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/;
    const accentLeaks = tableText.match(/[a-zA-Z\u00C0-\u00FF]*[áéíóúàèìòùâêîôûãõç][a-zA-Z\u00C0-\u00FF]*/gi) || [];

    // B) Chaves de tradução (ex: checklists.precision.chk_clean)
    const rawKeyRegex = /[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+/g;
    const rawKeyLeaks = tableText.match(rawKeyRegex) || [];

    // C) Palavras-Chave hardcoded
    const ptKeywords = ['Atividade', 'Executado', 'Não Executado', 'Comentário', 'Salvar', 'Cancelar'];
    const keywordLeaks = ptKeywords.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(tableText));

    const allLeaks = [...new Set([...accentLeaks, ...rawKeyLeaks, ...keywordLeaks])];

    if (allLeaks.length > 0) {
        console.log('--- VAZAMENTOS DETECTADOS NO PASSO 6 ---');
        console.log(allLeaks);
        console.log('-----------------------------------------');
    }

    expect(allLeaks, `Vazamentos de I18N detectados no Passo 6: ${allLeaks.join(', ')}`).toHaveLength(0);
  });

  test('Varredura completa de todos os módulos', async ({ page }) => {
    await setupNeutralMocks(page);
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'EN' }).click();

    const modules = [
        { name: en.sidebar.dashboard, label: 'Dashboard' },
        { name: en.sidebar.triggers, label: 'Triggers' },
        { name: en.sidebar.analyses, label: 'Analyses' },
        { name: en.sidebar.actions, label: 'Action Plans' },
        { name: en.sidebar.assets, label: 'Assets' },
        { name: en.sidebar.settings, label: 'Settings' },
        { name: en.sidebar.migration, label: 'Migration' }
    ];

    for (const mod of modules) {
        await test.step(`Módulo: ${mod.label}`, async () => {
            await page.getByRole('button', { name: mod.name }).click();
            await page.waitForTimeout(500);
            
            const mainText = await page.locator('main').innerText();
            const ptAccentsRegex = /[áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/;
            const hasLeaks = ptAccentsRegex.test(mainText) || /[a-z]+\.[a-z]+\.[a-z]+/.test(mainText);
            
            if (hasLeaks) {
                const leaks = mainText.match(/[a-zA-Z\u00C0-\u00FF]*[áéíóúàèìòùâêîôûãõç][a-zA-Z\u00C0-\u00FF]*/gi) || [];
                const keys = mainText.match(/[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+/g) || [];
                expect([...leaks, ...keys], `Leaks in ${mod.label}`).toHaveLength(0);
            }
        });
    }
  });

});