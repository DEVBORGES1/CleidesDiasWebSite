import {
  CONTENT_LIMITS,
  lotCreateSchema,
  lotUpdateSchema,
  pickPresent,
  todayIn,
  withLotPhases,
  type LotPrice,
  type LotWithPhase,
  type PriceLot,
} from '@cleides/shared';
import { conflict, notFound } from '../lib/errors.js';
import { parse } from '../lib/validation.js';
import type { LotRecordInput, Repositories } from '../repositories/types.js';

export class LotsService {
  constructor(
    private readonly repos: Repositories,
    /** Relógio injetável para testes. */
    private readonly now: () => Date = () => new Date(),
  ) {}

  today(): string {
    return todayIn(undefined, this.now());
  }

  /** Lotes em ordem de encerramento. */
  async list(onlyPublished = false): Promise<PriceLot[]> {
    const lots = await this.repos.lots.list(onlyPublished ? { status: 'published' } : {});
    return lots.sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  }

  /**
   * Lotes do site com a fase de cada um. Sem lote em andamento (todos encerrados),
   * a seção some e os pacotes voltam ao preço normal.
   */
  async forSite(preview: boolean): Promise<LotWithPhase[]> {
    const lots = withLotPhases(await this.list(!preview), this.today());
    return lots.some((l) => l.phase === 'current') ? lots : [];
  }

  async get(id: string): Promise<PriceLot> {
    const lot = await this.repos.lots.findById(id);
    if (!lot) throw notFound('Lote não encontrado.');
    return lot;
  }

  async create(raw: unknown): Promise<PriceLot> {
    const input = parse(lotCreateSchema, raw);
    if ((await this.repos.lots.stats()).total >= CONTENT_LIMITS.lots) throw conflict(`Limite de ${CONTENT_LIMITS.lots} lotes atingido.`);
    await this.assertFreeDate(input.endsOn);
    const record: LotRecordInput = { ...input, prices: await this.knownPackages(input.prices) };
    return this.repos.lots.create({ ...record, position: await this.repos.lots.nextPosition() });
  }

  async update(id: string, raw: unknown): Promise<PriceLot> {
    await this.get(id);
    const input = pickPresent(parse(lotUpdateSchema, raw), raw);
    if (input.endsOn) await this.assertFreeDate(input.endsOn, id);
    const patch: Partial<LotRecordInput> = { ...input };
    if (input.prices) patch.prices = await this.knownPackages(input.prices);
    const updated = await this.repos.lots.update(id, patch);
    if (!updated) throw notFound('Lote não encontrado.');
    return updated;
  }

  async remove(id: string): Promise<void> {
    if (!(await this.repos.lots.delete(id))) throw notFound('Lote não encontrado.');
  }

  /** Dois lotes terminando no mesmo dia deixariam o lote atual ambíguo. */
  private async assertFreeDate(endsOn: string, exceptId?: string): Promise<void> {
    if (await this.repos.lots.endsOnExists(endsOn, exceptId)) throw conflict('Já existe um lote que termina nesse dia. Escolha outra data.');
  }

  /** Descarta valores de pacotes que não existem mais. */
  private async knownPackages(prices: LotPrice[]): Promise<LotPrice[]> {
    if (prices.length === 0) return prices;
    const ids = new Set((await this.repos.packages.list()).map((p) => p.id));
    return prices.filter((p) => ids.has(p.packageId));
  }
}
