import type { PriceLot } from './lots.js';

/** Fuso usado para decidir em que dia estamos (o estúdio fica em Santa Catarina). */
export const STUDIO_TIME_ZONE = 'America/Sao_Paulo';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

/** Data de hoje (AAAA-MM-DD) no fuso do estúdio. */
export function todayIn(timeZone: string = STUDIO_TIME_ZONE, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Dias corridos de `from` até `to` (0 quando é o mesmo dia). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** 2026-11-30 → "30/11". */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export type LotPhase = 'ended' | 'current' | 'upcoming';

export interface LotWithPhase extends PriceLot {
  phase: LotPhase;
  /** Primeiro dia do lote (dia seguinte ao fim do anterior); `null` no primeiro lote. */
  startsOn: string | null;
}

/** Ordena os lotes pela data de encerramento e marca o atual: o primeiro que ainda não terminou. */
export function withLotPhases(lots: PriceLot[], today: string): LotWithPhase[] {
  const sorted = [...lots].sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.position - b.position);
  let currentFound = false;
  return sorted.map((lot, i) => {
    const prev = sorted[i - 1];
    let phase: LotPhase = 'upcoming';
    if (lot.endsOn < today) phase = 'ended';
    else if (!currentFound) {
      phase = 'current';
      currentFound = true;
    }
    return { ...lot, phase, startsOn: prev ? addDays(prev.endsOn, 1) : null };
  });
}

export function lotPriceFor(lot: Pick<PriceLot, 'prices'> | undefined, packageId: string): number | null {
  return lot?.prices.find((p) => p.packageId === packageId)?.price ?? null;
}
