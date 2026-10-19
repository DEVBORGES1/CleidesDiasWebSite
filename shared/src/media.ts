import { z } from 'zod';
import { idSchema } from './common.js';
import { UPLOAD_PURPOSES, type UploadPurpose } from './constants.js';

export const uploadSignatureSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSES, { error: 'Finalidade de upload inválida.' }),
});
export type UploadSignatureInput = z.infer<typeof uploadSignatureSchema>;

/** Parâmetros que o navegador usa para enviar o arquivo diretamente ao Cloudinary. */
export interface UploadSignature {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  /** Parâmetros assinados que devem ser enviados exatamente como recebidos. */
  params: Record<string, string>;
  expiresAt: string;
}

export const uploadConfirmSchema = z.object({
  publicId: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .regex(/^cleides\/[a-z]+\/[0-9a-f-]{36}$/, { error: 'Identificador de upload inválido.' }),
});
export type UploadConfirmInput = z.infer<typeof uploadConfirmSchema>;

export interface MediaAsset {
  id: string;
  publicId: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  purpose: UploadPurpose;
  createdAt: string;
}

export const mediaIdParamsSchema = z.object({ id: idSchema });

export interface MediaCleanupResult {
  removed: number;
  failed: number;
}
