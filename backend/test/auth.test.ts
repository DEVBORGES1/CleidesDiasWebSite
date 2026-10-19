import { describe, expect, it } from 'vitest';
import { USER_TOKEN, buildTestApp } from './helpers.js';

describe('autenticação e autorização do painel', () => {
  it('rejeita requisições sem token', async () => {
    const { request } = buildTestApp();
    const res = await request.get('/api/v1/admin/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejeita token inválido ou expirado', async () => {
    const { request } = buildTestApp();
    const res = await request.get('/api/v1/admin/me').set('Authorization', 'Bearer token-falso');
    expect(res.status).toBe(401);
  });

  it('rejeita usuário autenticado que não é administrador', async () => {
    const { request } = buildTestApp();
    const res = await request.get('/api/v1/admin/dashboard').set('Authorization', `Bearer ${USER_TOKEN}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('ignora papéis enviados pelo navegador', async () => {
    const { request } = buildTestApp();
    const res = await request
      .post('/api/v1/admin/packages')
      .set('Authorization', `Bearer ${USER_TOKEN}`)
      .set('X-Role', 'admin')
      .send({ name: 'Invasão', role: 'admin' });
    expect(res.status).toBe(403);
  });

  it('permite o administrador e retorna o perfil', async () => {
    const { admin } = buildTestApp();
    const res = await admin.get('/api/v1/admin/me');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: 'cleides@example.com', role: 'admin' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it.each([
    ['post', '/api/v1/admin/packages'],
    ['patch', '/api/v1/admin/settings'],
    ['delete', '/api/v1/admin/faq/7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f'],
    ['post', '/api/v1/admin/uploads/signature'],
    ['put', '/api/v1/admin/steps/order'],
    ['patch', '/api/v1/admin/sections/hero'],
  ] as const)('protege %s %s', async (method, url) => {
    const { request } = buildTestApp();
    const res = await request[method](url).send({});
    expect(res.status).toBe(401);
  });
});
