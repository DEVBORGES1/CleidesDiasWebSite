import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';

const trim = (v: string | undefined) => (v ?? '').trim().replace(/\/$/, '');

/**
 * Gera o robots.txt a partir das variáveis de ambiente. O sitemap é servido pela API e
 * exposto em `<site>/sitemap.xml` (rewrite do vercel.json; proxy do Vite em desenvolvimento),
 * porque a diretiva `Sitemap:` exige um endereço absoluto.
 */
function robotsTxt(siteUrl: string): Plugin {
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /admin', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
  return {
    name: 'cleides-robots-txt',
    configureServer(server) {
      server.middlewares.use('/robots.txt', (_req, res) => {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(body);
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: body });
    },
  };
}

/**
 * Preenche no index.html o endereço público usado no Open Graph estático
 * (lido por WhatsApp e redes sociais, que não executam JavaScript).
 */
function htmlEnv(siteUrl: string): Plugin {
  return {
    name: 'cleides-html-env',
    transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', siteUrl),
  };
}

/** Em desenvolvimento, `/sitemap.xml` é repassado para a API (como faz o rewrite da Vercel). */
function sitemapProxy(apiUrl: string): Record<string, ProxyOptions> {
  if (!/^https?:\/\//.test(apiUrl)) return {};
  const api = new URL(apiUrl);
  return { '/sitemap.xml': { target: api.origin, changeOrigin: true, rewrite: () => `${api.pathname.replace(/\/$/, '')}/sitemap.xml` } };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = trim(env.VITE_API_URL) || 'http://localhost:4000/api/v1';
  const siteUrl = trim(env.VITE_SITE_URL) || 'http://localhost:5173';
  return {
    plugins: [react(), robotsTxt(siteUrl), htmlEnv(siteUrl)],
    resolve: {
      alias: [
        { find: /^@cleides\/shared\/utils$/, replacement: fileURLToPath(new URL('../shared/src/utils.ts', import.meta.url)) },
        { find: /^@cleides\/shared$/, replacement: fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) },
      ],
    },
    server: { port: 5173, proxy: sitemapProxy(apiUrl) },
    preview: { port: 4173, proxy: sitemapProxy(apiUrl) },
    build: { sourcemap: true, target: 'es2022' },
  };
});
