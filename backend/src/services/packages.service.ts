import {
  CONTENT_LIMITS,
  packageCreateSchema,
  packagePriceIssues,
  packageUpdateSchema,
  pickPresent,
  slugify,
  type Package,
  type PublicationStatus,
} from '@cleides/shared';
import { conflict, notFound, validationError } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { PackageRecordInput, Repositories } from '../repositories/types.js';
import type { MediaService } from './media.service.js';
import { assertSameSet } from './ordering.js';

export class PackagesService {
  constructor(
    private readonly repos: Repositories,
    private readonly media: MediaService,
  ) {}

  list(status?: PublicationStatus): Promise<Package[]> {
    return this.repos.packages.list({ status });
  }

  listPublished(): Promise<Package[]> {
    return this.repos.packages.list({ status: 'published' });
  }

  async get(id: string): Promise<Package> {
    const p = await this.repos.packages.findById(id);
    if (!p) throw notFound('Pacote não encontrado.');
    return p;
  }

  /** Busca pública por slug ou id: rascunhos nunca são retornados. */
  async getPublished(idOrSlug: string): Promise<Package> {
    const p = /^[0-9a-f-]{36}$/i.test(idOrSlug)
      ? await this.repos.packages.findById(idOrSlug)
      : await this.repos.packages.findBySlug(idOrSlug);
    if (!p || p.status !== 'published') throw notFound('Pacote não encontrado.');
    return p;
  }

  private async uniqueSlug(name: string, exceptId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    for (let n = 2; await this.repos.packages.slugExists(slug, exceptId); n++) slug = `${base}-${n}`;
    return slug;
  }

  async create(raw: unknown): Promise<Package> {
    const input = parse(packageCreateSchema, raw);
    const stats = await this.repos.packages.stats();
    if (stats.total >= CONTENT_LIMITS.packages) throw conflict(`Limite de ${CONTENT_LIMITS.packages} pacotes atingido.`);
    const record: PackageRecordInput = {
      ...input,
      slug: await this.uniqueSlug(input.name),
      cover: await this.media.resolveImage(input.cover),
      photos: await this.media.resolveImages(input.photos),
    };
    return this.repos.packages.create({ ...record, position: await this.repos.packages.nextPosition() });
  }

  async update(id: string, raw: unknown): Promise<Package> {
    const current = await this.get(id);
    const input = pickPresent(parse(packageUpdateSchema, raw), raw);
    const patch: Partial<PackageRecordInput> = { ...input, cover: undefined, photos: undefined };
    if ('cover' in input) patch.cover = await this.media.resolveImage(input.cover);
    if ('photos' in input) patch.photos = await this.media.resolveImages(input.photos ?? []);
    // O endereço só muda enquanto o pacote é rascunho, para não quebrar links já compartilhados.
    if (input.name && input.name !== current.name && current.status === 'draft' && (input.status ?? 'draft') === 'draft') {
      patch.slug = await this.uniqueSlug(input.name, id);
    }
    const merged = { ...current, ...compactPatch(patch) };
    const issues = packagePriceIssues(merged);
    if (issues.length) throw validationError(issues);
    const updated = await this.repos.packages.update(id, compactPatch(patch));
    if (!updated) throw notFound('Pacote não encontrado.');
    return updated;
  }

  setStatus(id: string, status: PublicationStatus): Promise<Package> {
    return this.update(id, { status });
  }

  async remove(id: string): Promise<void> {
    const current = await this.get(id);
    await this.repos.packages.delete(id);
    const assetIds = [current.cover, ...current.photos].map((i) => i?.assetId).filter((v): v is string => !!v);
    for (const assetId of assetIds) await this.media.deleteIfUnreferenced(assetId);
  }

  /** Cria uma cópia em rascunho, logo após o original. */
  async duplicate(id: string): Promise<Package> {
    const src = await this.get(id);
    const name = `${src.name} (cópia)`.slice(0, 120);
    const copy = await this.repos.packages.create({
      slug: await this.uniqueSlug(name),
      name,
      subtitle: src.subtitle,
      description: src.description,
      category: src.category,
      price: src.price,
      promoPrice: src.promoPrice,
      highlights: src.highlights,
      includedItems: src.includedItems,
      extraInfo: src.extraInfo,
      cover: src.cover,
      coverOnCard: src.coverOnCard,
      photos: src.photos,
      featured: false,
      status: 'draft',
      position: src.position + 1,
    });
    const ordered = (await this.repos.packages.list()).filter((p) => p.id !== copy.id);
    const idx = ordered.findIndex((p) => p.id === src.id);
    ordered.splice(idx + 1, 0, copy);
    await this.repos.packages.reorder(ordered.map((p) => p.id));
    return (await this.repos.packages.findById(copy.id)) ?? copy;
  }

  async reorder(ids: string[]): Promise<Package[]> {
    const all = await this.repos.packages.list();
    assertSameSet(all.map((p) => p.id), ids);
    await this.repos.packages.reorder(ids);
    return this.repos.packages.list();
  }
}

function compactPatch<T extends object>(patch: T): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
}
