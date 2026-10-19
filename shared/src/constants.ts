/** Status de publicação usado por todo conteúdo gerenciável. */
export const PUBLICATION_STATUSES = ['draft', 'published'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

/** Formatos de enquadramento disponíveis para fotografias. */
export const IMAGE_RATIOS = [
  { key: 'auto', label: 'Original' },
  { key: '4/5', label: 'Retrato' },
  { key: '1/1', label: 'Quadrado' },
  { key: '3/2', label: 'Paisagem' },
  { key: '16/9', label: 'Panorâmica' },
] as const;
export type ImageRatio = (typeof IMAGE_RATIOS)[number]['key'];
export const IMAGE_RATIO_KEYS = IMAGE_RATIOS.map((r) => r.key) as [ImageRatio, ...ImageRatio[]];

/** Tipos de destaque ("resumo rápido") de um pacote, com o ícone exibido no site. */
export const HIGHLIGHT_TYPES = [
  { type: 'duracao', label: 'Duração', icon: 'schedule', placeholder: 'Ex.: Até 1 hora' },
  { type: 'fotos', label: 'Fotos incluídas', icon: 'photo_camera', placeholder: 'Ex.: 10 fotos' },
  { type: 'participantes', label: 'Participantes', icon: 'group', placeholder: 'Ex.: Até 4 pessoas' },
  { type: 'cenarios', label: 'Cenários', icon: 'park', placeholder: 'Ex.: 2 cenários' },
  { type: 'extra', label: 'Outro destaque', icon: 'auto_awesome', placeholder: 'Ex.: Álbum impresso' },
] as const;
export type HighlightType = (typeof HIGHLIGHT_TYPES)[number]['type'];
export const HIGHLIGHT_TYPE_KEYS = HIGHLIGHT_TYPES.map((h) => h.type) as [HighlightType, ...HighlightType[]];

/** Ícones disponíveis para as etapas da seção "Como funciona" (Material Symbols). */
export const STEP_ICONS = [
  'chat', 'calendar_month', 'payments', 'photo_library', 'photo_camera', 'event_available',
  'favorite', 'celebration', 'redeem', 'park', 'child_care', 'family_restroom', 'checkroom',
  'schedule', 'location_on', 'mail', 'call', 'handshake', 'auto_awesome', 'download', 'star',
  'cake', 'local_florist', 'home',
] as const;
export type StepIcon = (typeof STEP_ICONS)[number];

/** Chaves das seções editáveis armazenadas em `site_sections`. */
export const SECTION_KEYS = ['hero', 'about', 'packages', 'gallery', 'how', 'faq', 'contact', 'legal'] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** Finalidades de upload (definem a pasta no Cloudinary). */
export const UPLOAD_PURPOSES = ['gallery', 'package', 'section', 'step', 'brand'] as const;
export type UploadPurpose = (typeof UPLOAD_PURPOSES)[number];

/** Regras de validação de imagens enviadas pelo painel. */
export const IMAGE_UPLOAD_RULES = {
  maxBytes: 20 * 1024 * 1024,
  maxMegabytes: 20,
  minDimension: 200,
  maxDimension: 12000,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  formats: ['jpg', 'png', 'webp'] as const,
  accept: 'image/jpeg,image/png,image/webp',
} as const;

/** Limites gerais de conteúdo (evitam abusos e mantêm o site leve). */
export const CONTENT_LIMITS = {
  packages: 50,
  packagePhotos: 12,
  packageHighlights: 8,
  packageItems: 30,
  galleryImages: 500,
  faqItems: 200,
  steps: 30,
  listItems: 12,
  ticks: 16,
} as const;
