import { defineConfig, devices } from '@playwright/test';

const WEB_URL = `http://localhost:${process.env.WEB_PORT ?? 5173}`;

/**
 * Testes ponta a ponta: sobem a API (dados em memória), o frontend e os
 * serviços simulados de Supabase Auth e Cloudinary (e2e/start-stack.sh).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    locale: 'pt-BR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: 'bash e2e/start-stack.sh',
    url: WEB_URL,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
