import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';

export const ADMIN = { email: 'cleides@example.com', password: 'senha-segura-123' };
export const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

export async function login(page: Page) {
  await page.goto('/admin/entrar');
  await page.getByLabel('E-mail').fill(ADMIN.email);
  await page.getByLabel('Senha').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByText('Site no ar').waitFor();
}
