import type {
  AdminProfile,
  DashboardSummary,
  FaqCreateInput,
  FaqItem,
  FaqUpdateInput,
  GalleryCreateInput,
  GalleryImage,
  GalleryUpdateInput,
  MediaAsset,
  MediaCleanupResult,
  Package,
  PackageCreateInput,
  PackageUpdateInput,
  ProcessStep,
  PublicSite,
  PublicationStatus,
  SectionInput,
  SectionKey,
  SiteSections,
  SiteSettings,
  SiteSettingsUpdate,
  StepCreateInput,
  StepUpdateInput,
  UploadPurpose,
  UploadSignature,
} from '@cleides/shared';
import { request } from './http';

const data = async <T>(p: Promise<{ data: T }>) => (await p).data;

/** Endpoints públicos (somente conteúdo publicado). */
export const publicApi = {
  site: (signal?: AbortSignal) => data(request<PublicSite>('/site', { signal })),
  package: (slug: string) => data(request<Package>(`/packages/${encodeURIComponent(slug)}`)),
};

/** Endpoints do painel (exigem login de administradora). */
export const adminApi = {
  me: () => data(request<AdminProfile>('/admin/me', { auth: true })),
  dashboard: () => data(request<DashboardSummary>('/admin/dashboard', { auth: true })),
  preview: () => data(request<PublicSite>('/admin/preview', { auth: true })),
  seedDemo: () => data(request<{ seeded: string[] }>('/admin/demo-content', { method: 'POST', auth: true })),

  packages: {
    list: () => data(request<Package[]>('/admin/packages', { auth: true })),
    get: (id: string) => data(request<Package>(`/admin/packages/${id}`, { auth: true })),
    create: (body: PackageCreateInput) => data(request<Package>('/admin/packages', { method: 'POST', body, auth: true })),
    update: (id: string, body: PackageUpdateInput) =>
      data(request<Package>(`/admin/packages/${id}`, { method: 'PATCH', body, auth: true })),
    remove: (id: string) => data(request<void>(`/admin/packages/${id}`, { method: 'DELETE', auth: true })),
    duplicate: (id: string) => data(request<Package>(`/admin/packages/${id}/duplicate`, { method: 'POST', auth: true })),
    reorder: (ids: string[]) => data(request<Package[]>('/admin/packages/order', { method: 'PUT', body: { ids }, auth: true })),
  },

  gallery: {
    list: () => data(request<GalleryImage[]>('/admin/gallery?limit=200', { auth: true })),
    create: (body: GalleryCreateInput) => data(request<GalleryImage>('/admin/gallery', { method: 'POST', body, auth: true })),
    update: (id: string, body: GalleryUpdateInput) =>
      data(request<GalleryImage>(`/admin/gallery/${id}`, { method: 'PATCH', body, auth: true })),
    remove: (id: string) => data(request<void>(`/admin/gallery/${id}`, { method: 'DELETE', auth: true })),
    setStatus: (ids: string[], status: PublicationStatus) =>
      data(request<{ updated: number }>('/admin/gallery/status', { method: 'POST', body: { ids, status }, auth: true })),
    reorder: (ids: string[]) => data(request<GalleryImage[]>('/admin/gallery/order', { method: 'PUT', body: { ids }, auth: true })),
    setCover: (id: string) => data(request<GalleryImage>(`/admin/gallery/${id}/cover`, { method: 'POST', auth: true })),
  },

  faq: {
    list: () => data(request<FaqItem[]>('/admin/faq', { auth: true })),
    create: (body: FaqCreateInput) => data(request<FaqItem>('/admin/faq', { method: 'POST', body, auth: true })),
    update: (id: string, body: FaqUpdateInput) => data(request<FaqItem>(`/admin/faq/${id}`, { method: 'PATCH', body, auth: true })),
    remove: (id: string) => data(request<void>(`/admin/faq/${id}`, { method: 'DELETE', auth: true })),
    reorder: (ids: string[]) => data(request<FaqItem[]>('/admin/faq/order', { method: 'PUT', body: { ids }, auth: true })),
  },

  steps: {
    list: () => data(request<ProcessStep[]>('/admin/steps', { auth: true })),
    create: (body: StepCreateInput) => data(request<ProcessStep>('/admin/steps', { method: 'POST', body, auth: true })),
    update: (id: string, body: StepUpdateInput) =>
      data(request<ProcessStep>(`/admin/steps/${id}`, { method: 'PATCH', body, auth: true })),
    remove: (id: string) => data(request<void>(`/admin/steps/${id}`, { method: 'DELETE', auth: true })),
    duplicate: (id: string) => data(request<ProcessStep>(`/admin/steps/${id}/duplicate`, { method: 'POST', auth: true })),
    reorder: (ids: string[]) => data(request<ProcessStep[]>('/admin/steps/order', { method: 'PUT', body: { ids }, auth: true })),
  },

  sections: {
    list: () => data(request<SiteSections>('/admin/sections', { auth: true })),
    update: <K extends SectionKey>(key: K, body: Partial<SectionInput<K>>) =>
      data(request<SiteSections[K]>(`/admin/sections/${key}`, { method: 'PATCH', body, auth: true })),
  },

  settings: {
    get: () => data(request<SiteSettings>('/admin/settings', { auth: true })),
    update: (body: SiteSettingsUpdate) => data(request<SiteSettings>('/admin/settings', { method: 'PATCH', body, auth: true })),
  },

  media: {
    status: () => data(request<{ enabled: boolean }>('/admin/media/status', { auth: true })),
    signature: (purpose: UploadPurpose) =>
      data(request<UploadSignature>('/admin/uploads/signature', { method: 'POST', body: { purpose }, auth: true })),
    confirm: (publicId: string) => data(request<MediaAsset>('/admin/uploads/confirm', { method: 'POST', body: { publicId }, auth: true })),
    discard: (id: string) => data(request<void>(`/admin/media/${id}`, { method: 'DELETE', auth: true })),
    cleanup: () => data(request<MediaCleanupResult>('/admin/media/cleanup', { method: 'POST', auth: true })),
  },
};
