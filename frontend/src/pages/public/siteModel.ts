import { instagramUrl, lotPriceFor, whatsappLink } from '@cleides/shared/utils';
import type { LotWithPhase, Package, PublicSite } from '@cleides/shared';

/** Preço exibido de um pacote: o do lote atual, quando houver; senão o promocional ou o normal. */
export interface DisplayPrice {
  amount: number | null;
  /** Preço riscado ("De R$ …"), só para o preço promocional. */
  old: number | null;
  /** Lote cujo valor está sendo exibido. */
  lot: LotWithPhase | null;
  /** Valor do pacote no próximo lote, para mostrar que vai subir. */
  next: { lot: LotWithPhase; price: number } | null;
}

export function packagePrice(p: Package, lots: LotWithPhase[]): DisplayPrice {
  const current = lots.find((l) => l.phase === 'current');
  const lotPrice = lotPriceFor(current, p.id);
  if (current && lotPrice != null) {
    const upcoming = lots.filter((l) => l.phase === 'upcoming');
    const nextLot = upcoming.find((l) => lotPriceFor(l, p.id) != null);
    return { amount: lotPrice, old: null, lot: current, next: nextLot ? { lot: nextLot, price: lotPriceFor(nextLot, p.id)! } : null };
  }
  return { amount: p.promoPrice ?? p.price, old: p.promoPrice != null ? p.price : null, lot: null, next: null };
}

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
  // `?? []`: uma API ainda sem lotes (durante a atualização do servidor) não quebra o site.
  const lots = site.lots ?? [];
  // Só entram na tabela de lotes os pacotes que têm valor em algum lote.
  const lotPackages = packages.filter((p) => lots.some((l) => lotPriceFor(l, p.id) != null));

  return {
    site,
    settings,
    sections,
    nav: settings.nav,
    packages,
    gallery,
    faq,
    steps,
    lots,
    lotPackages,
    today: site.today,
    priceOf: (p: Package) => packagePrice(p, lots),
    preview: site.preview,
    show: {
      packages: packages.length > 0,
      gallery: gallery.length > 0,
      faq: faq.length > 0,
      how: steps.length > 0 || sections.how.chatMessages.length > 0,
      lots: lotPackages.length > 0,
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
