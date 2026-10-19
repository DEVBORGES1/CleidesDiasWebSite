import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('upload assinado de imagens', () => {
  it('gera assinatura com identificador controlado pelo servidor', async () => {
    const { admin, repos } = buildTestApp();
    const res = await admin.post('/api/v1/admin/uploads/signature', { purpose: 'gallery' });
    expect(res.status).toBe(201);
    expect(res.body.data.publicId).toMatch(/^cleides\/gallery\/[0-9a-f-]{36}$/);
    expect(res.body.data).not.toHaveProperty('apiSecret');
    const pending = await repos.media.findByPublicId(res.body.data.publicId);
    expect(pending?.status).toBe('pending');
  });

  it('valida a finalidade do upload', async () => {
    const { admin } = buildTestApp();
    expect((await admin.post('/api/v1/admin/uploads/signature', { purpose: 'qualquer' })).status).toBe(400);
  });

  it('não confirma upload que não foi autorizado pelo backend', async () => {
    const { admin, storage } = buildTestApp();
    const publicId = 'cleides/gallery/7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';
    storage.upload(publicId);
    const res = await admin.post('/api/v1/admin/uploads/confirm', { publicId });
    expect(res.status).toBe(404);
  });

  it('não confirma se o arquivo não chegou ao Cloudinary', async () => {
    const { admin } = buildTestApp();
    const sig = await admin.post('/api/v1/admin/uploads/signature', { purpose: 'gallery' });
    const res = await admin.post('/api/v1/admin/uploads/confirm', { publicId: sig.body.data.publicId });
    expect(res.status).toBe(422);
  });

  it('usa os metadados do Cloudinary, não os do navegador', async () => {
    const { admin, storage } = buildTestApp();
    const sig = await admin.post('/api/v1/admin/uploads/signature', { purpose: 'gallery' });
    storage.upload(sig.body.data.publicId, { width: 2000, height: 3000 });
    const res = await admin
      .post('/api/v1/admin/uploads/confirm', { publicId: sig.body.data.publicId })
      .send({ publicId: sig.body.data.publicId, url: 'https://evil.example.com/x.jpg', width: 1 });
    expect(res.status).toBe(201);
    expect(res.body.data.url).toContain('res.cloudinary.com');
    expect(res.body.data).toMatchObject({ width: 2000, height: 3000 });
  });

  it.each([
    [{ format: 'gif' }, 'Formato'],
    [{ bytes: 25 * 1024 * 1024 }, 'muito grande'],
    [{ width: 100, height: 80 }, 'muito pequena'],
  ])('rejeita e remove arquivo inválido %o', async (resource, message) => {
    const { admin, storage, repos } = buildTestApp();
    const sig = await admin.post('/api/v1/admin/uploads/signature', { purpose: 'gallery' });
    storage.upload(sig.body.data.publicId, resource);
    const res = await admin.post('/api/v1/admin/uploads/confirm', { publicId: sig.body.data.publicId });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toContain(message);
    expect(storage.destroyed).toContain(sig.body.data.publicId);
    expect((await repos.media.findByPublicId(sig.body.data.publicId))?.status).toBe('deleted');
  });
});

describe('galeria', () => {
  it('cadastra foto confirmada como rascunho e publica', async () => {
    const { admin, request, uploadAsset } = buildTestApp();
    const asset = await uploadAsset();
    const created = await admin.post('/api/v1/admin/gallery', { assetId: asset.id, title: 'Irmãos brincando', category: 'Crianças' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'draft', title: 'Irmãos brincando' });
    expect(created.body.data.image.url).toBe(asset.url);

    expect((await request.get('/api/v1/gallery')).body.data).toHaveLength(0);
    await admin.post('/api/v1/admin/gallery/status', { ids: [created.body.data.id], status: 'published' });
    const pub = await request.get('/api/v1/gallery');
    expect(pub.body.data).toHaveLength(1);
    expect(pub.body.meta).toMatchObject({ page: 1, total: 1 });
    expect((await request.get('/api/v1/gallery/categories')).body.data).toEqual(['Crianças']);
  });

  it('recusa arquivo pendente ou inexistente', async () => {
    const { admin } = buildTestApp();
    const sig = await admin.post('/api/v1/admin/uploads/signature', { purpose: 'gallery' });
    const pending = await admin.post('/api/v1/admin/gallery', { assetId: '7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f' });
    expect(pending.status).toBe(400);
    expect(sig.status).toBe(201);
  });

  it('edita enquadramento e texto alternativo', async () => {
    const { admin, uploadAsset } = buildTestApp();
    const asset = await uploadAsset();
    const { body } = await admin.post('/api/v1/admin/gallery', { assetId: asset.id });
    const upd = await admin.patch(`/api/v1/admin/gallery/${body.data.id}`, { x: 20, y: 80, zoom: 1.4, ratio: '4/5', alt: 'Bebê na manta' });
    expect(upd.body.data.image).toMatchObject({ x: 20, y: 80, zoom: 1.4, ratio: '4/5', alt: 'Bebê na manta' });
    const bad = await admin.patch(`/api/v1/admin/gallery/${body.data.id}`, { zoom: 9 });
    expect(bad.status).toBe(400);
  });

  it('substitui a foto e remove o arquivo antigo do Cloudinary', async () => {
    const { admin, uploadAsset, storage } = buildTestApp();
    const oldAsset = await uploadAsset();
    const newAsset = await uploadAsset();
    const { body } = await admin.post('/api/v1/admin/gallery', { assetId: oldAsset.id, title: 'Mantém' });
    const upd = await admin.patch(`/api/v1/admin/gallery/${body.data.id}`, { assetId: newAsset.id });
    expect(upd.body.data).toMatchObject({ title: 'Mantém' });
    expect(upd.body.data.image.assetId).toBe(newAsset.id);
    expect(storage.destroyed).toEqual([oldAsset.publicId]);
  });

  it('exclui a foto e o arquivo, exceto se ele for a capa do site', async () => {
    const { admin, uploadAsset, storage, request } = buildTestApp();
    const a = await uploadAsset();
    const b = await uploadAsset();
    const ga = (await admin.post('/api/v1/admin/gallery', { assetId: a.id })).body.data;
    const gb = (await admin.post('/api/v1/admin/gallery', { assetId: b.id })).body.data;

    await admin.post(`/api/v1/admin/gallery/${gb.id}/cover`);
    const site = await request.get('/api/v1/site');
    expect(site.body.data.sections.hero.image.assetId).toBe(b.id);

    expect((await admin.delete(`/api/v1/admin/gallery/${ga.id}`)).status).toBe(204);
    expect(storage.destroyed).toEqual([a.publicId]);

    await admin.delete(`/api/v1/admin/gallery/${gb.id}`);
    expect(storage.destroyed).not.toContain(b.publicId);
  });

  it('reordena e pagina', async () => {
    const { admin, uploadAsset } = buildTestApp();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const asset = await uploadAsset();
      ids.push((await admin.post('/api/v1/admin/gallery', { assetId: asset.id, title: `F${i}` })).body.data.id);
    }
    const res = await admin.put('/api/v1/admin/gallery/order', { ids: [ids[2], ids[0], ids[1]] });
    expect(res.body.data.map((g: { title: string }) => g.title)).toEqual(['F2', 'F0', 'F1']);
    const page = await admin.get('/api/v1/admin/gallery?page=2&limit=2');
    expect(page.body.data.map((g: { title: string }) => g.title)).toEqual(['F1']);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });
});

describe('limpeza de mídia', () => {
  it('remove uploads não usados após o período de carência', async () => {
    const { admin, uploadAsset, repos, storage } = buildTestApp();
    const used = await uploadAsset();
    const unused = await uploadAsset();
    await admin.post('/api/v1/admin/gallery', { assetId: used.id });
    for (const row of repos.media.rows.values()) row.createdAt = new Date(Date.now() - 3 * 86400_000).toISOString();
    const res = await admin.post('/api/v1/admin/media/cleanup');
    expect(res.body.data).toEqual({ removed: 1, failed: 0 });
    expect(storage.destroyed).toEqual([unused.publicId]);
  });

  it('não descarta arquivo em uso', async () => {
    const { admin, uploadAsset } = buildTestApp();
    const used = await uploadAsset('section');
    await admin.patch('/api/v1/admin/sections/about', { image: { assetId: used.id } });
    const res = await admin.delete(`/api/v1/admin/media/${used.id}`);
    expect(res.status).toBe(409);
  });
});
