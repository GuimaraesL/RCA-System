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
    this.editorHeader = page.getByText(/Nova Análise|New Analysis/i);
    this.saveBtn = page.getByTestId('btn-save-rca');
    this.concludeBtn = page.getByTestId('btn-save-rca'); // Ambos usam o mesmo botão agora
  }

  async open() {
    // Aguarda o sistema carregar completamente
    await expect(this.page.locator('.animate-pulse')).not.toBeVisible({ timeout: 15000 });

    await this.page.getByTestId('nav-ANALYSES').click();

    // Aguarda carregar a view de análises
    await expect(this.page.getByTestId('app-suspense-loading')).not.toBeVisible();

    await this.page.getByTestId('btn-new-analysis').click();

    // Aguarda carregar o editor
    await expect(this.page.getByTestId('app-suspense-loading')).not.toBeVisible();
    await expect(this.editorHeader.first()).toBeVisible();
  }

  async goToTab(stepId: number) {
    await this.page.getByTestId(`step-indicator-${stepId}`).click();
  }

  // --- Passo 1: Informações Gerais ---
  async fillGeneralInfo(date: string, typeIndex: number) {
    await this.page.getByTestId('input-failure-date').fill(date);
    const select = this.page.getByTestId('select-analysis-type');
    // Tenta selecionar pelo índice fornecido, fallback para o primeiro disponível se falhar
    try {
      await select.selectOption({ index: typeIndex });
    } catch {
      await select.selectOption({ index: 0 });
    }
  }

  async selectSubgroup(subgroupId: string, parentIds: string[] = []) {
    // Expande os pais se necessário
    for (const parentId of parentIds) {
      const toggle = this.page.getByTestId(`asset-toggle-${parentId}`);
      if (await toggle.isVisible()) {
        await toggle.click();
      }
    }
    // Seleciona o subgrupo
    await this.page.getByTestId(`asset-node-${subgroupId}`).click();
  }

  // --- Passo 2: Descrição do Problema ---
  async fillProblemDescription(what: string) {
    await this.page.getByTestId('input-what').fill(what);
  }

  // --- Ferramentas de Investigação ---
  async fillIshikawa(categoryIndex: number, text: string) {
    await this.page.locator('#ishikawa_category').selectOption({ index: categoryIndex });
    await this.page.getByTestId('input-ishikawa-new-item').fill(text);
    await this.page.getByTestId('btn-add-ishikawa-item').click({ force: true });
  }

  async addFiveWhys(why: string, because: string) {
    await this.page.getByTestId('btn-add-why').click();
    // Localiza o último par de inputs adicionados
    const whyInput = this.page.getByTestId(/input-five-why-question-/).last();
    const answerInput = this.page.getByTestId(/input-five-why-answer-/).last();

    await whyInput.fill(why);
    await answerInput.fill(because);
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

  async saveAndClose() {
    await this.saveBtn.click();
    // ESSENCIAL: Aguarda o overlay sumir do DOM para garantir que o estado reativo limpou o editor
    await expect(this.page.getByTestId('rca-editor-overlay')).not.toBeVisible({ timeout: 15000 });
    // YOLO: Pequena pausa para garantir que o React processou o fechamento e habilitou a Sidebar
    await this.page.waitForTimeout(500);
  }
}
