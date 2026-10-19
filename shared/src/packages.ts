import { z } from 'zod';
import { statusSchema, text } from './common.js';
import { CONTENT_LIMITS, HIGHLIGHT_TYPE_KEYS, type PublicationStatus } from './constants.js';
import { imageInputSchema, type ImageValue } from './image.js';

/** Valor monetário em reais: aceita "590", "590,00" ou 590. */
export const priceSchema = z.preprocess(
  (v) => {
    if (v === '' || v === null || v === undefined) return null;
    if (typeof v === 'string') {
      const clean = v.replace(/[R$\s.]/g, '').replace(',', '.');
      return clean === '' ? null : Number(clean);
    }
    return v;
  },
  z
    .number({ error: 'Informe um valor válido, ex.: 590 ou 590,00.' })
    .nonnegative({ error: 'O valor não pode ser negativo.' })
    .max(1_000_000, { error: 'Valor muito alto.' })
    .transform((n) => Math.round(n * 100) / 100)
    .nullable(),
);

export const highlightSchema = z.object({
  type: z.enum(HIGHLIGHT_TYPE_KEYS),
  value: text(60),
});
export type PackageHighlight = z.infer<typeof highlightSchema>;

const packageFields = {
  name: text(120, 'O nome do pacote').min(1, { error: 'Dê um nome ao pacote.' }),
  subtitle: text(200).default(''),
  description: text(2000).default(''),
  category: text(80).default(''),
  price: priceSchema.default(null),
  promoPrice: priceSchema.default(null),
  highlights: z
    .array(highlightSchema)
    .max(CONTENT_LIMITS.packageHighlights)
    .transform((items) => items.filter((h) => h.value.length > 0))
    .default([]),
  includedItems: z
    .array(text(200))
    .max(CONTENT_LIMITS.packageItems)
    .transform((items) => items.filter((v) => v.length > 0))
    .default([]),
  extraInfo: text(1000).default(''),
  coverOnCard: z.boolean().default(false),
  featured: z.boolean().default(false),
  status: statusSchema.default('draft'),
};

/** Regras de preço válidas para um pacote completo. */
export function packagePriceIssues(p: {
  price?: number | null;
  promoPrice?: number | null;
  status?: PublicationStatus;
}): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (p.promoPrice != null && p.price != null && p.promoPrice >= p.price) {
    issues.push({ path: 'promoPrice', message: 'O preço promocional deve ser menor que o preço normal.' });
  }
  if (p.promoPrice != null && p.price == null) {
    issues.push({ path: 'price', message: 'Informe o preço normal antes do promocional.' });
  }
  if (p.status === 'published' && p.price == null) {
    issues.push({ path: 'price', message: 'Informe o preço para publicar.' });
  }
  return issues;
}

const priceRules = (v: Parameters<typeof packagePriceIssues>[0], ctx: z.RefinementCtx) => {
  for (const issue of packagePriceIssues(v)) ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.message });
};

export const packageCreateSchema = z
  .object({
    ...packageFields,
    cover: imageInputSchema.nullable().default(null),
    photos: z.array(imageInputSchema).max(CONTENT_LIMITS.packagePhotos).default([]),
  })
  .superRefine(priceRules);
export type PackageCreateInput = z.input<typeof packageCreateSchema>;
export type PackageCreateParsed = z.output<typeof packageCreateSchema>;

/** Atualização parcial; a validação cruzada de preços é refeita no service com os dados completos. */
export const packageUpdateSchema = z
  .object({
    ...packageFields,
    cover: imageInputSchema.nullable(),
    photos: z.array(imageInputSchema).max(CONTENT_LIMITS.packagePhotos),
  })
  .partial();
export type PackageUpdateInput = z.input<typeof packageUpdateSchema>;
export type PackageUpdateParsed = z.output<typeof packageUpdateSchema>;

export const packageListQuerySchema = z.object({
  status: statusSchema.optional(),
});

export interface Package {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  category: string;
  price: number | null;
  promoPrice: number | null;
  highlights: PackageHighlight[];
  includedItems: string[];
  extraInfo: string;
  cover: ImageValue | null;
  coverOnCard: boolean;
  photos: ImageValue[];
  featured: boolean;
  status: PublicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}
