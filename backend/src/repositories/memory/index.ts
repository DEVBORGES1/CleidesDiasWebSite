/**
 * Repositórios em memória. Usados nos testes automatizados e no modo de
 * desenvolvimento local sem Supabase (DATA_DRIVER=memory). Não persistem dados.
 */
import { randomUUID } from 'node:crypto';
import type {
  AdminProfile,
  CollectionStats,
  FaqItem,
  GalleryImage,
  Package,
  PriceLot,
  ProcessStep,
  PublicationStatus,
  SectionKey,
  SiteSections,
  SiteSettings,
} from '@cleides/shared';
import { siteSettingsSchema } from '@cleides/shared';
import type {
  FaqRecordInput,
  GalleryListOptions,
  GalleryRecordInput,
  GalleryRepository,
  LotRecordInput,
  LotRepository,
  MediaRecord,
  MediaRepository,
  OrderedRepository,
  PackageRecordInput,
  PackageRepository,
  ProfileRepository,
  Repositories,
  SectionsRepository,
  SettingsRecord,
  SettingsRepository,
  StatusFilter,
  StepRecordInput,
} from '../types.js';

const now = () => new Date().toISOString();
const clone = <T>(v: T): T => structuredClone(v);

interface Base {
  id: string;
  status: PublicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}

class MemoryOrdered<Row extends Base, View, Input extends object> implements OrderedRepository<View, Input, Input> {
  protected rows = new Map<string, Row>();

  constructor(
    protected readonly build: (input: Input, base: Base) => Row,
    protected readonly view: (row: Row) => View = (row) => row as unknown as View,
  ) {}

  protected sorted(filter: StatusFilter = {}): Row[] {
    return [...this.rows.values()]
      .filter((r) => !filter.status || r.status === filter.status)
      .sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
  }

  async list(filter: StatusFilter = {}): Promise<View[]> {
    return this.sorted(filter).map((r) => clone(this.view(r)));
  }

  async findById(id: string): Promise<View | null> {
    const row = this.rows.get(id);
    return row ? clone(this.view(row)) : null;
  }

  async create(data: Input & { position: number }): Promise<View> {
    const ts = now();
    const { position, ...input } = data;
    const row = this.build(input as unknown as Input, { id: randomUUID(), status: 'draft', position, createdAt: ts, updatedAt: ts });
    this.rows.set(row.id, row);
    return clone(this.view(row));
  }

  async update(id: string, data: Partial<Input>): Promise<View | null> {
    const row = this.rows.get(id);
    if (!row) return null;
    const next = { ...row, ...data, updatedAt: now() } as Row;
    this.rows.set(id, next);
    return clone(this.view(next));
  }

  async delete(id: string): Promise<boolean> {
    return this.rows.delete(id);
  }

  async reorder(ids: string[]): Promise<void> {
    ids.forEach((id, index) => {
      const row = this.rows.get(id);
      if (row) row.position = index;
    });
  }

  async nextPosition(): Promise<number> {
    const all = this.sorted();
    return all.length ? Math.max(...all.map((r) => r.position)) + 1 : 0;
  }

  async stats(): Promise<CollectionStats> {
    const all = [...this.rows.values()];
    const published = all.filter((r) => r.status === 'published').length;
    return { total: all.length, published, draft: all.length - published };
  }
}

const merge = <I extends object, R>(input: I, base: Base) => ({ ...base, ...input }) as R;

class MemoryPackages extends MemoryOrdered<Package, Package, PackageRecordInput> implements PackageRepository {
  constructor() {
    super(merge);
  }
  async findBySlug(slug: string) {
    const row = [...this.rows.values()].find((r) => r.slug === slug);
    return row ? clone(row) : null;
  }
  async slugExists(slug: string, exceptId?: string) {
    return [...this.rows.values()].some((r) => r.slug === slug && r.id !== exceptId);
  }
}

type GalleryRow = Base & GalleryRecordInput;

class MemoryGallery extends MemoryOrdered<GalleryRow, GalleryImage, GalleryRecordInput> implements GalleryRepository {
  constructor(media: MemoryMedia) {
    super(merge, (row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      status: row.status,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      image: media.imageFor(row),
    }));
  }
  async page(o: GalleryListOptions) {
    const all = (await this.list({ status: o.status })).filter((g) => !o.category || g.category === o.category);
    const offset = o.offset ?? 0;
    return { items: all.slice(offset, offset + (o.limit ?? all.length)), total: all.length };
  }
  async setStatus(ids: string[], status: PublicationStatus) {
    let n = 0;
    for (const id of ids) {
      const row = this.rows.get(id);
      if (row) {
        row.status = status;
        row.updatedAt = now();
        n++;
      }
    }
    return n;
  }
  async categories(filter: StatusFilter = {}) {
    const set = new Set(this.sorted(filter).map((g) => g.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  async assetIds() {
    return [...this.rows.values()].map((r) => r.assetId);
  }
}

class MemoryFaq extends MemoryOrdered<FaqItem, FaqItem, FaqRecordInput> {
  constructor() {
    super(merge);
  }
}

class MemorySteps extends MemoryOrdered<ProcessStep, ProcessStep, StepRecordInput> {
  constructor() {
    super(merge);
  }
}

class MemoryLots extends MemoryOrdered<PriceLot, PriceLot, LotRecordInput> implements LotRepository {
  constructor() {
    super(merge);
  }
  async endsOnExists(endsOn: string, exceptId?: string) {
    return [...this.rows.values()].some((r) => r.endsOn === endsOn && r.id !== exceptId);
  }
}

class MemorySettings implements SettingsRepository {
  private value: SiteSettings = siteSettingsSchema.parse({ brandName: 'Cleides Dias', logo: null, seoImage: null, updatedAt: now() });
  async get() {
    return clone(this.value);
  }
  async update(data: Partial<SettingsRecord>) {
    this.value = { ...this.value, ...data, updatedAt: now() };
    return clone(this.value);
  }
}

class MemorySections implements SectionsRepository {
  private data: Partial<Record<SectionKey, unknown>> = {};
  private updated: string | null = null;
  async getAll() {
    return clone(this.data);
  }
  async upsert<K extends SectionKey>(key: K, content: SiteSections[K]) {
    this.data[key] = clone(content);
    this.updated = now();
  }
  async insertIfMissing<K extends SectionKey>(key: K, content: SiteSections[K]) {
    if (key in this.data) return false;
    await this.upsert(key, content);
    return true;
  }
  async lastUpdatedAt() {
    return this.updated;
  }
}

export class MemoryMedia implements MediaRepository {
  rows = new Map<string, MediaRecord>();

  imageFor(input: Pick<GalleryRecordInput, 'assetId' | 'alt' | 'x' | 'y' | 'zoom' | 'ratio'>) {
    const asset = this.rows.get(input.assetId);
    return {
      assetId: input.assetId,
      url: asset?.url ?? '',
      publicId: asset?.publicId ?? null,
      width: asset?.width ?? null,
      height: asset?.height ?? null,
      alt: input.alt,
      x: input.x,
      y: input.y,
      zoom: input.zoom,
      ratio: input.ratio,
    };
  }

  async createPending(data: { publicId: string; purpose: MediaRecord['purpose']; createdBy: string }) {
    const row: MediaRecord = {
      id: randomUUID(),
      publicId: data.publicId,
      purpose: data.purpose,
      status: 'pending',
      url: null,
      format: null,
      width: null,
      height: null,
      bytes: null,
      createdBy: data.createdBy,
      createdAt: now(),
      confirmedAt: null,
    };
    this.rows.set(row.id, row);
    return clone(row);
  }
  async findById(id: string) {
    const r = this.rows.get(id);
    return r ? clone(r) : null;
  }
  async findByIds(ids: string[]) {
    return ids.map((id) => this.rows.get(id)).filter((r): r is MediaRecord => !!r).map(clone);
  }
  async findByPublicId(publicId: string) {
    const r = [...this.rows.values()].find((m) => m.publicId === publicId);
    return r ? clone(r) : null;
  }
  async activate(id: string, meta: { url: string; format: string; width: number; height: number; bytes: number }) {
    const r = this.rows.get(id)!;
    Object.assign(r, meta, { status: 'active', confirmedAt: now() });
    return clone(r);
  }
  async markDeleted(id: string) {
    const r = this.rows.get(id);
    if (r) r.status = 'deleted';
  }
  async listCandidatesForCleanup(before: string) {
    return [...this.rows.values()].filter((m) => m.status !== 'deleted' && m.createdAt < before).map(clone);
  }
}

export class MemoryProfiles implements ProfileRepository {
  profiles = new Map<string, AdminProfile>();
  async findById(id: string) {
    return this.profiles.get(id) ?? null;
  }
}

export function createMemoryRepositories(): Repositories & { media: MemoryMedia; profiles: MemoryProfiles } {
  const media = new MemoryMedia();
  return {
    packages: new MemoryPackages(),
    gallery: new MemoryGallery(media),
    faq: new MemoryFaq(),
    steps: new MemorySteps(),
    lots: new MemoryLots(),
    settings: new MemorySettings(),
    sections: new MemorySections(),
    media,
    profiles: new MemoryProfiles(),
  };
}
