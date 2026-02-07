import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object: RcaEditorPage
 * 
 * Proposta: Encapsular a lógica complexa do Editor de RCA (Múltiplas Abas e Ferramentas).
 * Ações: Navegação entre abas, preenchimento de Ishikawa, 5 Whys e HRA.
 */
export class RcaEditorPage {
  readonly page: Page;
  readonly editorHeader: Locator;
  readonly saveBtn: Locator;
  readonly concludeBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editorHeader = page.getByRole('heading', { name: /Nova Análise|New Analysis/i });
    this.saveBtn = page.locator('button').filter({ has: page.locator('svg.lucide-save') });
    this.concludeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-check') });
  }

  async open() {
    await this.page.getByRole('button', { name: /Análises|Analyses/i }).click();
    await this.page.getByRole('button', { name: /Nova Análise|New Analysis/i }).click();
    await expect(this.editorHeader).toBeVisible();
  }

  async goToTab(tabName: string | RegExp) {
    await this.page.getByText(tabName).click();
  }

  // --- Ferramentas de Investigação ---
  async fillIshikawa(categoryIndex: number, text: string) {
    await this.page.locator('select').nth(0).selectOption({ index: categoryIndex });
    await this.page.getByPlaceholder('...').first().fill(text);
    await this.page.getByRole('button', { name: /Adicionar|Add/i }).first().click();
  }

  async addFiveWhys(why: string, because: string) {
    await this.page.getByRole('button', { name: /Adicionar Porquê|Add Why/i }).click();
    const rows = this.page.locator('div.group.flex.items-start');
    await rows.last().locator('input').first().fill(why);
    await rows.last().locator('input').last().fill(because);
  }

  async fillHRAQuestion(index: number, answer: 'YES' | 'NO', comment: string) {
    const row = this.page.locator('tbody tr').nth(index);
    const btnClass = answer === 'YES' ? 'svg.lucide-square' : 'svg.lucide-square'; // Ajustado conforme DOM observado
    await row.locator('button').first().click(); // Assume YES é o primeiro botão
    await row.locator('input[type="text"]').fill(comment);
  }

  async takeSnapshot(name: string) {
    await expect(this.page).toHaveScreenshot(`${name}.png`);
  }
}
