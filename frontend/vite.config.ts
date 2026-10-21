import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Connect, type Plugin, type ProxyOptions } from 'vite';

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

/**
 * Card de compartilhamento: o WhatsApp recebe a versão quadrada (logo e slogan), porque a
 * miniatura dele corta a imagem num quadrado central; as demais redes recebem o card largo.
 * Na Vercel isso é feito pelos rewrites do vercel.json; aqui, em desenvolvimento e no preview.
 */
function shareCard(): Plugin {
  const pick: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.url?.split('?')[0] === '/images/og-card.jpg') {
      req.url = /whatsapp/i.test(req.headers['user-agent'] ?? '') ? '/images/og-whatsapp.jpg' : '/images/og-capa.jpg';
    }
    next();
  };
  return {
    name: 'cleides-share-card',
    configureServer: (server) => void server.middlewares.use(pick),
    configurePreviewServer: (server) => void server.middlewares.use(pick),
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
    plugins: [react(), robotsTxt(siteUrl), htmlEnv(siteUrl), shareCard()],
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
