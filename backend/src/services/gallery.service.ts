import {
  CONTENT_LIMITS,
  galleryCreateSchema,
  galleryPublishSchema,
  galleryUpdateSchema,
  pickPresent,
  type GalleryImage,
  type GalleryListQuery,
  type PaginationMeta,
  type PublicationStatus,
} from '@cleides/shared';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { Repositories } from '../repositories/types.js';
import type { MediaService } from './media.service.js';
import { assertSameSet } from './ordering.js';
import type { SectionsService } from './sections.service.js';

export class GalleryService {
  constructor(
    private readonly repos: Repositories,
    private readonly media: MediaService,
    private readonly sections: SectionsService,
  ) {}

  async page(query: GalleryListQuery, onlyPublished: boolean): Promise<{ items: GalleryImage[]; meta: PaginationMeta }> {
    const status: PublicationStatus | undefined = onlyPublished ? 'published' : query.status;
    const { items, total } = await this.repos.gallery.page({
      status,
      category: query.category || undefined,
      offset: (query.page - 1) * query.limit,
      limit: query.limit,
    });
    return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) } };
  }

  listPublished(): Promise<GalleryImage[]> {
    return this.repos.gallery.list({ status: 'published' });
  }

  categories(onlyPublished: boolean): Promise<string[]> {
    return this.repos.gallery.categories(onlyPublished ? { status: 'published' } : {});
  }

  async get(id: string): Promise<GalleryImage> {
    const img = await this.repos.gallery.findById(id);
    if (!img) throw notFound('Foto não encontrada.');
    return img;
  }

  async create(raw: unknown): Promise<GalleryImage> {
    const input = parse(galleryCreateSchema, raw);
    const stats = await this.repos.gallery.stats();
    if (stats.total >= CONTENT_LIMITS.galleryImages) throw conflict(`Limite de ${CONTENT_LIMITS.galleryImages} fotos atingido.`);
    await this.media.requireActive(input.assetId);
    return this.repos.gallery.create({ ...input, position: await this.repos.gallery.nextPosition() });
  }

  async update(id: string, raw: unknown): Promise<GalleryImage> {
    const current = await this.get(id);
    const input = pickPresent(parse(galleryUpdateSchema, raw), raw);
    if (input.assetId) await this.media.requireActive(input.assetId);
    const updated = await this.repos.gallery.update(id, input);
    if (!updated) throw notFound('Foto não encontrada.');
    // Ao substituir a foto, o arquivo antigo é removido se não estiver em uso em outro lugar.
    if (input.assetId && current.image.assetId && input.assetId !== current.image.assetId) {
      await this.media.deleteIfUnreferenced(current.image.assetId);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const current = await this.get(id);
    await this.repos.gallery.delete(id);
    if (current.image.assetId) await this.media.deleteIfUnreferenced(current.image.assetId);
  }

  async setStatusMany(raw: unknown): Promise<{ updated: number }> {
    const input = parse(galleryPublishSchema, raw);
    return { updated: await this.repos.gallery.setStatus(input.ids, input.status) };
  }

  async reorder(ids: string[]): Promise<GalleryImage[]> {
    const all = await this.repos.gallery.list();
    assertSameSet(all.map((g) => g.id), ids);
    await this.repos.gallery.reorder(ids);
    return this.repos.gallery.list();
  }

  /** Usa a foto como imagem de destaque da capa do site. */
  async setAsCover(id: string, userId: string | null): Promise<GalleryImage> {
    const img = await this.get(id);
    await this.sections.setHeroImage(img.image, userId);
    return img;
  }
}
