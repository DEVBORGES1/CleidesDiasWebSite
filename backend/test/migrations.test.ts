import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

describe('migrations SQL', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(readFileSync(join(import.meta.dirname, 'supabase-stub.sql'), 'utf8'));
    for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
    }
    await db.exec('grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;');
  }, 60_000);

  afterAll(async () => {
    await db?.close();
  });

  it('cria a linha única de configurações', async () => {
    const r = await db.query<{ count: number }>('select count(*)::int as count from public.site_settings');
    expect(r.rows[0]?.count).toBe(1);
  });

  it('preenche o slogan do estúdio e limita o tamanho', async () => {
    const r = await db.query<{ slogan: string }>('select slogan from public.site_settings where id = 1');
    expect(r.rows[0]?.slogan).toMatch(/^Especialista em capturar o amor/);
    await expect(db.query(`update public.site_settings set slogan = repeat('x', 161) where id = 1`)).rejects.toThrow(/check/);
  });

  it('impede publicar pacote sem preço e promocional maior que o preço', async () => {
    await expect(
      db.query(`insert into public.packages (slug, name, status) values ('a', 'A', 'published')`),
    ).rejects.toThrow(/packages_published_requires_price/);
    await expect(
      db.query(`insert into public.packages (slug, name, price, promo_price) values ('b', 'B', 100, 150)`),
    ).rejects.toThrow(/packages_promo_lower_than_price/);
  });

  it('reordena itens atomicamente', async () => {
    const ids = (
      await db.query<{ id: string }>(
        `insert into public.faq_items (question, answer, position) values ('P1','R1',0),('P2','R2',1),('P3','R3',2) returning id`,
      )
    ).rows.map((r) => r.id);
    await db.query('select public.reorder_rows($1, $2)', ['faq_items', [ids[2], ids[0], ids[1]]]);
    const r = await db.query<{ question: string }>('select question from public.faq_items order by position');
    expect(r.rows.map((x) => x.question)).toEqual(['P3', 'P1', 'P2']);
    await expect(db.query('select public.reorder_rows($1, $2)', ['profiles', ids])).rejects.toThrow(/não permitida/);
  });

  it('lotes: um por dia de encerramento e textos da seção aceitos', async () => {
    await db.query(`insert into public.price_lots (name, ends_on, prices) values ('1º lote', '2026-10-31', '[]')`);
    await expect(db.query(`insert into public.price_lots (name, ends_on) values ('Outro', '2026-10-31')`)).rejects.toThrow(/unique/);
    await expect(db.query(`insert into public.price_lots (name, ends_on, prices) values ('X', '2026-11-30', '{}')`)).rejects.toThrow(/check/);
    await db.query(`insert into public.site_sections (key, content) values ('lots', '{}')`);
    await expect(db.query(`insert into public.site_sections (key, content) values ('outra', '{}')`)).rejects.toThrow(/site_sections_key_check/);
    await db.query('select public.reorder_rows($1, $2)', ['price_lots', []]);
  });

  it('RLS: visitante só lê conteúdo publicado e não consegue escrever', async () => {
    await db.exec(`
      insert into public.faq_items (question, answer, status) values ('Pública', 'Sim', 'published'), ('Rascunho', 'Não', 'draft');
    `);
    await db.exec('set role anon');
    try {
      const visible = await db.query<{ question: string }>(`select question from public.faq_items where question in ('Pública','Rascunho')`);
      expect(visible.rows.map((r) => r.question)).toEqual(['Pública']);
      await expect(db.query(`insert into public.faq_items (question, answer) values ('X','Y')`)).rejects.toThrow(/row-level security/);
    } finally {
      await db.exec('reset role');
    }
  });

  it('RLS: usuário autenticado sem perfil de administrador não escreve', async () => {
    const uid = '7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, 'cliente@example.com']);
    await db.exec(`set request.jwt.claim.sub = '${uid}'`);
    await db.exec('set role authenticated');
    try {
      await expect(db.query(`update public.site_settings set brand_name = 'Invasor' where id = 1`)).resolves.toMatchObject({ affectedRows: 0 });
    } finally {
      await db.exec('reset role');
    }
    const r = await db.query<{ brand_name: string }>('select brand_name from public.site_settings');
    expect(r.rows[0]?.brand_name).toBe('Cleides Dias');
  });

  it('RLS: administrador consegue escrever', async () => {
    const uid = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, 'admin@example.com']);
    await db.query(`insert into public.profiles (id, email, role) values ($1, $2, 'admin')`, [uid, 'admin@example.com']);
    await db.exec(`set request.jwt.claim.sub = '${uid}'`);
    await db.exec('set role authenticated');
    try {
      const r = await db.query(`update public.site_settings set brand_name = 'Estúdio Cleides' where id = 1`);
      expect(r.affectedRows).toBe(1);
    } finally {
      await db.exec('reset role');
    }
  });
});
