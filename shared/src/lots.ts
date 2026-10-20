import { z } from 'zod';
import { idSchema, statusSchema, text } from './common.js';
import { CONTENT_LIMITS, type PublicationStatus } from './constants.js';
import { isValidIsoDate } from './lot-utils.js';
import { priceSchema } from './packages.js';

/** Dia no formato AAAA-MM-DD (ex.: 2026-11-30). */
export const isoDateSchema = z
  .string({ error: 'Informe a data de encerramento.' })
  .trim()
  .refine(isValidIsoDate, { error: 'Informe uma data válida.' });

export const lotPriceSchema = z.object({
  packageId: idSchema,
  price: priceSchema,
});

const lotFields = {
  name: text(40, 'O nome do lote').min(1, { error: 'Dê um nome ao lote, ex.: 1º lote.' }),
  endsOn: isoDateSchema,
  prices: z
    .array(lotPriceSchema)
    .max(CONTENT_LIMITS.packages)
    // Pacotes sem valor neste lote continuam com o preço normal.
    .transform((items) => items.filter((p): p is { packageId: string; price: number } => p.price != null))
    .refine((items) => new Set(items.map((p) => p.packageId)).size === items.length, {
      error: 'Cada pacote pode ter só um valor por lote.',
    })
    .default([]),
  status: statusSchema.default('draft'),
};

export const lotCreateSchema = z.object(lotFields);
export type LotCreateInput = z.input<typeof lotCreateSchema>;
export type LotCreateParsed = z.output<typeof lotCreateSchema>;

export const lotUpdateSchema = z.object(lotFields).partial();
export type LotUpdateInput = z.input<typeof lotUpdateSchema>;
export type LotUpdateParsed = z.output<typeof lotUpdateSchema>;

export interface LotPrice {
  packageId: string;
  price: number;
}

/** Lote de preços por prazo: vale até `endsOn` (inclusive) e começa no dia seguinte ao fim do lote anterior. */
export interface PriceLot {
  id: string;
  name: string;
  endsOn: string;
  prices: LotPrice[];
  status: PublicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}
