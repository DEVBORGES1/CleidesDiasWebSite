import {
  faqListQuerySchema,
  galleryListQuerySchema,
  idParamsSchema,
  packageListQuerySchema,
  reorderSchema,
  uploadConfirmSchema,
  uploadSignatureSchema,
} from '@cleides/shared';
import type { Request, Response } from 'express';
import { created, noContent, ok } from '../lib/http.js';
import { parse } from '../lib/validation.js';
import { currentAdmin } from '../middlewares/auth.js';
import type { Services } from '../services/index.js';

const idOf = (req: Request) => parse(idParamsSchema, req.params).id;
const idsOf = (req: Request) => parse(reorderSchema, req.body).ids;

/** Endpoints do painel. Todas as rotas passam antes por `requireAdmin`. */
export function adminController(s: Services) {
  return {
    me: (_req: Request, res: Response) => ok(res, currentAdmin(res)),
    dashboard: async (_req: Request, res: Response) => ok(res, await s.site.dashboard()),
    seedDemo: async (_req: Request, res: Response) => ok(res, await s.site.seedDemo()),
    preview: async (_req: Request, res: Response) => ok(res, await s.site.getSite(true)),

    packages: {
      list: async (req: Request, res: Response) => ok(res, await s.packages.list(parse(packageListQuerySchema, req.query).status)),
      get: async (req: Request, res: Response) => ok(res, await s.packages.get(idOf(req))),
      create: async (req: Request, res: Response) => created(res, await s.packages.create(req.body)),
      update: async (req: Request, res: Response) => ok(res, await s.packages.update(idOf(req), req.body)),
      remove: async (req: Request, res: Response) => {
        await s.packages.remove(idOf(req));
        noContent(res);
      },
      duplicate: async (req: Request, res: Response) => created(res, await s.packages.duplicate(idOf(req))),
      publish: async (req: Request, res: Response) => ok(res, await s.packages.setStatus(idOf(req), 'published')),
      unpublish: async (req: Request, res: Response) => ok(res, await s.packages.setStatus(idOf(req), 'draft')),
      reorder: async (req: Request, res: Response) => ok(res, await s.packages.reorder(idsOf(req))),
    },

    gallery: {
      list: async (req: Request, res: Response) => {
        const { items, meta } = await s.gallery.page(parse(galleryListQuerySchema, req.query), false);
        ok(res, items, meta);
      },
      categories: async (_req: Request, res: Response) => ok(res, await s.gallery.categories(false)),
      get: async (req: Request, res: Response) => ok(res, await s.gallery.get(idOf(req))),
      create: async (req: Request, res: Response) => created(res, await s.gallery.create(req.body)),
      update: async (req: Request, res: Response) => ok(res, await s.gallery.update(idOf(req), req.body)),
      remove: async (req: Request, res: Response) => {
        await s.gallery.remove(idOf(req));
        noContent(res);
      },
      setStatus: async (req: Request, res: Response) => ok(res, await s.gallery.setStatusMany(req.body)),
      reorder: async (req: Request, res: Response) => ok(res, await s.gallery.reorder(idsOf(req))),
      setCover: async (req: Request, res: Response) => ok(res, await s.gallery.setAsCover(idOf(req), currentAdmin(res).id)),
    },

    faq: {
      list: async (req: Request, res: Response) => ok(res, await s.faq.list(parse(faqListQuerySchema, req.query))),
      get: async (req: Request, res: Response) => ok(res, await s.faq.get(idOf(req))),
      create: async (req: Request, res: Response) => created(res, await s.faq.create(req.body)),
      update: async (req: Request, res: Response) => ok(res, await s.faq.update(idOf(req), req.body)),
      remove: async (req: Request, res: Response) => {
        await s.faq.remove(idOf(req));
        noContent(res);
      },
      reorder: async (req: Request, res: Response) => ok(res, await s.faq.reorder(idsOf(req))),
    },

    steps: {
      list: async (_req: Request, res: Response) => ok(res, await s.steps.list()),
      get: async (req: Request, res: Response) => ok(res, await s.steps.get(idOf(req))),
      create: async (req: Request, res: Response) => created(res, await s.steps.create(req.body)),
      update: async (req: Request, res: Response) => ok(res, await s.steps.update(idOf(req), req.body)),
      remove: async (req: Request, res: Response) => {
        await s.steps.remove(idOf(req));
        noContent(res);
      },
      duplicate: async (req: Request, res: Response) => created(res, await s.steps.duplicate(idOf(req))),
      reorder: async (req: Request, res: Response) => ok(res, await s.steps.reorder(idsOf(req))),
    },

    lots: {
      list: async (_req: Request, res: Response) => ok(res, await s.lots.list()),
      get: async (req: Request, res: Response) => ok(res, await s.lots.get(idOf(req))),
      create: async (req: Request, res: Response) => created(res, await s.lots.create(req.body)),
      update: async (req: Request, res: Response) => ok(res, await s.lots.update(idOf(req), req.body)),
      remove: async (req: Request, res: Response) => {
        await s.lots.remove(idOf(req));
        noContent(res);
      },
    },

    sections: {
      list: async (_req: Request, res: Response) => ok(res, await s.sections.getAll()),
      update: async (req: Request, res: Response) =>
        ok(res, await s.sections.update(String(req.params.key), req.body, currentAdmin(res).id)),
      updateAbout: async (req: Request, res: Response) => ok(res, await s.sections.update('about', req.body, currentAdmin(res).id)),
    },

    settings: {
      get: async (_req: Request, res: Response) => ok(res, await s.settings.get()),
      update: async (req: Request, res: Response) => ok(res, await s.settings.update(req.body, currentAdmin(res).id)),
    },

    media: {
      signature: async (req: Request, res: Response) =>
        created(res, await s.media.createSignature(parse(uploadSignatureSchema, req.body).purpose, currentAdmin(res).id)),
      confirm: async (req: Request, res: Response) =>
        created(res, await s.media.confirm(parse(uploadConfirmSchema, req.body).publicId, currentAdmin(res).id)),
      discard: async (req: Request, res: Response) => {
        await s.media.discard(idOf(req));
        noContent(res);
      },
      cleanup: async (_req: Request, res: Response) => ok(res, await s.media.cleanup()),
      status: (_req: Request, res: Response) => ok(res, { enabled: s.media.enabled }),
    },
  };
}
