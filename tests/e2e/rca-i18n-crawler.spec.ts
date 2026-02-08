
import { test, expect } from '@playwright/test';
import { pt } from '../../src/i18n/locales/pt';
import { en } from '../../src/i18n/locales/en';
import { TaxonomyFactory, SystemFactory } from '../factories/rcaFactory';

/**
 * RCA System - I18N Advanced Crawler (V4 - Final)
 * 
 * Este teste substitui a validação básica por uma varredura heurística profunda.
 * Detecta:
 * - Hardcoded strings via palavras-chave (Salvar, Novo, etc.)
 * - Vazamentos de caracteres acentuados (ã, õ, ç) em modo EN.
 * - Falta de tradução em Placeholders.
 * 
 * Cobertura: Todos os módulos e todos os passos do Wizard RCA.
 */

test.describe('I18N Advanced Crawler', () => {

  const setupNeutralMocks = async (page) => {
    // Intercepta TODAS as chamadas de API para retornar dados neutros (IDs ou nomes em inglês)
    await page.route('**/api/**', async route => {
      const url = route.request().url();

      if (url.includes('/api/taxonomy')) {
        const taxonomy = TaxonomyFactory.createDefault();
        taxonomy.analysisTypes = taxonomy.analysisTypes.map(t => ({ ...t, name: `TYPE_${t.id}` }));
        taxonomy.analysisStatuses = taxonomy.analysisStatuses.map(s => ({ ...s, name: `STATUS_${s.id}` }));
        taxonomy.specialties = taxonomy.specialties.map(s => ({ ...s, name: `SPEC_${s.id}` }));
        taxonomy.rootCauseMs = taxonomy.rootCauseMs.map(m => ({ ...m, name: `6M_${m.id}` }));
        taxonomy.triggerStatuses = taxonomy.triggerStatuses.map(s => ({ ...s, name: `TRG_STATUS_${s.id}` }));
        return route.fulfill({ status: 200, body: JSON.stringify(taxonomy) });
      }

      if (url.includes('/api/assets')) {
        return route.fulfill({
          status: 200, body: JSON.stringify([
            {
              id: 'AREA-01', name: 'AREA_01', type: 'AREA', children: [
                {
                  id: 'EQUIP-01', name: 'EQUIP_01', type: 'EQUIPMENT', children: [
                    { id: 'SUB-01', name: 'SUBGROUP_01', type: 'SUBGROUP' }
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

  test.beforeEach(async ({ page }) => {
    await setupNeutralMocks(page);
    await page.goto('http://localhost:3000/');
    const loader = page.getByTestId('app-suspense-loading');
    if (await loader.isVisible()) await expect(loader).not.toBeVisible({ timeout: 15000 });
  });

  const checkLeaks = async (page, moduleName: string) => {
    // Foca apenas no conteúdo principal para evitar duplicidade com a Sidebar
    const mainText = await page.locator('main').innerText();

    const ptKeywords = [
      'Salvar', 'Cancelar', 'Excluir', 'Editar', 'Novo', 'Adicionar',
      'Próximo', 'Anterior', 'Descrição', 'Responsável', 'Causa Raiz',
      'Modo de Falha', 'Equipamento', 'Área', 'Subgrupo'
    ];

    const foundKeywords = ptKeywords.filter(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(mainText);
    });

    const ptAccentsRegex = /[ãõç]/i;
    const accentLeaks = ptAccentsRegex.test(mainText)
      ? mainText.match(/[a-zA-Z\u00C0-\u00FF]*[ãõç][a-zA-Z\u00C0-\u00FF]*/gi)
      : [];

    const placeholders = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select'))
        .map(el => (el as HTMLInputElement).placeholder)
        .filter(p => p && p.length > 0);
    });
    const placeholderLeaks = placeholders.filter(p => ptAccentsRegex.test(p));

    const allLeaks = [...new Set([...foundKeywords, ...(accentLeaks || []), ...placeholderLeaks])];

    if (allLeaks.length > 0) {
      console.warn(`[I18N REPORT] ${moduleName}: Encontrados possíveis vazamentos: ${allLeaks.join(', ')}`);
    }

    // Nota: Deixamos o expect para falhar o CI se houver vazamento.
    expect(allLeaks, `Vazamentos de I18N detectados em ${moduleName}: ${allLeaks.join(', ')}`).toHaveLength(0);
  };

  test('Deve percorrer todos os módulos principais em EN', async ({ page }) => {
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
        await checkLeaks(page, mod.label);
      });
    }
  });

  test('Deve percorrer todos os 7 passos do Wizard RCA em EN', async ({ page }) => {
    await page.getByRole('button', { name: 'EN' }).click();
    await page.getByRole('button', { name: en.sidebar.analyses }).click();
    await page.getByRole('button', { name: en.analysesPage.newButton }).click();
    await page.waitForTimeout(1000);

    // Seleção de Ativo (Necessário para evitar erros de validação)
    // Expandir a árvore primeiro se necessário
    const areaNode = page.locator('text=AREA_01');
    if (await areaNode.isVisible()) {
      await areaNode.click();
    }

    await page.waitForSelector('text=SUBGROUP_01');
    await page.getByText('SUBGROUP_01').click();

    for (let i = 1; i <= 7; i++) {
      await test.step(`Wizard Step ${i}`, async () => {
        await checkLeaks(page, `Wizard Step ${i}`);

        if (i < 7) {
          // Preenchimento mínimo para habilitar botões (se necessário)
          if (i === 4) {
            for (let j = 0; j < 3; j++) {
              await page.getByRole('button', { name: en.wizard.add }).first().click();
              await page.locator(`id=five_whys_${j}_answer`).fill('Test reason');
            }
            await page.getByRole('button', { name: en.wizard.step4.addRootCause }).click();
            await page.locator('select[id^="root_cause_"]').first().selectOption('6M_M1');
          }

          await page.getByRole('button', { name: en.pagination.next }).click();
          await page.waitForTimeout(400);
        }
      });
    }
  });

});
