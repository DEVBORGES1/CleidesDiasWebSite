import type { FaqItem } from './faq.js';
import type { GalleryImage } from './gallery.js';
import type { Package } from './packages.js';
import type { SiteSections } from './sections.js';
import type { SiteSettings } from './settings.js';
import type { ProcessStep } from './steps.js';

/** Tudo o que o site público precisa para renderizar a página inicial em uma única requisição. */
export interface PublicSite {
  settings: SiteSettings;
  sections: SiteSections;
  packages: Package[];
  gallery: GalleryImage[];
  faq: FaqItem[];
  steps: ProcessStep[];
  /** `true` quando o conteúdo inclui rascunhos (pré-visualização autenticada). */
  preview: boolean;
}

export interface CollectionStats {
  total: number;
  published: number;
  draft: number;
}

export interface DashboardSummary {
  packages: CollectionStats & { featured: number };
  gallery: CollectionStats;
  faq: CollectionStats;
  steps: CollectionStats;
  /** Seções que aparecem no site (as que não têm nada publicado ficam ocultas). */
  visibleSections: { key: 'pacotes' | 'galeria' | 'como-funciona' | 'duvidas'; label: string; visible: boolean }[];
  pendingDrafts: number;
  unusedMedia: number;
  whatsappConfigured: boolean;
  lastUpdatedAt: string | null;
}

export interface AdminProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin';
}
