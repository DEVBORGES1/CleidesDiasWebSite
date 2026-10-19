import {
  SECTION_KEYS,
  emptySections,
  pickPresent,
  sectionInputSchemas,
  sectionSchemas,
  type ImageInput,
  type ImageValue,
  type SectionKey,
  type SiteSections,
} from '@cleides/shared';
import { notFound } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { Repositories } from '../repositories/types.js';
import type { MediaService } from './media.service.js';

export function isSectionKey(key: string): key is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(key);
}

export class SectionsService {
  constructor(
    private readonly repos: Repositories,
    private readonly media: MediaService,
  ) {}

  /** Todas as seções, completando com valores padrão o que ainda não foi salvo. */
  async getAll(): Promise<SiteSections> {
    const raw = await this.repos.sections.getAll();
    const out = emptySections();
    for (const key of SECTION_KEYS) {
      const parsed = sectionSchemas[key].safeParse(raw[key] ?? {});
      if (parsed.success) (out as Record<SectionKey, unknown>)[key] = parsed.data;
    }
    return out;
  }

  async get<K extends SectionKey>(key: K): Promise<SiteSections[K]> {
    return (await this.getAll())[key];
  }

  /** Atualiza parcialmente uma seção; imagens são resolvidas a partir dos arquivos confirmados. */
  async update(key: string, raw: unknown, userId: string | null): Promise<SiteSections[SectionKey]> {
    if (!isSectionKey(key)) throw notFound('Seção não encontrada.');
    const schema = sectionInputSchemas[key].partial();
    const input = pickPresent(parse(schema, raw) as Record<string, unknown>, raw);
    const current = (await this.get(key)) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...current, ...input };
    // Ao trocar a foto, o arquivo antigo fica guardado por um período de carência
    // e é removido pela limpeza de mídia se continuar sem uso.
    if ('image' in input) next.image = await this.media.resolveImage(input.image as ImageInput | null);
    const content = parse(sectionSchemas[key], next) as SiteSections[SectionKey];
    await this.repos.sections.upsert(key, content, userId);
    return content;
  }

  async setHeroImage(image: ImageValue, userId: string | null): Promise<void> {
    const hero = await this.get('hero');
    await this.repos.sections.upsert('hero', { ...hero, image }, userId);
  }
}
