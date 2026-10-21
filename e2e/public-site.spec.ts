import { expect, test } from '@playwright/test';
import { WEB_URL } from './helpers';

test.describe('site público', () => {
  test('carrega o conteúdo vindo da API com SEO básico', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Registre a magia/ })).toBeVisible();
    await expect(page).toHaveTitle(/Cleides Dias/);
    await expect(page.getByRole('heading', { name: 'Nossos pacotes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mini Natal' })).toBeVisible();
    await expect(page.getByText('Mais escolhido')).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Videira/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${WEB_URL}/`);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(ld).toMatchObject({ '@type': 'ProfessionalService', address: { addressLocality: 'Videira', addressCountry: 'BR' } });
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
    // Ao voltar, os efeitos de rolagem da página inicial precisam ser ativados.
    await page.getByRole('link', { name: 'Voltar ao início' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-reveal]').last()).toHaveCSS('opacity', '0');
  });

  test('robots.txt aponta o sitemap gerado pela API, com endereço absoluto', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
    const sitemapUrl = /Sitemap: (.+)/.exec(robots)?.[1];
    expect(sitemapUrl).toBe(`${WEB_URL}/sitemap.xml`);
    const res = await request.get(sitemapUrl!);
    expect(res.headers()['content-type']).toContain('application/xml');
    const sitemap = await res.text();
    expect(sitemap).toContain('/pacotes/mini-natal');
    expect(sitemap).not.toContain('/admin');
  });

  test('metadados de compartilhamento existem no HTML sem JavaScript', async ({ request }) => {
    const html = await (await request.get('/')).text();
    expect(html).toContain(`<meta property="og:image" content="${WEB_URL}/images/og-capa.jpg"`);
    expect(html).toContain('<link rel="apple-touch-icon"');
    expect((await request.get('/images/og-capa.jpg')).headers()['content-type']).toContain('image/jpeg');
  });
});
