import type { RequestHandler } from 'express';

/** Conteúdo público: revalida sempre (ETag/304), para que edições apareçam na hora. */
export const publicCache: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'public, max-age=0, must-revalidate');
  next();
};

/** Respostas do painel nunca devem ser armazenadas em cache. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
};
