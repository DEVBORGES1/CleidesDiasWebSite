import {
  CONTENT_LIMITS,
  faqCreateSchema,
  faqUpdateSchema,
  normalizeSearch,
  pickPresent,
  type FaqItem,
  type FaqListQuery,
} from '@cleides/shared';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { Repositories } from '../repositories/types.js';
import { assertSameSet } from './ordering.js';

export class FaqService {
  constructor(private readonly repos: Repositories) {}

  async list(query: FaqListQuery = {}, onlyPublished = false): Promise<FaqItem[]> {
    const items = await this.repos.faq.list({ status: onlyPublished ? 'published' : query.status });
    const q = query.q ? normalizeSearch(query.q) : '';
    return items.filter(
      (f) =>
        (!query.category || f.category === query.category) &&
        (!q || normalizeSearch(`${f.question} ${f.answer} ${f.category}`).includes(q)),
    );
  }

  async get(id: string): Promise<FaqItem> {
    const item = await this.repos.faq.findById(id);
    if (!item) throw notFound('Pergunta não encontrada.');
    return item;
  }

  async create(raw: unknown): Promise<FaqItem> {
    const input = parse(faqCreateSchema, raw);
    if ((await this.repos.faq.stats()).total >= CONTENT_LIMITS.faqItems) {
      throw conflict(`Limite de ${CONTENT_LIMITS.faqItems} perguntas atingido.`);
    }
    return this.repos.faq.create({ ...input, position: await this.repos.faq.nextPosition() });
  }

  async update(id: string, raw: unknown): Promise<FaqItem> {
    await this.get(id);
    const input = pickPresent(parse(faqUpdateSchema, raw), raw);
    const updated = await this.repos.faq.update(id, input);
    if (!updated) throw notFound('Pergunta não encontrada.');
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repos.faq.delete(id))) throw notFound('Pergunta não encontrada.');
  }

  async reorder(ids: string[]): Promise<FaqItem[]> {
    assertSameSet((await this.repos.faq.list()).map((f) => f.id), ids);
    await this.repos.faq.reorder(ids);
    return this.repos.faq.list();
  }
}
