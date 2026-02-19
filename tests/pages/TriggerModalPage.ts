import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object: TriggerModalPage
 * 
 * Proposta: Encapsular todos os seletores e interações do Modal de Gatilhos.
 * Ações: Abrir, preencher campos, salvar, cancelar e validar erros.
 */
export class TriggerModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly saveBtn: Locator;
  readonly cancelBtn: Locator;
  readonly newTriggerBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.getByTestId('modal-trigger');
    this.saveBtn = page.getByTestId('btn-save-trigger');
    this.cancelBtn = page.getByTestId('btn-cancel-trigger');
    this.newTriggerBtn = page.getByTestId('btn-new-trigger');
  }

  async open() {
    await this.page.keyboard.press('Alt+T'); // Atalho para Gatilhos

    // Aguarda carregar a view de gatilhos (Lazy Loaded)
    await expect(this.page.getByTestId('app-suspense-loading')).not.toBeVisible();

    await this.newTriggerBtn.click();
    await expect(this.modal).toBeVisible();
  }

  async fillDates(start: string, end: string) {
    await this.page.getByTestId('input-trigger-start-date').fill(start);
    await this.page.getByTestId('input-trigger-end-date').fill(end);
  }

  async selectFirstAsset() {
    // Asset selector uses divs, not li
    // Target the first clickable asset node (selectable)
    const assetItem = this.modal.locator('div.border.rounded div.flex.items-center.cursor-pointer').first();
    if (await assetItem.isVisible()) {
      await assetItem.click();
    }
  }

  async fillDetails(type: string, reason: string, responsible: string) {
    await this.page.getByTestId('input-trigger-stop-type').fill(type);
    await this.page.getByTestId('input-trigger-stop-reason').fill(reason);
    await this.page.getByTestId('input-trigger-responsible').fill(responsible);
  }

  async save() {
    await this.saveBtn.click();
  }

  async cancel() {
    // If cancel button is also in footer, we should target it more safely
    // But getByRole('button', { name: 'Cancel' }) usually works if unique or we take first/last
    // Let's use the one in footer if possible, or just click the one visible
    if (await this.page.locator('div.border-t button', { hasText: /Cancelar|Cancel/i }).isVisible()) {
      await this.page.locator('div.border-t button', { hasText: /Cancelar|Cancel/i }).click();
    } else {
      await this.cancelBtn.last().click();
    }
    await expect(this.modal).not.toBeVisible();
  }

  async getValidationErrors() {
    return await this.modal.locator('.border-red-500').evaluateAll(elements =>
      elements.map(el => el.parentElement?.querySelector('label')?.innerText || 'Campo sem label')
    );
  }
}
