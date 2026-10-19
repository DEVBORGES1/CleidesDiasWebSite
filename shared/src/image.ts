import { z } from 'zod';
import { idSchema, text } from './common.js';
import { IMAGE_RATIO_KEYS } from './constants.js';

/** Caminho de imagem estática servida pelo próprio frontend (usada nos dados de demonstração). */
export const STATIC_IMAGE_PATTERN = /^\/images\/[\w./-]+\.(jpe?g|png|webp|avif)$/i;

const framing = {
  alt: text(300, 'A descrição da foto').default(''),
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
  zoom: z.number().min(1).max(2.5).default(1),
  ratio: z.enum(IMAGE_RATIO_KEYS).default('auto'),
};

/**
 * Imagem como é enviada pelo painel. O navegador informa apenas o identificador
 * do arquivo já confirmado no servidor (`assetId`) e os ajustes de enquadramento;
 * URL, dimensões e `publicId` são sempre preenchidos pelo backend.
 */
export const imageInputSchema = z
  .object({
    assetId: idSchema.nullable().default(null),
    url: z.string().max(300).optional(),
    ...framing,
  })
  .refine((v) => v.assetId !== null || (v.url !== undefined && STATIC_IMAGE_PATTERN.test(v.url)), {
    error: 'Imagem inválida. Envie a foto pelo painel.',
    path: ['assetId'],
  });
export type ImageInput = z.input<typeof imageInputSchema>;

/** Imagem como é armazenada e devolvida pela API. */
export const imageSchema = z.object({
  assetId: idSchema.nullable(),
  url: z.string(),
  publicId: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  ...framing,
});
export type ImageValue = z.infer<typeof imageSchema>;

export { imageAspect, ratioLabel } from './image-utils.js';
