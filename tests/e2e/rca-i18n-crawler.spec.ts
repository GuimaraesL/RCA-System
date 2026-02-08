import { test, expect } from '@playwright/test';
import { en } from '../../src/i18n/locales/en';
import { pt } from '../../src/i18n/locales/pt';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

/**
 * RCA System - I18N Advanced Crawler (V8 - Full Coverage & Enforcement)
 * 
 * Este teste é o guardião final da internacionalização.
 * Ele detecta:
 * 1. Chaves brutas (ex: checklists.precision.chk_clean)
 * 2. Sentenças em Português remanescentes.
 * 3. Vazamento de acentos em qualquer lugar da UI.
 */

test.describe('I18N Guardião - Varredura Profunda', () => {

  const setupNeutralMocks = async (page) => {
    await page.route('**/api/**', async route => {
      const url = route.request().url();
      if (url.includes('/api/taxonomy')) {
        const taxonomy = TaxonomyFactory.createDefault();
        taxonomy.analysisTypes = taxonomy.analysisTypes.map(t => ({ ...t, name: `TYPE_${t.id}` }));
        taxonomy.analysisStatuses = taxonomy.analysisStatuses.map(s => ({ ...s, name: `STATUS_${s.id}` }));
        taxonomy.specialties = taxonomy.specialties.map(s => ({ ...s, name: `SPEC_${s.id}` }));
        taxonomy.rootCauseMs = taxonomy.rootCauseMs.map(m => ({ ...m, name: `6M_${m.id}` }));
        taxonomy.triggerStatuses = taxonomy.triggerStatuses.map(s => ({ ...s, name: `TRG_STATUS_${s.id}` }));
        taxonomy.componentTypes = taxonomy.componentTypes.map(c => ({ ...c, name: `COMP_${c.id}` }));
        taxonomy.failureModes = taxonomy.failureModes.map(f => ({ ...f, name: `MODE_${f.id}` }));
        taxonomy.failureCategories = taxonomy.failureCategories.map(c => ({ ...c, name: `CAT_${c.id}` }));
        return route.fulfill({ status: 200, body: JSON.stringify(taxonomy) });
      }
      if (url.includes('/api/assets')) {
        return route.fulfill({
          status: 200, body: JSON.stringify([
            {
              id: 'A1', name: 'AREA_01', type: 'AREA', children: [
                {
                  id: 'E1', name: 'EQUIP_01', type: 'EQUIPMENT', children: [
                    { id: 'S1', name: 'SUBGROUP_01', type: 'SUBGROUP' }
                  ]
                }
              ]
            }
          ])
        });
      }
      if (url.includes('/api/health')) return route.fulfill({ status: 200, body: JSON.stringify(SystemFactory.health()) });
      return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
  };

  const checkLeaks = async (page, context: string) => {
    const mainText = await page.innerText('main');
    const leaks = [];

    // A) Procura Chaves Brutas (ex: checklists.precision.chk_clean)
    const rawKeyRegex = /[a-z0-9_]+\.[a-z0-9_]+\.[a-z0-9_]+/gi;
    const foundKeys = mainText.match(rawKeyRegex) || [];
    leaks.push(...foundKeys);

    // B) Procura Acentos PT-BR
    const ptAccentsRegex = /[áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/;
    if (ptAccentsRegex.test(mainText)) {
      const matches = mainText.match(/[a-zA-Z\u00C0-\u00FF]*[áéíóúàèìòùâêîôûãõç][a-zA-Z\u00C0-\u00FF]*/gi);
      if (matches) leaks.push(...matches.map(m => `ACCENT: ${m}`));
    }

    // C) Procura Palavras Hardcoded (Exclui falsos positivos como 'Data')
    const ptForbidden = ['Salvar', 'Cancelar', 'Excluir', 'Editar', 'Novo', 'Ação', 'Gatilho'];
    for (const word of ptForbidden) {
      if (new RegExp(`\\b${word}\\b`, 'i').test(mainText)) leaks.push(`HARDCODED: ${word}`);
    }

    if (leaks.length > 0) {
      console.warn(`[I18N FAILED] ${context}: ${leaks.join(', ')}`);
    }
    expect(leaks, `Vazamentos em ${context}`).toHaveLength(0);
  };

  test('Deve validar Checklist e HRA exaustivamente', async ({ page }) => {
    await setupNeutralMocks(page);
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'EN' }).click();
    await page.getByRole('button', { name: en.sidebar.analyses }).click();
    await page.getByRole('button', { name: en.analysesPage.newButton }).click();

    // Passo 1: Ativo
    await page.getByText('AREA_01').click();
    await page.getByText('EQUIP_01').click();
    await page.getByText('SUBGROUP_01').click();

    // 1. Validar Passo 6 (Checklist)
    await page.locator('div:has-text("6")').last().click();
    await page.waitForTimeout(500);
    await checkLeaks(page, 'Step 6 - Checklist');

    // 2. Validar Passo 8 (HRA) - Actually Step 4 (Investigation) + HRA check
    // We are on Step 6. Let's go back 2 times to reach Step 4.
    await page.getByRole('button', { name: 'Previous' }).click();
    await page.getByRole('button', { name: 'Previous' }).click();
    await page.waitForTimeout(500);

    // Verify we are truly on Step 4 by checking for unique content
    await expect(page.getByText(/5 Whys/i).first()).toBeVisible();

    // Check for either "Add" (initial state) or "Add Why" (populated state) using a broad selector
    const addBtn = page.getByRole('button').filter({ hasText: /Add/i }).first();
    await addBtn.click();

    await page.locator('input[id*="answer"]').first().fill('Neutral');
    await page.getByRole('button', { name: /Add|Add Why/i }).first().click();
    await page.locator('input[id*="answer"]').nth(1).fill('Neutral');
    await page.getByRole('button', { name: /Add|Add Why/i }).first().click();
    await page.locator('input[id*="answer"]').nth(2).fill('Neutral');

    await page.getByRole('button', { name: /Add Root Cause/i }).click();
    await page.locator('select[id*="root_cause"]').first().selectOption('M2'); // M2 = Method

    const hraBtn = page.getByRole('button', { name: /Human Reliability|HRA/i });
    await expect(hraBtn).toBeVisible();
    await hraBtn.click();
    await page.waitForTimeout(500);
    await checkLeaks(page, 'Step 8 - HRA');
  });

  test('Deve varrer módulos laterais', async ({ page }) => {
    await setupNeutralMocks(page);
    await page.goto('http://localhost:3000/');
    await page.getByRole('button', { name: 'EN' }).click();

    const mods = [en.sidebar.settings, en.sidebar.migration, en.sidebar.assets];
    for (const mod of mods) {
      await page.getByRole('button', { name: mod }).click();
      await page.waitForTimeout(300);
      await checkLeaks(page, `Module ${mod}`);
    }
  });

});