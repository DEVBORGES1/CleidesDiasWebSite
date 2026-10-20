import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, formatDayMonth, isValidIsoDate, todayIn, withLotPhases } from './lot-utils.js';
import { lotCreateSchema, type PriceLot } from './lots.js';

const lot = (id: string, endsOn: string): PriceLot => ({
  id,
  name: id,
  endsOn,
  prices: [],
  status: 'published',
  position: 0,
  createdAt: '',
  updatedAt: '',
});

describe('lotes de preço', () => {
  it('valida datas no formato AAAA-MM-DD', () => {
    expect(isValidIsoDate('2026-11-30')).toBe(true);
    expect(isValidIsoDate('2026-02-30')).toBe(false);
    expect(isValidIsoDate('30/11/2026')).toBe(false);
  });

  it('calcula datas sem depender do fuso do computador', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(daysBetween('2026-10-20', '2026-11-30')).toBe(41);
    expect(formatDayMonth('2026-12-05')).toBe('05/12');
    // 02:00 UTC ainda é o dia anterior em São Paulo.
    expect(todayIn('America/Sao_Paulo', new Date('2026-11-01T02:00:00Z'))).toBe('2026-10-31');
  });

  it('marca como atual o primeiro lote que ainda não terminou', () => {
    const phases = withLotPhases([lot('c', '2026-12-15'), lot('a', '2026-10-31'), lot('b', '2026-11-30')], '2026-11-01');
    expect(phases.map((l) => [l.id, l.phase, l.startsOn])).toEqual([
      ['a', 'ended', null],
      ['b', 'current', '2026-11-01'],
      ['c', 'upcoming', '2026-12-01'],
    ]);
    // O último dia do lote ainda é dele.
    expect(withLotPhases([lot('a', '2026-10-31')], '2026-10-31')[0]?.phase).toBe('current');
  });

  it('aceita preços em formato brasileiro e ignora pacotes sem valor', () => {
    const id = '7f1f0f5e-2a3b-4c5d-8e9f-0a1b2c3d4e5f';
    const parsed = lotCreateSchema.parse({
      name: '1º lote',
      endsOn: '2026-10-31',
      prices: [
        { packageId: id, price: 'R$ 1.290,50' },
        { packageId: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d', price: '' },
      ],
    });
    expect(parsed.prices).toEqual([{ packageId: id, price: 1290.5 }]);
    expect(lotCreateSchema.safeParse({ name: 'X', endsOn: '2026-10-31', prices: [{ packageId: id, price: 1 }, { packageId: id, price: 2 }] }).success).toBe(false);
  });
});
