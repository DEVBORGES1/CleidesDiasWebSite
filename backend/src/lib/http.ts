import type { ApiSuccess, PaginationMeta } from '@cleides/shared';
import type { Response } from 'express';

export function ok<T>(res: Response, data: T, meta?: PaginationMeta): void {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  res.status(200).json(body);
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ data } satisfies ApiSuccess<T>);
}

export function noContent(res: Response): void {
  res.status(204).end();
}
