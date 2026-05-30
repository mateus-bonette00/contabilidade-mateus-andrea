import { Response } from 'express';
import { pool } from '../db/pool';
import { AuthenticatedRequest } from '../middleware/auth';
import { validarDataReferencia, validarValorMonetario } from '../utils/finance-validation';

export async function listEntradas(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  const result = await pool.query(
    `SELECT id, descricao, valor::text, data_referencia::text, origem, instituicao_nome, created_at, updated_at
     FROM entradas
     WHERE usuario_id = $1
     ORDER BY data_referencia DESC, created_at DESC`,
    [req.usuarioId],
  );

  res.json(result.rows);
}

export async function createEntrada(req: AuthenticatedRequest, res: Response): Promise<void> {
  const descricao = String(req.body?.descricao ?? '').trim();
  const valor = validarValorMonetario(req.body?.valor);
  const dataReferencia = validarDataReferencia(req.body?.data_referencia ?? req.body?.dataReferencia);

  if (!req.usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  if (!descricao || descricao.length > 255) {
    res.status(400).json({ message: 'Descrição é obrigatória e deve ter até 255 caracteres' });
    return;
  }

  if (!valor) {
    res.status(400).json({ message: 'Informe um valor válido maior que zero (ex.: 1234.56)' });
    return;
  }

  if (!dataReferencia) {
    res.status(400).json({ message: 'Data inválida. Use o formato YYYY-MM-DD (ex.: 2026-05-24)' });
    return;
  }

  const result = await pool.query(
    `INSERT INTO entradas (usuario_id, descricao, valor, data_referencia)
     VALUES ($1, $2, $3, $4)
     RETURNING id, descricao, valor::text, data_referencia::text, origem, instituicao_nome, created_at, updated_at`,
    [req.usuarioId, descricao, valor, dataReferencia],
  );

  res.status(201).json(result.rows[0]);
}
