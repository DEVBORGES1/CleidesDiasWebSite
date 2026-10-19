import { CONTENT_LIMITS, pickPresent, stepCreateSchema, stepUpdateSchema, type ProcessStep } from '@cleides/shared';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { Repositories, StepRecordInput } from '../repositories/types.js';
import type { MediaService } from './media.service.js';
import { assertSameSet } from './ordering.js';

export class StepsService {
  constructor(
    private readonly repos: Repositories,
    private readonly media: MediaService,
  ) {}

  list(onlyPublished = false): Promise<ProcessStep[]> {
    return this.repos.steps.list(onlyPublished ? { status: 'published' } : {});
  }

  async get(id: string): Promise<ProcessStep> {
    const step = await this.repos.steps.findById(id);
    if (!step) throw notFound('Etapa não encontrada.');
    return step;
  }

  async create(raw: unknown): Promise<ProcessStep> {
    const input = parse(stepCreateSchema, raw);
    if ((await this.repos.steps.stats()).total >= CONTENT_LIMITS.steps) throw conflict(`Limite de ${CONTENT_LIMITS.steps} etapas atingido.`);
    return this.repos.steps.create({
      ...input,
      image: await this.media.resolveImage(input.image),
      position: await this.repos.steps.nextPosition(),
    });
  }

  async update(id: string, raw: unknown): Promise<ProcessStep> {
    const current = await this.get(id);
    const input = pickPresent(parse(stepUpdateSchema, raw), raw);
    const { image, ...rest } = input;
    const patch: Partial<StepRecordInput> = { ...rest };
    if ('image' in input) patch.image = await this.media.resolveImage(image);
    const updated = await this.repos.steps.update(id, patch);
    if (!updated) throw notFound('Etapa não encontrada.');
    if ('image' in input && current.image?.assetId && current.image.assetId !== updated.image?.assetId) {
      await this.media.deleteIfUnreferenced(current.image.assetId);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const current = await this.get(id);
    await this.repos.steps.delete(id);
    if (current.image?.assetId) await this.media.deleteIfUnreferenced(current.image.assetId);
  }

  /** Duplica a etapa como rascunho, logo após a original. */
  async duplicate(id: string): Promise<ProcessStep> {
    const src = await this.get(id);
    if ((await this.repos.steps.stats()).total >= CONTENT_LIMITS.steps) throw conflict(`Limite de ${CONTENT_LIMITS.steps} etapas atingido.`);
    const copy = await this.repos.steps.create({
      title: `${src.title} (cópia)`.slice(0, 120),
      description: src.description,
      note: src.note,
      icon: src.icon,
      image: src.image,
      status: 'draft',
      position: src.position + 1,
    });
    const ordered = (await this.repos.steps.list()).filter((s) => s.id !== copy.id);
    ordered.splice(ordered.findIndex((s) => s.id === src.id) + 1, 0, copy);
    await this.repos.steps.reorder(ordered.map((s) => s.id));
    return (await this.repos.steps.findById(copy.id)) ?? copy;
  }

  async reorder(ids: string[]): Promise<ProcessStep[]> {
    assertSameSet((await this.repos.steps.list()).map((s) => s.id), ids);
    await this.repos.steps.reorder(ids);
    return this.repos.steps.list();
  }
}
