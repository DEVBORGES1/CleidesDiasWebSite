import { validationError } from '../lib/errors.js';

/** A nova ordem precisa conter exatamente os mesmos itens, sem repetições. */
export function assertSameSet(existing: string[], ids: string[]): void {
  const unique = new Set(ids);
  const ok = unique.size === ids.length && unique.size === existing.length && existing.every((id) => unique.has(id));
  if (!ok) {
    throw validationError(
      [{ path: 'ids', message: 'A lista deve conter todos os itens exatamente uma vez.' }],
      'A ordem enviada está desatualizada. Recarregue a página e tente novamente.',
    );
  }
}
