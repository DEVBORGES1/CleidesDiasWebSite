import { emptySections, siteSettingsSchema, type PublicSite } from '@cleides/shared';

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
    preview: false,
    ...overrides,
  };
}
