import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 60000, // Global timeout to handle slower startup
  webServer: {
    command: 'npx vite preview --port 3005 --host 127.0.0.1',
    url: 'http://127.0.0.1:3005',
    reuseExistingServer: true,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://127.0.0.1:3005',
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
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
});