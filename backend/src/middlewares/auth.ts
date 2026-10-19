import type { AdminProfile } from '@cleides/shared';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { AuthService } from '../services/auth.service.js';

/** Bloqueia a rota para quem não for administrador autenticado (verificação feita no servidor). */
export function requireAdmin(auth: AuthService): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.locals.admin = await auth.authenticateAdmin(req.headers.authorization);
    next();
  };
}

export function currentAdmin(res: Response): AdminProfile {
  return res.locals.admin as AdminProfile;
}
