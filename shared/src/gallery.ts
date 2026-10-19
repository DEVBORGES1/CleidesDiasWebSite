import { z } from 'zod';
import { idSchema, paginationQuerySchema, statusSchema, text } from './common.js';
import { IMAGE_RATIO_KEYS, type PublicationStatus } from './constants.js';
import type { ImageValue } from './image.js';

const framingFields = {
  alt: text(300, 'A descrição da foto').default(''),
  x: z.number().min(0).max(100).default(50),
  y: z.number().min(0).max(100).default(50),
  zoom: z.number().min(1).max(2.5).default(1),
  ratio: z.enum(IMAGE_RATIO_KEYS).default('auto'),
};

const galleryFields = {
  title: text(120, 'O título').default(''),
  description: text(500).default(''),
  category: text(60).default(''),
  status: statusSchema.default('draft'),
  ...framingFields,
};

/** Registra na galeria uma foto já enviada e confirmada (`assetId`). */
export const galleryCreateSchema = z.object({
  assetId: idSchema,
  ...galleryFields,
});
export type GalleryCreateInput = z.input<typeof galleryCreateSchema>;
export type GalleryCreateParsed = z.output<typeof galleryCreateSchema>;

/** Atualização parcial. Enviar `assetId` substitui a foto mantendo título, posição e status. */
export const galleryUpdateSchema = z.object({ assetId: idSchema, ...galleryFields }).partial();
export type GalleryUpdateInput = z.input<typeof galleryUpdateSchema>;
export type GalleryUpdateParsed = z.output<typeof galleryUpdateSchema>;

export const galleryPublishSchema = z.object({
  ids: z.array(idSchema).min(1).max(500),
  status: statusSchema,
});
export type GalleryPublishInput = z.infer<typeof galleryPublishSchema>;

export const galleryListQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().max(60).optional(),
  status: statusSchema.optional(),
});
export type GalleryListQuery = z.infer<typeof galleryListQuerySchema>;

export interface GalleryImage {
  id: string;
  title: string;
  description: string;
  category: string;
  status: PublicationStatus;
  position: number;
  image: ImageValue;
  createdAt: string;
  updatedAt: string;
}
