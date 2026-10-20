import pino from 'pino';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { seedDemoContent } from '../src/seed/demo-content.js';
import { createServices } from '../src/services/index.js';
import { createMemoryRepositories } from '../src/repositories/memory/index.js';
import { FakeAuthProvider, FakeStorage, buildTestApp } from './helpers.js';

describe('consulta pública', () => {
  it('retorna o site completo apenas com conteúdo publicado', async () => {
    const { admin, request, repos } = buildTestApp();
    await seedDemoContent(repos);
    await admin.post('/api/v1/admin/packages', { name: 'Pacote secreto', price: 10 });
    await admin.post('/api/v1/admin/faq', { question: 'Rascunho?', answer: 'Sim' });

    const res = await request.get('/api/v1/site');
    expect(res.status).toBe(200);
    const site = res.body.data;
    expect(site.preview).toBe(false);
    expect(site.packages.map((p: { name: string }) => p.name)).toEqual(['Mini Natal', 'Natal Completo', 'Experiência Família']);
    expect(site.faq).toHaveLength(7);
    expect(site.steps).toHaveLength(4);
    expect(site.settings.whatsappNumber).toBe('5549999569245');
    expect(site.sections.hero.title).toBe('Registre a magia deste Natal');
    expect(JSON.stringify(site)).not.toContain('Pacote secreto');
    expect(res.headers['cache-control']).toContain('must-revalidate');
    expect(res.headers.etag).toBeTruthy();
  });

  it('a pré-visualização com rascunhos exige login de administrador', async () => {
    const { admin, request } = buildTestApp();
    await admin.post('/api/v1/admin/faq', { question: 'Rascunho?', answer: 'Sim' });
    expect((await request.get('/api/v1/admin/preview')).status).toBe(401);
    const res = await admin.get('/api/v1/admin/preview');
    expect(res.body.data.preview).toBe(true);
    expect(res.body.data.faq).toHaveLength(1);
  });

  it('o seed não sobrescreve conteúdo real', async () => {
    const { admin, repos } = buildTestApp();
    await admin.patch('/api/v1/admin/settings', { whatsappNumber: '5511912345678' });
    await admin.patch('/api/v1/admin/sections/hero', { title: 'Meu título' });
    await admin.post('/api/v1/admin/faq', { question: 'Minha', answer: 'Real' });
    await seedDemoContent(repos);
    const settings = await repos.settings.get();
    expect(settings.whatsappNumber).toBe('5511912345678');
    expect((await repos.sections.getAll()).hero).toMatchObject({ title: 'Meu título' });
    expect((await repos.faq.list()).map((f) => f.question)).toEqual(['Minha']);
    expect((await repos.packages.stats()).total).toBe(3);
  });

  it('gera sitemap com os pacotes publicados', async () => {
    const { request, repos } = buildTestApp();
    await seedDemoContent(repos);
    const res = await request.get('/api/v1/sitemap.xml');
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toContain('<loc>https://cleidesdias.com.br/pacotes/natal-completo</loc>');
  });

  it('dashboard mostra contagens reais e rascunhos pendentes', async () => {
    const { admin, repos } = buildTestApp();
    await seedDemoContent(repos);
    await admin.post('/api/v1/admin/faq', { question: 'Nova', answer: 'Rascunho' });
    const res = await admin.get('/api/v1/admin/dashboard');
    expect(res.body.data).toMatchObject({
      packages: { total: 3, published: 3, draft: 0, featured: 1 },
      faq: { total: 8, published: 7, draft: 1 },
      gallery: { total: 0 },
      // Os lotes de exemplo entram como rascunho.
      lots: { total: 3, published: 0, draft: 3 },
      pendingDrafts: 4,
      whatsappConfigured: true,
    });
    expect(res.body.data.visibleSections.find((s: { key: string }) => s.key === 'galeria').visible).toBe(false);
  });
});

describe('tratamento de erros e segurança HTTP', () => {
  it('responde 404 padronizado para rotas inexistentes', async () => {
    const { request } = buildTestApp();
    const res = await request.get('/api/v1/nada');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } });
  });

  it('rejeita JSON malformado', async () => {
    const { request } = buildTestApp();
    const res = await request
      .post('/api/v1/admin/faq')
      .set('Authorization', 'Bearer token-admin')
      .set('Content-Type', 'application/json')
      .send('{"question": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('não expõe detalhes internos em erros inesperados', async () => {
    const repos = createMemoryRepositories();
    repos.settings.get = async () => {
      throw new Error('senha=123 conexão recusada em db.interno:5432');
    };
    const logger = pino({ level: 'silent' });
    const services = createServices({ repos, authProvider: new FakeAuthProvider(), storage: new FakeStorage(), logger });
    const app = createApp({ env: { FRONTEND_URL: 'http://localhost:5173', SITE_URL: 'http://localhost', TRUST_PROXY: 0, NODE_ENV: 'test' }, logger, services });
    const res = await supertest(app).get('/api/v1/settings');
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toMatch(/senha|db\.interno|stack/);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('aplica cabeçalhos de segurança e CORS restritivo', async () => {
    const { request } = buildTestApp();
    const allowed = await request.get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    expect(allowed.headers['x-powered-by']).toBeUndefined();
    const blocked = await request.get('/api/v1/health').set('Origin', 'https://site-malicioso.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('limita o tamanho do corpo', async () => {
    const { admin } = buildTestApp();
    const res = await admin.post('/api/v1/admin/faq', { question: 'x', answer: 'a'.repeat(300_000) });
    expect(res.status).toBe(413);
  });
});
