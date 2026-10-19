import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('CRUD de pacotes', () => {
  it('cria rascunho sem preço e exige preço para publicar', async () => {
    const { admin } = buildTestApp();
    const created = await admin.post('/api/v1/admin/packages', { name: 'Natal em Família' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ name: 'Natal em Família', slug: 'natal-em-familia', status: 'draft', price: null });

    const publish = await admin.post(`/api/v1/admin/packages/${created.body.data.id}/publish`);
    expect(publish.status).toBe(400);
    expect(publish.body.error.details).toEqual([{ path: 'price', message: 'Informe o preço para publicar.' }]);
  });

  it('valida o preço promocional', async () => {
    const { admin } = buildTestApp();
    const res = await admin.post('/api/v1/admin/packages', { name: 'Mini', price: '300', promoPrice: '350' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('promoPrice');

    const ok = await admin.post('/api/v1/admin/packages', { name: 'Mini', price: '350,00' });
    const upd = await admin.patch(`/api/v1/admin/packages/${ok.body.data.id}`, { promoPrice: 400 });
    expect(upd.status).toBe(400);
  });

  it('edita, publica, despublica e reflete no site público', async () => {
    const { admin, request } = buildTestApp();
    const { body } = await admin.post('/api/v1/admin/packages', {
      name: 'Natal Completo',
      price: 590,
      highlights: [{ type: 'duracao', value: 'Até 1 hora' }, { type: 'fotos', value: '' }],
      includedItems: ['10 fotos', '', '2 cenários'],
    });
    const id = body.data.id;
    expect(body.data.highlights).toEqual([{ type: 'duracao', value: 'Até 1 hora' }]);
    expect(body.data.includedItems).toEqual(['10 fotos', '2 cenários']);

    expect((await request.get('/api/v1/packages')).body.data).toHaveLength(0);
    expect((await request.get('/api/v1/packages/natal-completo')).status).toBe(404);

    await admin.post(`/api/v1/admin/packages/${id}/publish`);
    const pub = await request.get('/api/v1/packages');
    expect(pub.body.data.map((p: { name: string }) => p.name)).toEqual(['Natal Completo']);

    const edited = await admin.patch(`/api/v1/admin/packages/${id}`, { price: 650, promoPrice: 590, featured: true });
    expect(edited.body.data).toMatchObject({ price: 650, promoPrice: 590, featured: true, name: 'Natal Completo' });
    const detail = await request.get('/api/v1/packages/natal-completo');
    expect(detail.body.data).toMatchObject({ price: 650, promoPrice: 590 });

    await admin.post(`/api/v1/admin/packages/${id}/unpublish`);
    expect((await request.get('/api/v1/packages')).body.data).toHaveLength(0);
    // Despublicar não exclui os dados.
    expect((await admin.get(`/api/v1/admin/packages/${id}`)).body.data.price).toBe(650);
  });

  it('mantém o endereço (slug) de pacotes publicados ao renomear', async () => {
    const { admin } = buildTestApp();
    const { body } = await admin.post('/api/v1/admin/packages', { name: 'Mini Natal', price: 350, status: 'published' });
    const renamed = await admin.patch(`/api/v1/admin/packages/${body.data.id}`, { name: 'Mini Natal 2026' });
    expect(renamed.body.data.slug).toBe('mini-natal');
  });

  it('gera slugs únicos', async () => {
    const { admin } = buildTestApp();
    await admin.post('/api/v1/admin/packages', { name: 'Mini' });
    const second = await admin.post('/api/v1/admin/packages', { name: 'Mini' });
    expect(second.body.data.slug).toBe('mini-2');
  });

  it('duplica como rascunho logo após o original e reordena', async () => {
    const { admin } = buildTestApp();
    const a = (await admin.post('/api/v1/admin/packages', { name: 'A', price: 100, status: 'published', featured: true })).body.data;
    const b = (await admin.post('/api/v1/admin/packages', { name: 'B', price: 200 })).body.data;
    const copy = await admin.post(`/api/v1/admin/packages/${a.id}/duplicate`);
    expect(copy.status).toBe(201);
    expect(copy.body.data).toMatchObject({ name: 'A (cópia)', status: 'draft', featured: false, price: 100 });

    let list = (await admin.get('/api/v1/admin/packages')).body.data.map((p: { name: string }) => p.name);
    expect(list).toEqual(['A', 'A (cópia)', 'B']);

    const ids = (await admin.get('/api/v1/admin/packages')).body.data.map((p: { id: string }) => p.id);
    const reordered = await admin.put('/api/v1/admin/packages/order', { ids: [b.id, ids[1], a.id] });
    expect(reordered.status).toBe(200);
    list = reordered.body.data.map((p: { name: string }) => p.name);
    expect(list).toEqual(['B', 'A (cópia)', 'A']);
  });

  it('rejeita ordem incompleta ou com repetição', async () => {
    const { admin } = buildTestApp();
    const a = (await admin.post('/api/v1/admin/packages', { name: 'A' })).body.data;
    await admin.post('/api/v1/admin/packages', { name: 'B' });
    const res = await admin.put('/api/v1/admin/packages/order', { ids: [a.id, a.id] });
    expect(res.status).toBe(400);
  });

  it('exclui pacote', async () => {
    const { admin } = buildTestApp();
    const a = (await admin.post('/api/v1/admin/packages', { name: 'A' })).body.data;
    expect((await admin.delete(`/api/v1/admin/packages/${a.id}`)).status).toBe(204);
    expect((await admin.get(`/api/v1/admin/packages/${a.id}`)).status).toBe(404);
    expect((await admin.delete(`/api/v1/admin/packages/${a.id}`)).status).toBe(404);
  });

  it('valida identificadores e campos', async () => {
    const { admin } = buildTestApp();
    expect((await admin.get('/api/v1/admin/packages/nao-e-uuid')).status).toBe(400);
    const res = await admin.post('/api/v1/admin/packages', { name: '', price: 'abc', status: 'secreto' });
    expect(res.status).toBe(400);
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'price', 'status']));
  });

  it('usa capa enviada pelo fluxo de upload e não aceita URLs arbitrárias', async () => {
    const { admin, uploadAsset } = buildTestApp();
    const asset = await uploadAsset('package');
    const res = await admin.post('/api/v1/admin/packages', { name: 'Com capa', cover: { assetId: asset.id, x: 30, alt: 'Capa' } });
    expect(res.status).toBe(201);
    expect(res.body.data.cover).toMatchObject({ assetId: asset.id, url: asset.url, x: 30, alt: 'Capa', width: 1600 });

    const forged = await admin.post('/api/v1/admin/packages', {
      name: 'URL forjada',
      cover: { assetId: null, url: 'https://evil.example.com/x.jpg' },
    });
    expect(forged.status).toBe(400);
  });
});
