import { instagramUrl, whatsappLink } from '@cleides/shared/utils';
import type { PublicSite } from '@cleides/shared';

/** Valores derivados do conteúdo, usados por várias seções do site. */
export function buildSiteModel(site: PublicSite) {
  const { settings, sections } = site;
  const hasWhatsapp = settings.whatsappNumber.length > 0;
  const wa = (message: string) => (hasWhatsapp ? whatsappLink(settings.whatsappNumber, message) : '#contato');
  const insta = instagramUrl(settings.instagram);

  const packages = site.packages;
  const gallery = site.gallery.filter((g) => g.image.url);
  const faq = site.faq;
  const steps = site.steps;

  return {
    site,
    settings,
    sections,
    nav: settings.nav,
    packages,
    gallery,
    faq,
    steps,
    preview: site.preview,
    show: {
      packages: packages.length > 0,
      gallery: gallery.length > 0,
      faq: faq.length > 0,
      how: steps.length > 0 || sections.how.chatMessages.length > 0,
    },
    links: {
      whatsapp: wa(settings.whatsappMessages.general),
      schedule: wa(settings.whatsappMessages.schedule),
      packageLink: (name: string) => wa(settings.whatsappMessages.package.split('{pacote}').join(name)),
      instagram: insta,
      external: hasWhatsapp,
    },
  };
}

export type SiteModel = ReturnType<typeof buildSiteModel>;
