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
    this.modal = page.locator('div.fixed.inset-0.z-50');
    this.saveBtn = page.getByRole('button', { name: /Salvar Gatilho|Save Trigger/i });
    this.cancelBtn = page.getByRole('button', { name: /Cancelar|Cancel/i });
    this.newTriggerBtn = page.getByRole('button', { name: /Novo Gatilho|New Trigger/i });
  }

  async open() {
    await this.page.getByRole('button', { name: /Gatilhos|Triggers/i }).click();
    await this.newTriggerBtn.click();
    await expect(this.modal).toBeVisible();
  }

  async fillDates(start: string, end: string) {
    await this.modal.locator('input[type="datetime-local"]').first().fill(start);
    await this.modal.locator('input[type="datetime-local"]').nth(1).fill(end);
  }

  async selectFirstAsset() {
    const assetItem = this.modal.locator('div.border.rounded li').first();
    if (await assetItem.isVisible()) {
      await assetItem.click();
    }
  }

  async fillDetails(type: string, reason: string, responsible: string) {
    const textInputs = this.modal.locator('input[type="text"]');
    await textInputs.nth(0).fill(type);
    await textInputs.nth(1).fill(reason);
    await textInputs.nth(2).fill(responsible);
  }

  async save() {
    await this.saveBtn.click();
  }

  async cancel() {
    await this.cancelBtn.click();
    await expect(this.modal).not.toBeVisible();
  }

  async getValidationErrors() {
    return await this.modal.locator('.border-red-500').evaluateAll(elements => 
      elements.map(el => el.parentElement?.querySelector('label')?.innerText || 'Campo sem label')
    );
  }
}
