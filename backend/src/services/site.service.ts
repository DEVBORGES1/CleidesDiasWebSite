import type { DashboardSummary, PublicSite } from '@cleides/shared';
import type { Repositories } from '../repositories/types.js';
import type { MediaService } from './media.service.js';
import type { SectionsService } from './sections.service.js';

export class SiteService {
  constructor(
    private readonly repos: Repositories,
    private readonly sections: SectionsService,
    private readonly media: MediaService,
  ) {}

  /**
   * Conteúdo completo da página inicial. Para visitantes, apenas itens publicados;
   * na pré-visualização autenticada (`preview`), inclui também os rascunhos.
   */
  async getSite(preview = false): Promise<PublicSite> {
    const status = preview ? undefined : ('published' as const);
    const [settings, sections, packages, gallery, faq, steps] = await Promise.all([
      this.repos.settings.get(),
      this.sections.getAll(),
      this.repos.packages.list({ status }),
      this.repos.gallery.list({ status }),
      this.repos.faq.list({ status }),
      this.repos.steps.list({ status }),
    ]);
    return { settings, sections, packages, gallery, faq, steps, preview };
  }

  async dashboard(): Promise<DashboardSummary> {
    const [packages, packageList, gallery, faq, steps, settings, sectionsUpdated, unusedMedia] = await Promise.all([
      this.repos.packages.stats(),
      this.repos.packages.list(),
      this.repos.gallery.stats(),
      this.repos.faq.stats(),
      this.repos.steps.stats(),
      this.repos.settings.get(),
      this.repos.sections.lastUpdatedAt(),
      this.media.enabled ? this.media.unusedCount() : Promise.resolve(0),
    ]);
    const dates = [settings.updatedAt, sectionsUpdated, ...packageList.map((p) => p.updatedAt)].filter(
      (d): d is string => !!d,
    );
    return {
      packages: { ...packages, featured: packageList.filter((p) => p.featured && p.status === 'published').length },
      gallery,
      faq,
      steps,
      visibleSections: [
        { key: 'pacotes', label: 'Pacotes', visible: packages.published > 0 },
        { key: 'galeria', label: 'Galeria', visible: gallery.published > 0 },
        { key: 'como-funciona', label: 'Como funciona', visible: steps.published > 0 },
        { key: 'duvidas', label: 'Dúvidas frequentes', visible: faq.published > 0 },
      ],
      pendingDrafts: packages.draft + gallery.draft + faq.draft + steps.draft,
      unusedMedia,
      whatsappConfigured: settings.whatsappNumber.length > 0,
      lastUpdatedAt: dates.sort().at(-1) ?? null,
    };
  }
}
