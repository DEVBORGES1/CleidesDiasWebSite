import { randomUUID } from 'node:crypto';
import {
  IMAGE_UPLOAD_RULES,
  type ImageInput,
  type ImageValue,
  type MediaAsset,
  type MediaCleanupResult,
  type UploadPurpose,
  type UploadSignature,
} from '@cleides/shared';
import type { Logger } from 'pino';
import type { MediaStorage } from '../integrations/media-storage.js';
import { conflict, notFound, uploadInvalid, validationError } from '../lib/errors.js';
import type { MediaRecord, Repositories } from '../repositories/types.js';

/** Tempo para o navegador concluir o envio e confirmar o arquivo. */
const SIGNATURE_TTL_MS = 60 * 60 * 1000;
/** Arquivos sem uso ficam guardados por este período antes da limpeza (permite desfazer). */
export const UNUSED_GRACE_MS = 24 * 60 * 60 * 1000;

const toAsset = (m: MediaRecord): MediaAsset => ({
  id: m.id,
  publicId: m.publicId,
  url: m.url ?? '',
  format: m.format ?? '',
  width: m.width ?? 0,
  height: m.height ?? 0,
  bytes: m.bytes ?? 0,
  purpose: m.purpose,
  createdAt: m.createdAt,
});

/**
 * Regras de upload e ciclo de vida das imagens:
 * assinatura → envio direto ao Cloudinary → confirmação no servidor → uso no conteúdo → limpeza.
 */
export class MediaService {
  constructor(
    private readonly repos: Repositories,
    private readonly storage: MediaStorage,
    private readonly logger: Logger,
  ) {}

  get enabled(): boolean {
    return this.storage.enabled;
  }

  async createSignature(purpose: UploadPurpose, userId: string): Promise<UploadSignature> {
    const publicId = `cleides/${purpose}/${randomUUID()}`;
    const signed = this.storage.signUpload(publicId);
    await this.repos.media.createPending({ publicId, purpose, createdBy: userId });
    return { ...signed, expiresAt: new Date(Date.now() + SIGNATURE_TTL_MS).toISOString() };
  }

  /**
   * Confirma um upload. A URL enviada pelo navegador nunca é usada: os metadados
   * vêm da API do Cloudinary e o upload precisa ter sido autorizado por este backend.
   */
  async confirm(publicId: string, userId: string): Promise<MediaAsset> {
    const pending = await this.repos.media.findByPublicId(publicId);
    if (!pending || pending.status === 'deleted') throw notFound('Upload não autorizado ou expirado. Envie a foto novamente.');
    if (pending.createdBy && pending.createdBy !== userId) throw notFound('Upload não autorizado ou expirado. Envie a foto novamente.');
    if (pending.status === 'active') return toAsset(pending);
    if (Date.now() - new Date(pending.createdAt).getTime() > SIGNATURE_TTL_MS * 2) {
      throw uploadInvalid('O prazo para concluir este envio expirou. Envie a foto novamente.');
    }

    const resource = await this.storage.getResource(publicId);
    if (!resource) throw uploadInvalid('A foto não chegou ao servidor de imagens. Tente enviar novamente.');

    const problem = this.checkResource(resource);
    if (problem) {
      await this.safeDestroy(publicId);
      await this.repos.media.markDeleted(pending.id);
      throw uploadInvalid(problem);
    }

    const active = await this.repos.media.activate(pending.id, resource);
    return toAsset(active);
  }

  private checkResource(r: { format: string; width: number; height: number; bytes: number }): string | null {
    const formats: readonly string[] = IMAGE_UPLOAD_RULES.formats;
    if (!formats.includes(r.format)) return 'Formato não suportado. Use JPG, PNG ou WEBP.';
    if (r.bytes > IMAGE_UPLOAD_RULES.maxBytes) return `A foto é muito grande (máx. ${IMAGE_UPLOAD_RULES.maxMegabytes} MB).`;
    if (Math.min(r.width, r.height) < IMAGE_UPLOAD_RULES.minDimension) {
      return `A foto é muito pequena (mínimo de ${IMAGE_UPLOAD_RULES.minDimension}px).`;
    }
    if (Math.max(r.width, r.height) > IMAGE_UPLOAD_RULES.maxDimension) return 'As dimensões da foto excedem o limite permitido.';
    return null;
  }

  /** Garante que o arquivo existe, está ativo e pode ser usado no conteúdo. */
  async requireActive(assetId: string): Promise<MediaRecord> {
    const asset = await this.repos.media.findById(assetId);
    if (!asset || asset.status !== 'active') {
      throw validationError([{ path: 'assetId', message: 'Foto não encontrada. Envie a foto novamente.' }]);
    }
    return asset;
  }

  /** Converte a imagem enviada pelo painel na imagem armazenada, com dados vindos do banco. */
  async resolveImage(input: ImageInput | null | undefined): Promise<ImageValue | null> {
    if (!input) return null;
    const framing = {
      alt: input.alt ?? '',
      x: input.x ?? 50,
      y: input.y ?? 50,
      zoom: input.zoom ?? 1,
      ratio: input.ratio ?? 'auto',
    };
    if (!input.assetId) {
      return { assetId: null, url: input.url ?? '', publicId: null, width: null, height: null, ...framing };
    }
    const asset = await this.requireActive(input.assetId);
    return {
      assetId: asset.id,
      url: asset.url ?? '',
      publicId: asset.publicId,
      width: asset.width,
      height: asset.height,
      ...framing,
    };
  }

  async resolveImages(inputs: ImageInput[]): Promise<ImageValue[]> {
    const out: ImageValue[] = [];
    for (const input of inputs) {
      const img = await this.resolveImage(input);
      if (img) out.push(img);
    }
    return out;
  }

  /** Identificadores de todos os arquivos usados em algum conteúdo do site. */
  async referencedAssetIds(): Promise<Set<string>> {
    const ids = new Set<string>();
    const add = (img: ImageValue | null | undefined) => {
      if (img?.assetId) ids.add(img.assetId);
    };
    for (const id of await this.repos.gallery.assetIds()) ids.add(id);
    for (const p of await this.repos.packages.list()) {
      add(p.cover);
      p.photos.forEach(add);
    }
    for (const s of await this.repos.steps.list()) add(s.image);
    const settings = await this.repos.settings.get();
    add(settings.logo);
    add(settings.seoImage);
    const sections = await this.repos.sections.getAll();
    for (const content of Object.values(sections)) {
      const image = (content as { image?: ImageValue | null } | undefined)?.image;
      add(image);
    }
    return ids;
  }

  /** Remove imediatamente um arquivo que não é mais usado em nenhum lugar. */
  async deleteIfUnreferenced(assetId: string): Promise<boolean> {
    const refs = await this.referencedAssetIds();
    if (refs.has(assetId)) return false;
    const asset = await this.repos.media.findById(assetId);
    if (!asset || asset.status === 'deleted') return false;
    if (await this.safeDestroy(asset.publicId)) {
      await this.repos.media.markDeleted(asset.id);
      return true;
    }
    return false;
  }

  /** Exclui um arquivo enviado por engano (ex.: upload cancelado no painel). */
  async discard(assetId: string): Promise<void> {
    const asset = await this.repos.media.findById(assetId);
    if (!asset || asset.status === 'deleted') throw notFound('Foto não encontrada.');
    const refs = await this.referencedAssetIds();
    if (refs.has(assetId)) throw conflict('Esta foto está sendo usada no site e não pode ser descartada.');
    await this.storage.destroy(asset.publicId);
    await this.repos.media.markDeleted(asset.id);
  }

  async unusedCount(): Promise<number> {
    return (await this.cleanupCandidates()).length;
  }

  private async cleanupCandidates(): Promise<MediaRecord[]> {
    const before = new Date(Date.now() - UNUSED_GRACE_MS).toISOString();
    const candidates = await this.repos.media.listCandidatesForCleanup(before);
    if (candidates.length === 0) return [];
    const refs = await this.referencedAssetIds();
    return candidates.filter((m) => !refs.has(m.id));
  }

  /**
   * Limpa uploads nunca confirmados e arquivos sem uso há mais de 24h.
   * Falhas parciais não interrompem a limpeza; o arquivo é tentado de novo na próxima vez.
   */
  async cleanup(): Promise<MediaCleanupResult> {
    let removed = 0;
    let failed = 0;
    for (const m of await this.cleanupCandidates()) {
      if (await this.safeDestroy(m.publicId)) {
        await this.repos.media.markDeleted(m.id);
        removed++;
      } else failed++;
    }
    return { removed, failed };
  }

  private async safeDestroy(publicId: string): Promise<boolean> {
    if (!this.storage.enabled) return false;
    try {
      await this.storage.destroy(publicId);
      return true;
    } catch (err) {
      this.logger.warn({ err, publicId }, 'Falha ao excluir imagem no Cloudinary; nova tentativa na próxima limpeza');
      return false;
    }
  }
}
