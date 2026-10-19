import { z } from 'zod';
import { text } from './common.js';
import { CONTENT_LIMITS, type SectionKey } from './constants.js';
import { imageInputSchema, imageSchema } from './image.js';

const list = (max: number, itemMax: number) =>
  z
    .array(text(itemMax))
    .max(max, { error: `Use no máximo ${max} itens.` })
    .transform((items) => items.filter((v) => v.length > 0))
    .default([]);

type ImgSchema = typeof imageSchema | typeof imageInputSchema;

function buildSectionSchemas<I extends ImgSchema>(img: I) {
  return {
    hero: z.object({
      eyebrow: text(80).default(''),
      title: text(140).default(''),
      text: text(400).default(''),
      primaryButton: text(40).default(''),
      secondaryButton: text(40).default(''),
      benefits: list(4, 80),
      image: img.nullable().default(null),
    }),
    about: z.object({
      eyebrow: text(80).default(''),
      titleStart: text(80).default(''),
      titleHighlight: text(60).default(''),
      text: text(3000).default(''),
      highlights: list(CONTENT_LIMITS.listItems, 160),
      cardName: text(60).default(''),
      cardRole: text(80).default(''),
      ctaLabel: text(40).default(''),
      ctaTarget: z.enum(['whatsapp', 'instagram', 'contato']).default('whatsapp'),
      image: img.nullable().default(null),
    }),
    packages: z.object({
      title: text(80).default(''),
      subtitle: text(160).default(''),
      mobileHint: text(120).default(''),
      featuredBadge: text(30).default(''),
      questionLead: text(80).default(''),
      questionButton: text(60).default(''),
    }),
    gallery: z.object({
      title: text(80).default(''),
      subtitle: text(160).default(''),
      buttonLabel: text(40).default(''),
      ticks: list(CONTENT_LIMITS.ticks, 40),
    }),
    how: z.object({
      title: text(80).default(''),
      subtitle: text(160).default(''),
      note: text(200).default(''),
      stepPrefix: text(20).default('Passo'),
      chatName: text(60).default(''),
      chatStatus: text(30).default(''),
      chatMessages: z
        .array(z.object({ fromClient: z.boolean(), text: text(200) }))
        .max(10)
        .transform((items) => items.filter((m) => m.text.length > 0))
        .default([]),
      chatButton: text(60).default(''),
    }),
    faq: z.object({
      title: text(80).default(''),
      subtitle: text(160).default(''),
    }),
    contact: z.object({
      eyebrow: text(80).default(''),
      title: text(140).default(''),
      text: text(500).default(''),
      buttonLabel: text(50).default(''),
      note: text(160).default(''),
      image: img.nullable().default(null),
    }),
    legal: z.object({
      privacyText: text(20000).default(''),
    }),
  } satisfies Record<SectionKey, z.ZodType>;
}

/** Schemas do conteúdo armazenado/retornado pela API. */
export const sectionSchemas = buildSectionSchemas(imageSchema);
/** Schemas aceitos na edição pelo painel (imagens referenciam arquivos confirmados). */
export const sectionInputSchemas = buildSectionSchemas(imageInputSchema);

export type HeroSection = z.infer<typeof sectionSchemas.hero>;
export type AboutSection = z.infer<typeof sectionSchemas.about>;
export type PackagesSection = z.infer<typeof sectionSchemas.packages>;
export type GallerySection = z.infer<typeof sectionSchemas.gallery>;
export type HowSection = z.infer<typeof sectionSchemas.how>;
export type FaqSection = z.infer<typeof sectionSchemas.faq>;
export type ContactSection = z.infer<typeof sectionSchemas.contact>;
export type LegalSection = z.infer<typeof sectionSchemas.legal>;

export interface SiteSections {
  hero: HeroSection;
  about: AboutSection;
  packages: PackagesSection;
  gallery: GallerySection;
  how: HowSection;
  faq: FaqSection;
  contact: ContactSection;
  legal: LegalSection;
}

export type SectionInput<K extends SectionKey> = z.input<(typeof sectionInputSchemas)[K]>;

/** Conteúdo vazio de cada seção (usado quando o banco ainda não tem registro). */
export function emptySections(): SiteSections {
  return {
    hero: sectionSchemas.hero.parse({}),
    about: sectionSchemas.about.parse({}),
    packages: sectionSchemas.packages.parse({}),
    gallery: sectionSchemas.gallery.parse({}),
    how: sectionSchemas.how.parse({}),
    faq: sectionSchemas.faq.parse({}),
    contact: sectionSchemas.contact.parse({}),
    legal: sectionSchemas.legal.parse({}),
  };
}
