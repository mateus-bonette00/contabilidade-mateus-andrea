import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthenticatedRequest } from '../middleware/auth';

export async function listEntradas(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await pool.query(
    `SELECT id, descricao, valor::text, data_referencia::text, created_at, updated_at
     FROM entradas
     WHERE usuario_id = $1
     ORDER BY data_referencia DESC, created_at DESC`,
    [req.usuarioId],
  );

  res.json(result.rows);
}

export async function createEntrada(req: AuthenticatedRequest, res: Response): Promise<void> {
  const descricao = String(req.body?.descricao ?? '').trim();
  const valor = Number(req.body?.valor);
  const dataReferencia = String(req.body?.data_referencia ?? '').trim();

  if (!descricao || !Number.isFinite(valor) || valor <= 0 || !dataReferencia) {
    res.status(400).json({ message: 'Descrição, valor e data são obrigatórios' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO entradas (usuario_id, descricao, valor, data_referencia)
     VALUES ($1, $2, $3, $4)
     RETURNING id, descricao, valor::text, data_referencia::text, created_at, updated_at`,
    [req.usuarioId, descricao, valor, dataReferencia],
  );

  res.status(201).json(result.rows[0]);
}
