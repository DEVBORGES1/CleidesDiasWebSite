import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Gera o robots.txt a partir das variáveis de ambiente (o sitemap é servido pela API). */
function robotsTxt(apiUrl: string): Plugin {
  const body = ['User-agent: *', 'Allow: /', 'Disallow: /admin', `Sitemap: ${apiUrl.replace(/\/$/, '')}/sitemap.xml`, ''].join('\n');
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), robotsTxt(env.VITE_API_URL || 'http://localhost:4000/api/v1')],
    resolve: {
      alias: {
        '@cleides/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      },
    },
    server: { port: 5173 },
    preview: { port: 4173 },
    build: { sourcemap: true, target: 'es2022' },
  };
});
