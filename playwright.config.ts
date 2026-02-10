import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    launchOptions: {
      args: ['--disable-web-security']
    },
    /* Injeta flag para desativar animações no app */
    contextOptions: {
      /* Script injetado em cada nova página antes do carregamento do JS do app */
      permissions: ['clipboard-read', 'clipboard-write'],
    }
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
      },
    },
  ],
});