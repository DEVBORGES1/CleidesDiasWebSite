import { faqListQuerySchema, galleryListQuerySchema } from '@cleides/shared';
import type { Request, Response } from 'express';
import { ok } from '../lib/http.js';
import { parse } from '../lib/validation.js';
import type { Services } from '../services/index.js';

/** Endpoints públicos: retornam apenas conteúdo publicado. */
export function publicController(s: Services, siteUrl: string) {
  return {
    site: async (_req: Request, res: Response) => ok(res, await s.site.getSite(false)),
    settings: async (_req: Request, res: Response) => ok(res, await s.settings.get()),
    packages: async (_req: Request, res: Response) => ok(res, await s.packages.listPublished()),
    packageDetail: async (req: Request, res: Response) => ok(res, await s.packages.getPublished(String(req.params.idOrSlug))),
    gallery: async (req: Request, res: Response) => {
      const query = parse(galleryListQuerySchema, req.query);
      const { items, meta } = await s.gallery.page(query, true);
      ok(res, items, meta);
    },
    galleryCategories: async (_req: Request, res: Response) => ok(res, await s.gallery.categories(true)),
    faq: async (req: Request, res: Response) => ok(res, await s.faq.list(parse(faqListQuerySchema, req.query), true)),
    howItWorks: async (_req: Request, res: Response) =>
      ok(res, { section: await s.sections.get('how'), steps: await s.steps.list(true) }),
    about: async (_req: Request, res: Response) => ok(res, await s.sections.get('about')),
    sitemap: async (_req: Request, res: Response) => {
      const base = siteUrl.replace(/\/$/, '');
      const packages = await s.packages.listPublished();
      const urls = [
        { loc: `${base}/`, priority: '1.0' },
        ...packages.map((p) => ({ loc: `${base}/pacotes/${p.slug}`, priority: '0.8', lastmod: p.updatedAt.slice(0, 10) })),
        { loc: `${base}/privacidade`, priority: '0.2' },
      ];
      const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        urls
          .map(
            (u) =>
              `  <url><loc>${escapeXml(u.loc)}</loc>${'lastmod' in u && u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`,
          )
          .join('\n') +
        '\n</urlset>\n';
      res.type('application/xml').send(xml);
    },
  };
}

function escapeXml(v: string): string {
  return v.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c);
}
