import { z } from 'zod';
import { statusSchema, text } from './common.js';
import type { PublicationStatus } from './constants.js';

const faqFields = {
  question: text(300, 'A pergunta').min(1, { error: 'Escreva a pergunta.' }),
  answer: text(5000, 'A resposta').min(1, { error: 'Escreva a resposta.' }),
  category: text(60).default(''),
  status: statusSchema.default('draft'),
};

export const faqCreateSchema = z.object(faqFields);
export type FaqCreateInput = z.input<typeof faqCreateSchema>;
export type FaqCreateParsed = z.output<typeof faqCreateSchema>;

export const faqUpdateSchema = z.object(faqFields).partial();
export type FaqUpdateInput = z.input<typeof faqUpdateSchema>;
export type FaqUpdateParsed = z.output<typeof faqUpdateSchema>;

export const faqListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  status: statusSchema.optional(),
});
export type FaqListQuery = z.infer<typeof faqListQuerySchema>;

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: PublicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}
