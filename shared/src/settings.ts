import { z } from 'zod';
import { requiredText, text } from './common.js';
import { imageInputSchema, imageSchema } from './image.js';

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/[^\s]+$/i.test(v), { error: 'Use um endereço completo começando com https://' });

export const whatsappNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .refine((v) => v === '' || /^55\d{10,11}$/.test(v), {
    error: 'Use só números, começando com 55 e o DDD. Ex.: 5549999569245',
  });

const instagramSchema = z
  .string()
  .trim()
  .max(31)
  .refine((v) => v === '' || /^@?[A-Za-z0-9._]{1,30}$/.test(v), { error: 'Informe o usuário do Instagram, ex.: @estudio' });

const socialLinkSchema = z.object({
  label: requiredText(40, 'O nome da rede'),
  url: optionalUrl.refine((v) => v !== '', { error: 'Informe o endereço da rede social.' }),
});

const navLabelsSchema = z.object({
  inicio: text(40).default('Início'),
  pacotes: text(40).default('Pacotes'),
  galeria: text(40).default('Galeria'),
  sobre: text(40).default('Sobre'),
  sobreCompleto: text(60).default('Sobre a Cleides'),
  duvidas: text(40).default('Dúvidas'),
  contato: text(40).default('Contato'),
  agendar: text(40).default('Agendar ensaio'),
  whatsappMenu: text(40).default('Falar no WhatsApp'),
  botaoFlutuante: text(40).default('WhatsApp'),
  verTodosPacotes: text(60).default('Ver todos os pacotes'),
});

const whatsappMessagesSchema = z.object({
  general: text(500).default(''),
  schedule: text(500).default(''),
  package: text(500).default(''),
});

const footerSchema = z.object({
  tagline: text(200).default(''),
  legal: text(1000).default(''),
  privacyLabel: text(60).default('Política de privacidade'),
  dataLabel: text(60).default('Tratamento de dados'),
});

const seoSchema = z.object({
  title: text(70, 'O título para o Google').default(''),
  description: text(170, 'A descrição para o Google').default(''),
});

const settingsShape = {
  brandName: requiredText(80, 'O nome do estúdio'),
  brandSubtitle: text(80).default(''),
  slogan: text(160).default(''),
  whatsappNumber: whatsappNumberSchema.default(''),
  phoneDisplay: text(40).default(''),
  phoneLabel: text(40).default('WhatsApp'),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === '' || z.email().safeParse(v).success, { error: 'E-mail inválido.' })
    .default(''),
  instagram: instagramSchema.default(''),
  instagramLabel: text(40).default('Instagram'),
  city: text(80).default(''),
  cityNote: text(80).default(''),
  socialLinks: z.array(socialLinkSchema).max(6).default([]),
  whatsappMessages: whatsappMessagesSchema.default({ general: '', schedule: '', package: '' }),
  nav: navLabelsSchema.default(navLabelsSchema.parse({})),
  footer: footerSchema.default(footerSchema.parse({})),
  seo: seoSchema.default({ title: '', description: '' }),
};

export const siteSettingsSchema = z.object({
  ...settingsShape,
  logo: imageSchema.nullable(),
  seoImage: imageSchema.nullable(),
  updatedAt: z.string(),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

/** Payload aceito em `PATCH /admin/settings` (todos os campos opcionais). */
export const siteSettingsUpdateSchema = z
  .object({
    ...settingsShape,
    logo: imageInputSchema.nullable(),
    seoImage: imageInputSchema.nullable(),
  })
  .partial();
export type SiteSettingsUpdate = z.input<typeof siteSettingsUpdateSchema>;
export type SiteSettingsUpdateParsed = z.output<typeof siteSettingsUpdateSchema>;
