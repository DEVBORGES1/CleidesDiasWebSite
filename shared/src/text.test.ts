import { describe, expect, it } from 'vitest';
import { formatPrice, parseRichText, slugify, whatsappLink } from './text.js';
import { packageCreateSchema, packagePriceIssues } from './packages.js';
import { siteSettingsUpdateSchema } from './settings.js';
import { pickPresent } from './common.js';

describe('parseRichText', () => {
  it('separa parágrafos e listas', () => {
    expect(parseRichText('Primeira linha\ncontinua\n\n- item 1\n- item 2\nDepois')).toEqual([
      { type: 'paragraph', text: 'Primeira linha\ncontinua' },
      { type: 'list', items: ['item 1', 'item 2'] },
      { type: 'paragraph', text: 'Depois' },
    ]);
  });
  it('retorna vazio para texto vazio', () => {
    expect(parseRichText('')).toEqual([]);
  });
});

describe('utilitários', () => {
  it('gera slugs sem acentos', () => {
    expect(slugify('Experiência Família 2026!')).toBe('experiencia-familia-2026');
  });
  it('formata preços', () => {
    expect(formatPrice(590)).toBe('590');
    expect(formatPrice(349.9)).toBe('349,90');
    expect(formatPrice(1290)).toBe('1.290');
  });
  it('monta link do WhatsApp', () => {
    expect(whatsappLink('(49) 99956-9245', 'Olá!')).toBe('https://wa.me/49999569245?text=Ol%C3%A1!');
  });
});

describe('schemas de pacote', () => {
  it('aceita preço em formato brasileiro', () => {
    const p = packageCreateSchema.parse({ name: 'Mini', price: 'R$ 1.290,50' });
    expect(p.price).toBe(1290.5);
    expect(p.status).toBe('draft');
  });
  it('exige preço para publicar', () => {
    const r = packageCreateSchema.safeParse({ name: 'Mini', status: 'published' });
    expect(r.success).toBe(false);
  });
  it('rejeita promocional maior que o normal', () => {
    expect(packagePriceIssues({ price: 100, promoPrice: 120, status: 'draft' })).toHaveLength(1);
  });
});

describe('pickPresent', () => {
  it('não aplica padrões a campos ausentes em atualizações parciais', () => {
    const raw = { brandName: 'Estúdio' };
    const parsed = siteSettingsUpdateSchema.parse(raw);
    expect(pickPresent(parsed, raw)).toEqual({ brandName: 'Estúdio' });
  });
  it('normaliza o número do WhatsApp', () => {
    const raw = { whatsappNumber: '+55 (49) 99956-9245' };
    expect(siteSettingsUpdateSchema.parse(raw).whatsappNumber).toBe('5549999569245');
  });
});
