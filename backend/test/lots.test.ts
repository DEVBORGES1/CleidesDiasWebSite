import { describe, expect, it } from 'vitest';
import { buildTestApp } from './helpers.js';

// 20/11/2026 às 12h em São Paulo: o 2º lote (até 30/11) está em andamento.
const NOW = () => new Date('2026-11-20T15:00:00Z');

async function setup(now = NOW) {
  const ctx = buildTestApp({ now });
  const mini = (await ctx.admin.post('/api/v1/admin/packages', { name: 'Mini Natal', price: 350, status: 'published' })).body.data;
  const completo = (await ctx.admin.post('/api/v1/admin/packages', { name: 'Natal Completo', price: 590, status: 'published' })).body.data;
  const lot = (name: string, endsOn: string, prices: [string, number | string][], status = 'published') =>
    ctx.admin.post('/api/v1/admin/lots', { name, endsOn, status, prices: prices.map(([packageId, price]) => ({ packageId, price })) });
  return { ...ctx, mini, completo, lot };
}

describe('valores por lote', () => {
  it('o site recebe os lotes em ordem de data, com o lote atual decidido pela API', async () => {
    const { request, mini, completo, lot } = await setup();
    await lot('3º lote', '2026-12-15', [[mini.id, 400], [completo.id, 650]]);
    await lot('1º lote', '2026-10-31', [[mini.id, 300]]);
    await lot('2º lote', '2026-11-30', [[mini.id, '350,00'], [completo.id, 590]]);
    await lot('Rascunho', '2026-12-20', [[mini.id, 999]], 'draft');

    const site = (await request.get('/api/v1/site')).body.data;
    expect(site.today).toBe('2026-11-20');
    expect(site.lots.map((l: { name: string; phase: string; startsOn: string | null }) => [l.name, l.phase, l.startsOn])).toEqual([
      ['1º lote', 'ended', null],
      ['2º lote', 'current', '2026-11-01'],
      ['3º lote', 'upcoming', '2026-12-01'],
    ]);
    expect(site.lots[1].prices).toContainEqual({ packageId: mini.id, price: 350 });

    const lots = (await request.get('/api/v1/lots')).body.data;
    expect(lots.lots).toHaveLength(3);
  });

  it('na pré-visualização inclui os lotes em rascunho', async () => {
    const { admin, mini, lot } = await setup();
    await lot('2º lote', '2026-11-30', [[mini.id, 350]], 'draft');
    const preview = (await admin.get('/api/v1/admin/preview')).body.data;
    expect(preview.lots.map((l: { phase: string }) => l.phase)).toEqual(['current']);
  });

  it('sem lote em andamento, o site não mostra lotes', async () => {
    const { request, mini, lot } = await setup();
    await lot('1º lote', '2026-10-31', [[mini.id, 300]]);
    expect((await request.get('/api/v1/site')).body.data.lots).toEqual([]);
    const dashboard = (await setup()).admin;
    expect((await dashboard.get('/api/v1/admin/dashboard')).body.data.visibleSections).toContainEqual({ key: 'lotes', label: 'Valores por lote', visible: false });
  });

  it('edita, valida e exclui lotes', async () => {
    const { admin, mini, lot } = await setup();
    const a = await lot('1º lote', '2026-10-31', [[mini.id, 300]]);
    expect(a.status).toBe(201);

    const sameDay = await lot('Outro', '2026-10-31', []);
    expect(sameDay.status).toBe(409);
    expect((await lot('', '2026-10-31', [])).status).toBe(400);
    expect((await lot('X', '31/10/2026', [])).status).toBe(400);

    const upd = await admin.patch(`/api/v1/admin/lots/${a.body.data.id}`, { endsOn: '2026-11-05', prices: [{ packageId: mini.id, price: '' }] });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ name: '1º lote', endsOn: '2026-11-05', prices: [] });

    // Valores de pacotes inexistentes são descartados.
    const ghost = await admin.patch(`/api/v1/admin/lots/${a.body.data.id}`, { prices: [{ packageId: '7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f', price: 10 }] });
    expect(ghost.body.data.prices).toEqual([]);

    expect((await admin.delete(`/api/v1/admin/lots/${a.body.data.id}`)).status).toBe(204);
    expect((await admin.get('/api/v1/admin/lots')).body.data).toEqual([]);
  });

  it('exige administradora para editar', async () => {
    const { request } = await setup();
    expect((await request.post('/api/v1/admin/lots').send({ name: 'X', endsOn: '2026-10-31' })).status).toBe(401);
  });
});
