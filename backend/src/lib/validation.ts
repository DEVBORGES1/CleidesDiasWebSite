import type { z } from 'zod';
import { fromZod } from './errors.js';

/** Valida um valor com Zod e lança erro 400 padronizado em caso de falha. */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) throw fromZod(result.error);
  return result.data;
}
