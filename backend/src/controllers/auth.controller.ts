import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { verifyPin } from '../utils/pin';
import { signAuthToken } from '../utils/token';

interface UsuarioRow {
  id: string;
  nome: string;
  pin_hash: string;
  pin_salt: string;
}

export async function loginComPin(req: Request, res: Response): Promise<void> {
  const pin = String(req.body?.pin ?? '').trim();

  if (!/^\d{4}$/.test(pin)) {
    res.status(400).json({ message: 'PIN deve ter 4 números' });
    return;
  }

  const result = await pool.query<UsuarioRow>(
    'SELECT id, nome, pin_hash, pin_salt FROM usuarios ORDER BY nome ASC',
  );

  const usuario = result.rows.find((row) => verifyPin(pin, row.pin_salt, row.pin_hash));

  if (!usuario) {
    res.status(401).json({ message: 'PIN incorreto' });
    return;
  }

  res.json({
    token: signAuthToken(usuario.id, usuario.nome),
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
    },
  });
}

export async function obterUsuarioLogado(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string; usuarioNome?: string };

  res.json({
    usuario: {
      id: authReq.usuarioId,
      nome: authReq.usuarioNome,
    },
  });
}
