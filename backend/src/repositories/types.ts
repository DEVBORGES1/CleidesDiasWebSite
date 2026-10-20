import type {
  AdminProfile,
  CollectionStats,
  FaqItem,
  GalleryImage,
  ImageRatio,
  ImageValue,
  LotPrice,
  MediaAsset,
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

export interface StatusFilter {
  status?: PublicationStatus;
}

/** Operações comuns às coleções ordenáveis (pacotes, galeria, perguntas e etapas). */
export interface OrderedRepository<T, Create, Update> {
  list(filter?: StatusFilter): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Create & { position: number }): Promise<T>;
  update(id: string, data: Partial<Update>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  /** Grava a nova ordem; `ids` deve conter os registros na sequência desejada. */
  reorder(ids: string[]): Promise<void>;
  nextPosition(): Promise<number>;
  stats(): Promise<CollectionStats>;
}

export interface PackageRecordInput {
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
}

export interface PackageRepository extends OrderedRepository<Package, PackageRecordInput, PackageRecordInput> {
  findBySlug(slug: string): Promise<Package | null>;
  slugExists(slug: string, exceptId?: string): Promise<boolean>;
}

export interface GalleryRecordInput {
  assetId: string;
  title: string;
  description: string;
  category: string;
  alt: string;
  x: number;
  y: number;
  zoom: number;
  ratio: ImageRatio;
  status: PublicationStatus;
}

export interface GalleryListOptions extends StatusFilter {
  category?: string;
  offset?: number;
  limit?: number;
}

export interface GalleryRepository extends OrderedRepository<GalleryImage, GalleryRecordInput, GalleryRecordInput> {
  page(options: GalleryListOptions): Promise<{ items: GalleryImage[]; total: number }>;
  setStatus(ids: string[], status: PublicationStatus): Promise<number>;
  categories(filter?: StatusFilter): Promise<string[]>;
  assetIds(): Promise<string[]>;
}

export interface FaqRecordInput {
  question: string;
  answer: string;
  category: string;
  status: PublicationStatus;
}
export type FaqRepository = OrderedRepository<FaqItem, FaqRecordInput, FaqRecordInput>;

export interface StepRecordInput {
  title: string;
  description: string;
  note: string;
  icon: StepIcon;
  image: ImageValue | null;
  status: PublicationStatus;
}
export type StepRepository = OrderedRepository<ProcessStep, StepRecordInput, StepRecordInput>;

export interface LotRecordInput {
  name: string;
  endsOn: string;
  prices: LotPrice[];
  status: PublicationStatus;
}
export interface LotRepository extends OrderedRepository<PriceLot, LotRecordInput, LotRecordInput> {
  endsOnExists(endsOn: string, exceptId?: string): Promise<boolean>;
}

export type SettingsRecord = Omit<SiteSettings, 'updatedAt'>;

export interface SettingsRepository {
  get(): Promise<SiteSettings>;
  update(data: Partial<SettingsRecord>, userId: string | null): Promise<SiteSettings>;
}

export interface SectionsRepository {
  /** Conteúdo bruto por chave (validado/normalizado pelo service). */
  getAll(): Promise<Partial<Record<SectionKey, unknown>> & { updatedAt?: string | null }>;
  upsert<K extends SectionKey>(key: K, content: SiteSections[K], userId: string | null): Promise<void>;
  /** Insere a seção apenas se ainda não existir (usado pelo seed). */
  insertIfMissing<K extends SectionKey>(key: K, content: SiteSections[K]): Promise<boolean>;
  lastUpdatedAt(): Promise<string | null>;
}

export type MediaStatus = 'pending' | 'active' | 'deleted';

export interface MediaRecord extends Omit<MediaAsset, 'url' | 'format' | 'width' | 'height' | 'bytes'> {
  status: MediaStatus;
  url: string | null;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdBy: string | null;
  confirmedAt: string | null;
}

export interface MediaRepository {
  createPending(data: { publicId: string; purpose: UploadPurpose; createdBy: string }): Promise<MediaRecord>;
  findById(id: string): Promise<MediaRecord | null>;
  findByIds(ids: string[]): Promise<MediaRecord[]>;
  findByPublicId(publicId: string): Promise<MediaRecord | null>;
  activate(
    id: string,
    meta: { url: string; format: string; width: number; height: number; bytes: number },
  ): Promise<MediaRecord>;
  markDeleted(id: string): Promise<void>;
  /** Uploads nunca confirmados e arquivos ativos criados antes de `before`. */
  listCandidatesForCleanup(before: string): Promise<MediaRecord[]>;
}

export interface ProfileRepository {
  findById(id: string): Promise<AdminProfile | null>;
}

export interface Repositories {
  packages: PackageRepository;
  gallery: GalleryRepository;
  faq: FaqRepository;
  steps: StepRepository;
  lots: LotRepository;
  settings: SettingsRepository;
  sections: SectionsRepository;
  media: MediaRepository;
  profiles: ProfileRepository;
}
