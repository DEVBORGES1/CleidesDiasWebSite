/**
 * Repositórios que persistem no Supabase PostgreSQL via PostgREST.
 * Usam a service role (somente no backend); as regras de acesso de visitantes
 * e administradores são aplicadas pela API e reforçadas pelas políticas RLS.
 */
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminProfile,
  CollectionStats,
  FaqItem,
  GalleryImage,
  ImageRatio,
  ImageValue,
  LotPrice,
  Package,
  PackageHighlight,
  PriceLot,
  ProcessStep,
  PublicationStatus,
  SectionKey,
  SiteSections,
  SiteSettings,
  StepIcon,
  UploadPurpose,
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

type Row = Record<string, unknown>;

/** Converte erros do PostgREST em exceções sem expor detalhes ao cliente. */
export class DatabaseError extends Error {
  constructor(
    public readonly operation: string,
    public override readonly cause: PostgrestError,
  ) {
    super(`Falha no banco de dados (${operation}): ${cause.message}`);
    this.name = 'DatabaseError';
  }
}

function check<T>(operation: string, result: { data: T; error: PostgrestError | null }): T {
  if (result.error) throw new DatabaseError(operation, result.error);
  return result.data;
}

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

const statsFrom = (rows: { status: PublicationStatus }[]): CollectionStats => {
  const published = rows.filter((r) => r.status === 'published').length;
  return { total: rows.length, published, draft: rows.length - published };
};

/** Implementação base das coleções ordenáveis. */
abstract class SupabaseOrdered<T, Input> implements OrderedRepository<T, Input, Input> {
  protected abstract readonly table: string;
  protected readonly select: string = '*';

  constructor(protected readonly db: SupabaseClient) {}

  protected abstract toDomain(row: Row): T;
  protected abstract toRow(data: Partial<Input>): Row;

  async list(filter: StatusFilter = {}): Promise<T[]> {
    let q = this.db.from(this.table).select(this.select).order('position').order('created_at');
    if (filter.status) q = q.eq('status', filter.status);
    return (check(`${this.table}.list`, await q) as unknown as Row[]).map((r) => this.toDomain(r));
  }

  async findById(id: string): Promise<T | null> {
    const data = check(`${this.table}.findById`, await this.db.from(this.table).select(this.select).eq('id', id).maybeSingle());
    return data ? this.toDomain(data as unknown as Row) : null;
  }

  async create(data: Input & { position: number }): Promise<T> {
    const row = { ...this.toRow(data), position: data.position };
    const created = check(`${this.table}.create`, await this.db.from(this.table).insert(row).select(this.select).single());
    return this.toDomain(created as unknown as Row);
  }

  async update(id: string, data: Partial<Input>): Promise<T | null> {
    const row = this.toRow(data);
    if (Object.keys(row).length === 0) return this.findById(id);
    const updated = check(
      `${this.table}.update`,
      await this.db.from(this.table).update(row).eq('id', id).select(this.select).maybeSingle(),
    );
    return updated ? this.toDomain(updated as unknown as Row) : null;
  }

  async delete(id: string): Promise<boolean> {
    const data = check(`${this.table}.delete`, await this.db.from(this.table).delete().eq('id', id).select('id'));
    return (data ?? []).length > 0;
  }

  async reorder(ids: string[]): Promise<void> {
    check(`${this.table}.reorder`, await this.db.rpc('reorder_rows', { p_table: this.table, p_ids: ids }));
  }

  async nextPosition(): Promise<number> {
    const data = check(
      `${this.table}.nextPosition`,
      await this.db.from(this.table).select('position').order('position', { ascending: false }).limit(1),
    ) as { position: number }[];
    return data.length ? (data[0]?.position ?? 0) + 1 : 0;
  }

  async stats(): Promise<CollectionStats> {
    return statsFrom(check(`${this.table}.stats`, await this.db.from(this.table).select('status')) as { status: PublicationStatus }[]);
  }
}

/** Remove chaves `undefined` para que o update não sobrescreva colunas não enviadas. */
function compact(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

class SupabasePackages extends SupabaseOrdered<Package, PackageRecordInput> implements PackageRepository {
  protected readonly table = 'packages';

  protected toDomain(r: Row): Package {
    return {
      id: r.id as string,
      slug: r.slug as string,
      name: r.name as string,
      subtitle: r.subtitle as string,
      description: r.description as string,
      category: r.category as string,
      price: num(r.price),
      promoPrice: num(r.promo_price),
      highlights: (r.highlights as PackageHighlight[]) ?? [],
      includedItems: (r.included_items as string[]) ?? [],
      extraInfo: r.extra_info as string,
      cover: (r.cover as ImageValue | null) ?? null,
      coverOnCard: Boolean(r.cover_on_card),
      photos: (r.photos as ImageValue[]) ?? [],
      featured: Boolean(r.featured),
      status: r.status as PublicationStatus,
      position: r.position as number,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }

  protected toRow(d: Partial<PackageRecordInput>): Row {
    return compact({
      slug: d.slug,
      name: d.name,
      subtitle: d.subtitle,
      description: d.description,
      category: d.category,
      price: d.price,
      promo_price: d.promoPrice,
      highlights: d.highlights,
      included_items: d.includedItems,
      extra_info: d.extraInfo,
      cover: d.cover,
      cover_on_card: d.coverOnCard,
      photos: d.photos,
      featured: d.featured,
      status: d.status,
    });
  }

  async findBySlug(slug: string): Promise<Package | null> {
    const data = check('packages.findBySlug', await this.db.from(this.table).select('*').eq('slug', slug).maybeSingle());
    return data ? this.toDomain(data as Row) : null;
  }

  async slugExists(slug: string, exceptId?: string): Promise<boolean> {
    let q = this.db.from(this.table).select('id').eq('slug', slug);
    if (exceptId) q = q.neq('id', exceptId);
    return (check('packages.slugExists', await q) ?? []).length > 0;
  }
}

class SupabaseGallery extends SupabaseOrdered<GalleryImage, GalleryRecordInput> implements GalleryRepository {
  protected readonly table = 'gallery_images';
  protected override readonly select = '*, asset:media_assets(id, public_id, secure_url, width, height)';

  protected toDomain(r: Row): GalleryImage {
    const asset = (r.asset as Row | null) ?? {};
    return {
      id: r.id as string,
      title: r.title as string,
      description: r.description as string,
      category: r.category as string,
      status: r.status as PublicationStatus,
      position: r.position as number,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      image: {
        assetId: r.asset_id as string,
        url: (asset.secure_url as string) ?? '',
        publicId: (asset.public_id as string) ?? null,
        width: num(asset.width),
        height: num(asset.height),
        alt: r.alt as string,
        x: Number(r.focal_x),
        y: Number(r.focal_y),
        zoom: Number(r.zoom),
        ratio: r.ratio as ImageRatio,
      },
    };
  }

  protected toRow(d: Partial<GalleryRecordInput>): Row {
    return compact({
      asset_id: d.assetId,
      title: d.title,
      description: d.description,
      category: d.category,
      alt: d.alt,
      focal_x: d.x,
      focal_y: d.y,
      zoom: d.zoom,
      ratio: d.ratio,
      status: d.status,
    });
  }

  async page(o: GalleryListOptions): Promise<{ items: GalleryImage[]; total: number }> {
    let q = this.db.from(this.table).select(this.select, { count: 'exact' }).order('position').order('created_at');
    if (o.status) q = q.eq('status', o.status);
    if (o.category) q = q.eq('category', o.category);
    if (o.limit !== undefined) {
      const offset = o.offset ?? 0;
      q = q.range(offset, offset + o.limit - 1);
    }
    const result = await q;
    const data = check('gallery.page', result) as unknown as Row[];
    return { items: data.map((r) => this.toDomain(r)), total: result.count ?? data.length };
  }

  async setStatus(ids: string[], status: PublicationStatus): Promise<number> {
    const data = check('gallery.setStatus', await this.db.from(this.table).update({ status }).in('id', ids).select('id'));
    return (data ?? []).length;
  }

  async categories(filter: StatusFilter = {}): Promise<string[]> {
    let q = this.db.from(this.table).select('category').neq('category', '');
    if (filter.status) q = q.eq('status', filter.status);
    const rows = check('gallery.categories', await q) as { category: string }[];
    return [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }

  async assetIds(): Promise<string[]> {
    const rows = check('gallery.assetIds', await this.db.from(this.table).select('asset_id')) as { asset_id: string }[];
    return rows.map((r) => r.asset_id);
  }
}

class SupabaseFaq extends SupabaseOrdered<FaqItem, FaqRecordInput> {
  protected readonly table = 'faq_items';
  protected toDomain(r: Row): FaqItem {
    return {
      id: r.id as string,
      question: r.question as string,
      answer: r.answer as string,
      category: r.category as string,
      status: r.status as PublicationStatus,
      position: r.position as number,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
  protected toRow(d: Partial<FaqRecordInput>): Row {
    return compact({ question: d.question, answer: d.answer, category: d.category, status: d.status });
  }
}

class SupabaseSteps extends SupabaseOrdered<ProcessStep, StepRecordInput> {
  protected readonly table = 'process_steps';
  protected toDomain(r: Row): ProcessStep {
    return {
      id: r.id as string,
      title: r.title as string,
      description: r.description as string,
      note: r.note as string,
      icon: r.icon as StepIcon,
      image: (r.image as ImageValue | null) ?? null,
      status: r.status as PublicationStatus,
      position: r.position as number,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
  protected toRow(d: Partial<StepRecordInput>): Row {
    return compact({ title: d.title, description: d.description, note: d.note, icon: d.icon, image: d.image, status: d.status });
  }
}

class SupabaseLots extends SupabaseOrdered<PriceLot, LotRecordInput> implements LotRepository {
  protected readonly table = 'price_lots';
  protected toDomain(r: Row): PriceLot {
    return {
      id: r.id as string,
      name: r.name as string,
      endsOn: r.ends_on as string,
      prices: ((r.prices as LotPrice[] | null) ?? []).map((p) => ({ packageId: p.packageId, price: Number(p.price) })),
      status: r.status as PublicationStatus,
      position: r.position as number,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    };
  }
  protected toRow(d: Partial<LotRecordInput>): Row {
    return compact({ name: d.name, ends_on: d.endsOn, prices: d.prices, status: d.status });
  }
  async endsOnExists(endsOn: string, exceptId?: string): Promise<boolean> {
    let q = this.db.from(this.table).select('id').eq('ends_on', endsOn);
    if (exceptId) q = q.neq('id', exceptId);
    return (check('price_lots.endsOnExists', await q) as Row[]).length > 0;
  }
}

class SupabaseSettings implements SettingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  private toDomain(r: Row): SiteSettings {
    // O schema completa valores padrão para chaves ausentes nos campos JSON.
    return siteSettingsSchema.parse({
      brandName: r.brand_name,
      brandSubtitle: r.brand_subtitle,
      whatsappNumber: r.whatsapp_number,
      phoneDisplay: r.phone_display,
      phoneLabel: r.phone_label,
      email: r.email,
      instagram: r.instagram,
      instagramLabel: r.instagram_label,
      city: r.city,
      cityNote: r.city_note,
      socialLinks: r.social_links,
      whatsappMessages: r.whatsapp_messages,
      nav: r.nav,
      footer: r.footer,
      seo: r.seo,
      logo: r.logo ?? null,
      seoImage: r.seo_image ?? null,
      updatedAt: r.updated_at,
    });
  }

  async get(): Promise<SiteSettings> {
    const data = check('settings.get', await this.db.from('site_settings').select('*').eq('id', 1).maybeSingle());
    if (data) return this.toDomain(data as Row);
    const created = check('settings.init', await this.db.from('site_settings').insert({ id: 1 }).select('*').single());
    return this.toDomain(created as Row);
  }

  async update(d: Partial<SettingsRecord>, userId: string | null): Promise<SiteSettings> {
    const row = compact({
      brand_name: d.brandName,
      brand_subtitle: d.brandSubtitle,
      whatsapp_number: d.whatsappNumber,
      phone_display: d.phoneDisplay,
      phone_label: d.phoneLabel,
      email: d.email,
      instagram: d.instagram,
      instagram_label: d.instagramLabel,
      city: d.city,
      city_note: d.cityNote,
      social_links: d.socialLinks,
      whatsapp_messages: d.whatsappMessages,
      nav: d.nav,
      footer: d.footer,
      seo: d.seo,
      logo: d.logo,
      seo_image: d.seoImage,
      updated_by: userId,
    });
    const data = check(
      'settings.update',
      await this.db.from('site_settings').upsert({ id: 1, ...row }).select('*').single(),
    );
    return this.toDomain(data as Row);
  }
}

class SupabaseSections implements SectionsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getAll(): Promise<Partial<Record<SectionKey, unknown>>> {
    const rows = check('sections.getAll', await this.db.from('site_sections').select('key, content')) as {
      key: SectionKey;
      content: unknown;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.content]));
  }

  async upsert<K extends SectionKey>(key: K, content: SiteSections[K], userId: string | null): Promise<void> {
    check('sections.upsert', await this.db.from('site_sections').upsert({ key, content, updated_by: userId }));
  }

  async insertIfMissing<K extends SectionKey>(key: K, content: SiteSections[K]): Promise<boolean> {
    const data = check(
      'sections.insertIfMissing',
      await this.db.from('site_sections').upsert({ key, content }, { onConflict: 'key', ignoreDuplicates: true }).select('key'),
    );
    return (data ?? []).length > 0;
  }

  async lastUpdatedAt(): Promise<string | null> {
    const data = check(
      'sections.lastUpdatedAt',
      await this.db.from('site_sections').select('updated_at').order('updated_at', { ascending: false }).limit(1),
    ) as { updated_at: string }[];
    return data[0]?.updated_at ?? null;
  }
}

class SupabaseMedia implements MediaRepository {
  constructor(private readonly db: SupabaseClient) {}

  private toDomain(r: Row): MediaRecord {
    return {
      id: r.id as string,
      publicId: r.public_id as string,
      purpose: r.purpose as UploadPurpose,
      status: r.status as MediaRecord['status'],
      url: (r.secure_url as string | null) ?? null,
      format: (r.format as string | null) ?? null,
      width: num(r.width),
      height: num(r.height),
      bytes: num(r.bytes),
      createdBy: (r.created_by as string | null) ?? null,
      createdAt: r.created_at as string,
      confirmedAt: (r.confirmed_at as string | null) ?? null,
    };
  }

  async createPending(d: { publicId: string; purpose: UploadPurpose; createdBy: string }): Promise<MediaRecord> {
    const data = check(
      'media.createPending',
      await this.db
        .from('media_assets')
        .insert({ public_id: d.publicId, purpose: d.purpose, created_by: d.createdBy })
        .select('*')
        .single(),
    );
    return this.toDomain(data as Row);
  }

  async findById(id: string): Promise<MediaRecord | null> {
    const data = check('media.findById', await this.db.from('media_assets').select('*').eq('id', id).maybeSingle());
    return data ? this.toDomain(data as Row) : null;
  }

  async findByIds(ids: string[]): Promise<MediaRecord[]> {
    if (ids.length === 0) return [];
    const data = check('media.findByIds', await this.db.from('media_assets').select('*').in('id', ids)) as Row[];
    return data.map((r) => this.toDomain(r));
  }

  async findByPublicId(publicId: string): Promise<MediaRecord | null> {
    const data = check(
      'media.findByPublicId',
      await this.db.from('media_assets').select('*').eq('public_id', publicId).maybeSingle(),
    );
    return data ? this.toDomain(data as Row) : null;
  }

  async activate(
    id: string,
    m: { url: string; format: string; width: number; height: number; bytes: number },
  ): Promise<MediaRecord> {
    const data = check(
      'media.activate',
      await this.db
        .from('media_assets')
        .update({
          status: 'active',
          secure_url: m.url,
          format: m.format,
          width: m.width,
          height: m.height,
          bytes: m.bytes,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .single(),
    );
    return this.toDomain(data as Row);
  }

  async markDeleted(id: string): Promise<void> {
    check(
      'media.markDeleted',
      await this.db.from('media_assets').update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', id),
    );
  }

  async listCandidatesForCleanup(before: string): Promise<MediaRecord[]> {
    const data = check(
      'media.listCandidatesForCleanup',
      await this.db.from('media_assets').select('*').neq('status', 'deleted').lt('created_at', before).limit(500),
    ) as Row[];
    return data.map((r) => this.toDomain(r));
  }
}

class SupabaseProfiles implements ProfileRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findById(id: string): Promise<AdminProfile | null> {
    const data = check('profiles.findById', await this.db.from('profiles').select('*').eq('id', id).maybeSingle()) as Row | null;
    if (!data || data.role !== 'admin') return null;
    return { id: data.id as string, email: data.email as string, fullName: data.full_name as string, role: 'admin' };
  }
}

export function createSupabaseRepositories(db: SupabaseClient): Repositories {
  return {
    packages: new SupabasePackages(db),
    gallery: new SupabaseGallery(db),
    faq: new SupabaseFaq(db),
    steps: new SupabaseSteps(db),
    lots: new SupabaseLots(db),
    settings: new SupabaseSettings(db),
    sections: new SupabaseSections(db),
    media: new SupabaseMedia(db),
    profiles: new SupabaseProfiles(db),
  };
}
