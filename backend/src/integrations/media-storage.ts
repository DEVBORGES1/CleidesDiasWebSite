import { v2 as cloudinary } from 'cloudinary';
import { IMAGE_UPLOAD_RULES, type UploadSignature } from '@cleides/shared';
import { unavailable } from '../lib/errors.js';

export interface StoredResource {
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

/** Armazenamento de imagens. A implementação de produção é o Cloudinary. */
export interface MediaStorage {
  readonly enabled: boolean;
  /** Gera os parâmetros assinados para o navegador enviar o arquivo. */
  signUpload(publicId: string): Omit<UploadSignature, 'expiresAt'>;
  /** Consulta o arquivo diretamente no provedor (fonte confiável dos metadados). */
  getResource(publicId: string): Promise<StoredResource | null>;
  destroy(publicId: string): Promise<void>;
}

/** Transformação aplicada no recebimento: limita a 3000px para economizar armazenamento. */
export const INCOMING_TRANSFORMATION = 'c_limit,w_3000,h_3000';

export interface CloudinaryOptions {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  /** Apenas para testes automatizados. */
  uploadPrefix?: string;
}

export class CloudinaryStorage implements MediaStorage {
  readonly enabled = true;
  private readonly prefix: string;

  constructor(private readonly options: CloudinaryOptions) {
    this.prefix = (options.uploadPrefix ?? 'https://api.cloudinary.com').replace(/\/$/, '');
    cloudinary.config({
      cloud_name: options.cloudName,
      api_key: options.apiKey,
      api_secret: options.apiSecret,
      secure: true,
      ...(options.uploadPrefix ? { upload_prefix: this.prefix } : {}),
    });
  }

  signUpload(publicId: string): Omit<UploadSignature, 'expiresAt'> {
    const timestamp = Math.round(Date.now() / 1000);
    const params: Record<string, string> = {
      public_id: publicId,
      timestamp: String(timestamp),
      allowed_formats: IMAGE_UPLOAD_RULES.formats.join(','),
      overwrite: 'false',
      transformation: INCOMING_TRANSFORMATION,
    };
    const signature = cloudinary.utils.api_sign_request(params, this.options.apiSecret);
    return {
      uploadUrl: `${this.prefix}/v1_1/${this.options.cloudName}/image/upload`,
      apiKey: this.options.apiKey,
      timestamp,
      signature,
      publicId,
      params,
    };
  }

  async getResource(publicId: string): Promise<StoredResource | null> {
    try {
      const r = await cloudinary.api.resource(publicId, { resource_type: 'image', type: 'upload' });
      return { url: r.secure_url, format: r.format, width: r.width, height: r.height, bytes: r.bytes };
    } catch (err) {
      const code = (err as { error?: { http_code?: number }; http_code?: number }).error?.http_code ?? (err as { http_code?: number }).http_code;
      if (code === 404) return null;
      throw err;
    }
  }

  async destroy(publicId: string): Promise<void> {
    const r = (await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true })) as { result?: string };
    if (r.result !== 'ok' && r.result !== 'not found') throw new Error(`Cloudinary destroy retornou: ${r.result}`);
  }
}

/** Usado quando as credenciais do Cloudinary não foram configuradas. */
export class DisabledStorage implements MediaStorage {
  readonly enabled = false;
  private fail(): never {
    throw unavailable('O envio de fotos ainda não foi configurado (Cloudinary).');
  }
  signUpload(): never {
    this.fail();
  }
  async getResource(): Promise<never> {
    this.fail();
  }
  async destroy(): Promise<void> {
    this.fail();
  }
}
