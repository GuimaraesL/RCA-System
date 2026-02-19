import { test, expect } from '@playwright/test';

test('Smoke Test - App Render', async ({ page }) => {
  // Mock mínimo para garantir que não é rede
  await page.route('**/api/health', route => route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) }));

  // Tenta carregar a página
  console.log('Navegando para /...');
  await page.goto('/');

  console.log('Aguardando app-ready...');
  try {
    await page.getByTestId('app-ready').waitFor({ timeout: 15000 });
    console.log('App Ready encontrado!');
  } catch (e) {
    console.log('App Ready NÃO encontrado. Dumpando HTML...');
    const content = await page.content();
    console.log(content);
    throw e;
  }
});
