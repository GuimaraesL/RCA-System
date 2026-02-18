import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  timeout: 60000, // Global timeout to handle slower startup
  webServer: {
    command: 'npm run preview -- --port 3005',
    url: 'http://localhost:3005',
    reuseExistingServer: false,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  use: {
    baseURL: 'http://localhost:3005',
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