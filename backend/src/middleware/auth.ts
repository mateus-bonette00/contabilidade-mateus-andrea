import { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../utils/token';

export interface AuthenticatedRequest extends Request {
  usuarioId?: string;
  usuarioNome?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  const token = header.slice('Bearer '.length);
  const payload = verifyAuthToken(token);

  if (!payload) {
    res.status(401).json({ message: 'Sessão expirada. Digite seu PIN novamente.' });
    return;
  }

  req.usuarioId = payload.sub;
  req.usuarioNome = payload.nome;
  next();
}
