import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { publicController } from '../controllers/public.controller.js';
import { requireAdmin } from '../middlewares/auth.js';
import { noStore, publicCache } from '../middlewares/cache.js';
import { uploadLimiter, writeLimiter } from '../middlewares/rate-limit.js';
import type { Services } from '../services/index.js';

export function publicRoutes(services: Services, siteUrl: string): Router {
  const c = publicController(services, siteUrl);
  const r = Router();
  r.use(publicCache);
  r.get('/site', c.site);
  r.get('/settings', c.settings);
  r.get('/packages', c.packages);
  r.get('/packages/:idOrSlug', c.packageDetail);
  r.get('/gallery', c.gallery);
  r.get('/gallery/categories', c.galleryCategories);
  r.get('/faq', c.faq);
  r.get('/how-it-works', c.howItWorks);
  r.get('/about', c.about);
  r.get('/sitemap.xml', c.sitemap);
  return r;
}

export function adminRoutes(services: Services): Router {
  const c = adminController(services);
  const r = Router();
  r.use(noStore, requireAdmin(services.auth), writeLimiter());

  r.get('/me', c.me);
  r.get('/dashboard', c.dashboard);
  r.get('/preview', c.preview);
  r.post('/demo-content', c.seedDemo);

  r.get('/packages', c.packages.list);
  r.post('/packages', c.packages.create);
  r.put('/packages/order', c.packages.reorder);
  r.get('/packages/:id', c.packages.get);
  r.patch('/packages/:id', c.packages.update);
  r.delete('/packages/:id', c.packages.remove);
  r.post('/packages/:id/duplicate', c.packages.duplicate);
  r.post('/packages/:id/publish', c.packages.publish);
  r.post('/packages/:id/unpublish', c.packages.unpublish);

  r.get('/gallery', c.gallery.list);
  r.post('/gallery', c.gallery.create);
  r.get('/gallery/categories', c.gallery.categories);
  r.put('/gallery/order', c.gallery.reorder);
  r.post('/gallery/status', c.gallery.setStatus);
  r.get('/gallery/:id', c.gallery.get);
  r.patch('/gallery/:id', c.gallery.update);
  r.delete('/gallery/:id', c.gallery.remove);
  r.post('/gallery/:id/cover', c.gallery.setCover);

  r.get('/faq', c.faq.list);
  r.post('/faq', c.faq.create);
  r.put('/faq/order', c.faq.reorder);
  r.get('/faq/:id', c.faq.get);
  r.patch('/faq/:id', c.faq.update);
  r.delete('/faq/:id', c.faq.remove);

  r.get('/steps', c.steps.list);
  r.post('/steps', c.steps.create);
  r.put('/steps/order', c.steps.reorder);
  r.get('/steps/:id', c.steps.get);
  r.patch('/steps/:id', c.steps.update);
  r.delete('/steps/:id', c.steps.remove);
  r.post('/steps/:id/duplicate', c.steps.duplicate);

  r.get('/sections', c.sections.list);
  r.patch('/sections/:key', c.sections.update);
  r.patch('/about', c.sections.updateAbout);

  r.get('/settings', c.settings.get);
  r.patch('/settings', c.settings.update);

  r.get('/media/status', c.media.status);
  r.post('/uploads/signature', uploadLimiter(), c.media.signature);
  r.post('/uploads/confirm', c.media.confirm);
  r.delete('/media/:id', c.media.discard);
  r.post('/media/cleanup', c.media.cleanup);
  return r;
}
