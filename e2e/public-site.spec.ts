import { expect, test } from '@playwright/test';

test.describe('site público', () => {
  test('carrega o conteúdo vindo da API com SEO básico', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Registre a magia/ })).toBeVisible();
    await expect(page).toHaveTitle(/Cleides Dias/);
    await expect(page.getByRole('heading', { name: 'Nossos pacotes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mini Natal' })).toBeVisible();
    await expect(page.getByText('Mais escolhido')).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Videira/);
  });

  test('abre os detalhes do pacote com URL própria e botão do WhatsApp', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Ver detalhes do pacote Natal Completo/ }).click();
    await expect(page).toHaveURL(/\/pacotes\/natal-completo$/);
    const dialog = page.getByRole('dialog', { name: 'Natal Completo' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Quero este pacote/ })).toHaveAttribute('href', /wa\.me\/5549999569245\?text=.*Natal%20Completo/);
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/pacotes/experiencia-familia');
    await expect(page.getByRole('dialog', { name: 'Experiência Família' })).toBeVisible();
  });

  test('perguntas frequentes em acordeão acessível', async ({ page }) => {
    await page.goto('/');
    const q = page.getByRole('button', { name: 'Quais roupas são recomendadas?' });
    await expect(q).toHaveAttribute('aria-expanded', 'false');
    await q.click();
    await expect(q).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText(/Tons claros e neutros/)).toBeVisible();
  });

  test('menu do celular e navegação inferior', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Navegação rápida' })).toBeVisible();
    await page.getByRole('button', { name: 'Abrir menu' }).click();
    const menu = page.getByRole('dialog', { name: 'Menu' });
    await expect(menu.getByRole('link', { name: 'Sobre a Cleides' })).toBeVisible();
    await menu.getByRole('button', { name: 'Fechar menu' }).click();
    await expect(menu).toBeHidden();
  });

  test('página de privacidade e página inexistente', async ({ page }) => {
    await page.goto('/privacidade');
    await expect(page.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeVisible();
    await page.goto('/pagina-que-nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await page.goto('/pacotes/pacote-que-nao-existe');
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  });

  test('robots.txt aponta o sitemap gerado pela API', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    const sitemapUrl = /Sitemap: (.+)/.exec(robots)?.[1];
    expect(sitemapUrl).toBeTruthy();
    const sitemap = await (await request.get(sitemapUrl!)).text();
    expect(sitemap).toContain('/pacotes/mini-natal');
  });
});
