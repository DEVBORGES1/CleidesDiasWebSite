import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

describe('dúvidas frequentes', () => {
  it('CRUD completo, busca e publicação', async () => {
    const { admin, request } = buildTestApp();
    const a = await admin.post('/api/v1/admin/faq', { question: 'Como funciona o pagamento?', answer: 'Pix ou cartão.\n\n- Sinal\n- Restante', category: 'Pagamento' });
    expect(a.status).toBe(201);
    await admin.post('/api/v1/admin/faq', { question: 'Posso levar acessórios?', answer: 'Sim!', status: 'published' });

    expect((await admin.get('/api/v1/admin/faq?q=pagamento')).body.data).toHaveLength(1);
    expect((await admin.get('/api/v1/admin/faq?q=acessorios')).body.data).toHaveLength(1);
    expect((await request.get('/api/v1/faq')).body.data.map((f: { question: string }) => f.question)).toEqual(['Posso levar acessórios?']);

    const upd = await admin.patch(`/api/v1/admin/faq/${a.body.data.id}`, { status: 'published', answer: 'Atualizada' });
    expect(upd.body.data).toMatchObject({ status: 'published', answer: 'Atualizada', question: 'Como funciona o pagamento?' });
    expect((await request.get('/api/v1/faq')).body.data).toHaveLength(2);

    expect((await admin.delete(`/api/v1/admin/faq/${a.body.data.id}`)).status).toBe(204);
    expect((await request.get('/api/v1/faq')).body.data).toHaveLength(1);
  });

  it('exige pergunta e resposta', async () => {
    const { admin } = buildTestApp();
    const res = await admin.post('/api/v1/admin/faq', { question: '  ', answer: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { path: string }) => d.path)).toEqual(['question', 'answer']);
  });

  it('reordena perguntas', async () => {
    const { admin } = buildTestApp();
    const ids = [];
    for (const q of ['A', 'B', 'C']) ids.push((await admin.post('/api/v1/admin/faq', { question: q, answer: q })).body.data.id);
    const res = await admin.put('/api/v1/admin/faq/order', { ids: [ids[1], ids[2], ids[0]] });
    expect(res.body.data.map((f: { question: string }) => f.question)).toEqual(['B', 'C', 'A']);
  });
});

describe('etapas (como funciona)', () => {
  it('CRUD, duplicação e ordenação sem número fixo de etapas', async () => {
    const { admin, request } = buildTestApp();
    const ids: string[] = [];
    for (let i = 1; i <= 6; i++) {
      const r = await admin.post('/api/v1/admin/steps', { title: `Etapa ${i}`, icon: 'chat', status: 'published' });
      ids.push(r.body.data.id);
    }
    const pub = await request.get('/api/v1/how-it-works');
    expect(pub.body.data.steps).toHaveLength(6);

    const dup = await admin.post(`/api/v1/admin/steps/${ids[0]}/duplicate`);
    expect(dup.body.data).toMatchObject({ title: 'Etapa 1 (cópia)', status: 'draft' });
    const all = (await admin.get('/api/v1/admin/steps')).body.data.map((s: { title: string }) => s.title);
    expect(all.slice(0, 3)).toEqual(['Etapa 1', 'Etapa 1 (cópia)', 'Etapa 2']);
    expect((await request.get('/api/v1/how-it-works')).body.data.steps).toHaveLength(6);

    const order = (await admin.get('/api/v1/admin/steps')).body.data.map((s: { id: string }) => s.id).reverse();
    const re = await admin.put('/api/v1/admin/steps/order', { ids: order });
    expect(re.body.data[0].title).toBe('Etapa 6');

    const upd = await admin.patch(`/api/v1/admin/steps/${ids[1]}`, { icon: 'favorite', note: 'Observação', status: 'draft' });
    expect(upd.body.data).toMatchObject({ icon: 'favorite', note: 'Observação', status: 'draft' });
    expect((await request.get('/api/v1/how-it-works')).body.data.steps).toHaveLength(5);
    expect((await admin.delete(`/api/v1/admin/steps/${ids[1]}`)).status).toBe(204);
  });

  it('valida o ícone', async () => {
    const { admin } = buildTestApp();
    expect((await admin.post('/api/v1/admin/steps', { title: 'X', icon: '<script>' })).status).toBe(400);
  });
});

describe('seções e configurações', () => {
  it('atualiza parcialmente a seção sem apagar os demais campos', async () => {
    const { admin, request } = buildTestApp();
    await admin.patch('/api/v1/admin/sections/hero', { title: 'Registre a magia', text: 'Texto' });
    const res = await admin.patch('/api/v1/admin/sections/hero', { eyebrow: 'Natal' });
    expect(res.body.data).toMatchObject({ title: 'Registre a magia', text: 'Texto', eyebrow: 'Natal' });
    const site = await request.get('/api/v1/site');
    expect(site.body.data.sections.hero.title).toBe('Registre a magia');
  });

  it('troca a foto da seção Sobre e reflete no endpoint público', async () => {
    const { admin, request, uploadAsset } = buildTestApp();
    const asset = await uploadAsset('section');
    await admin.patch('/api/v1/admin/about', { image: { assetId: asset.id, y: 30, alt: 'Cleides' }, highlights: ['Um', '', 'Dois'] });
    const about = await request.get('/api/v1/about');
    expect(about.body.data.image).toMatchObject({ assetId: asset.id, y: 30, alt: 'Cleides' });
    expect(about.body.data.highlights).toEqual(['Um', 'Dois']);
  });

  it('recusa seção inexistente', async () => {
    const { admin } = buildTestApp();
    expect((await admin.patch('/api/v1/admin/sections/qualquer', {})).status).toBe(404);
  });

  it('atualiza configurações parcialmente e valida WhatsApp', async () => {
    const { admin, request } = buildTestApp();
    await admin.patch('/api/v1/admin/settings', { brandName: 'Cleides Dias', whatsappNumber: '+55 (49) 99956-9245', instagram: '@estudio' });
    const res = await admin.patch('/api/v1/admin/settings', { city: 'Videira – SC' });
    expect(res.body.data).toMatchObject({ whatsappNumber: '5549999569245', instagram: '@estudio', city: 'Videira – SC' });
    const bad = await admin.patch('/api/v1/admin/settings', { whatsappNumber: '123' });
    expect(bad.status).toBe(400);
    expect((await request.get('/api/v1/settings')).body.data.city).toBe('Videira – SC');
  });
});
