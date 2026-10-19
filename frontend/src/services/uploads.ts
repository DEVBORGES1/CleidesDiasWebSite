import { IMAGE_UPLOAD_RULES, type ImageValue, type MediaAsset, type UploadPurpose } from '@cleides/shared';
import { adminApi } from './api';
import { ApiError } from './http';

/** Validação no navegador (a validação definitiva é feita pelo servidor). */
export function checkImageFile(file: File): string | null {
  const types: readonly string[] = IMAGE_UPLOAD_RULES.mimeTypes;
  if (!types.includes(file.type)) return `“${file.name}” não é uma foto compatível. Use JPG, PNG ou WEBP.`;
  if (file.size > IMAGE_UPLOAD_RULES.maxBytes) return `“${file.name}” é muito grande (máx. ${IMAGE_UPLOAD_RULES.maxMegabytes} MB).`;
  return null;
}

function sendToStorage(url: string, form: FormData, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else {
        let message = 'O servidor de imagens recusou a foto.';
        try {
          const body = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (body.error?.message?.toLowerCase().includes('format')) message = 'Formato não suportado. Use JPG, PNG ou WEBP.';
        } catch {
          /* resposta sem JSON */
        }
        reject(new ApiError(xhr.status, 'UPLOAD_INVALID', message));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'NETWORK_ERROR', 'A conexão caiu durante o envio. Tente novamente.'));
    xhr.send(form);
  });
}

/**
 * Fluxo de upload seguro: o backend assina, o navegador envia o arquivo direto
 * ao Cloudinary e o backend confirma o arquivo antes de liberá-lo para uso.
 */
export async function uploadImage(file: File, purpose: UploadPurpose, onProgress?: (pct: number) => void): Promise<MediaAsset> {
  const problem = checkImageFile(file);
  if (problem) throw new ApiError(400, 'UPLOAD_INVALID', problem);
  const sig = await adminApi.media.signature(purpose);
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('signature', sig.signature);
  for (const [k, v] of Object.entries(sig.params)) form.append(k, v);
  await sendToStorage(sig.uploadUrl, form, onProgress);
  onProgress?.(100);
  return adminApi.media.confirm(sig.publicId);
}

/** Imagem de conteúdo a partir de um arquivo recém-confirmado. */
export function imageFromAsset(asset: MediaAsset, alt = ''): ImageValue {
  return {
    assetId: asset.id,
    url: asset.url,
    publicId: asset.publicId,
    width: asset.width,
    height: asset.height,
    alt,
    x: 50,
    y: 50,
    zoom: 1,
    ratio: 'auto',
  };
}

/** Converte a imagem armazenada no formato aceito pela API (sem URL quando há arquivo). */
export function toImageInput(img: ImageValue | null) {
  if (!img) return null;
  const { assetId, url, alt, x, y, zoom, ratio } = img;
  return assetId ? { assetId, alt, x, y, zoom, ratio } : { assetId: null, url, alt, x, y, zoom, ratio };
}
