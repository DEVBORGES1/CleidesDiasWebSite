import { z } from 'zod';
import { statusSchema, text } from './common.js';
import { STEP_ICONS, type PublicationStatus, type StepIcon } from './constants.js';
import { imageInputSchema, type ImageValue } from './image.js';

const stepFields = {
  title: text(120, 'O título da etapa').min(1, { error: 'Dê um título à etapa.' }),
  description: text(600).default(''),
  note: text(300).default(''),
  icon: z.enum(STEP_ICONS, { error: 'Ícone inválido.' }).default('chat'),
  status: statusSchema.default('draft'),
};

export const stepCreateSchema = z.object({ ...stepFields, image: imageInputSchema.nullable().default(null) });
export type StepCreateInput = z.input<typeof stepCreateSchema>;
export type StepCreateParsed = z.output<typeof stepCreateSchema>;

export const stepUpdateSchema = z.object({ ...stepFields, image: imageInputSchema.nullable() }).partial();
export type StepUpdateInput = z.input<typeof stepUpdateSchema>;
export type StepUpdateParsed = z.output<typeof stepUpdateSchema>;

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  note: string;
  icon: StepIcon;
  image: ImageValue | null;
  status: PublicationStatus;
  position: number;
  createdAt: string;
  updatedAt: string;
}
