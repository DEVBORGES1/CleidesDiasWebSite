import { emptySections, siteSettingsSchema, withLotPhases, type Package, type PriceLot, type PublicSite } from '@cleides/shared';

export function makeSite(overrides: Partial<PublicSite> = {}): PublicSite {
  const sections = emptySections();
  sections.faq = { title: 'Dúvidas frequentes', subtitle: 'Tudo o que você precisa saber' };
  return {
    settings: siteSettingsSchema.parse({
      brandName: 'Cleides Dias',
      whatsappNumber: '5549999569245',
      whatsappMessages: { general: 'Olá!', schedule: 'Quero agendar', package: 'Tenho interesse no {pacote}' },
      instagram: '@estudio',
      logo: null,
      seoImage: null,
      updatedAt: new Date().toISOString(),
    }),
    sections,
    packages: [],
    gallery: [],
    faq: [],
    steps: [],
    lots: [],
    today: '2026-11-20',
    preview: false,
    ...overrides,
  };
}

export function makePackage(id: string, name: string, price: number, extra: Partial<Package> = {}): Package {
  return {
    id,
    slug: id,
    name,
    subtitle: '',
    description: '',
    category: '',
    price,
    promoPrice: null,
    highlights: [],
    includedItems: [],
    extraInfo: '',
    cover: null,
    coverOnCard: false,
    photos: [],
    featured: false,
    status: 'published',
    position: 0,
    createdAt: '',
    updatedAt: '',
    ...extra,
  };
}

/** Lotes com fase calculada para o dia `today` (padrão: 20/11/2026). */
export function makeLots(lots: [name: string, endsOn: string, prices: Record<string, number>][], today = '2026-11-20') {
  const raw: PriceLot[] = lots.map(([name, endsOn, prices], position) => ({
    id: `lote-${position}`,
    name,
    endsOn,
    prices: Object.entries(prices).map(([packageId, price]) => ({ packageId, price })),
    status: 'published',
    position,
    createdAt: '',
    updatedAt: '',
  }));
  return withLotPhases(raw, today);
}
