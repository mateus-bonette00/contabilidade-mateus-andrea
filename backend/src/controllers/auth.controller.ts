import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { createPinSalt, hashPin, verifyPin } from '../utils/pin';
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

function mensagemPinInvalido(pin: string): string | null {
  if (!/^\d{4}$/.test(pin.trim())) {
    return 'PIN deve ter 4 números';
  }

  return null;
}

async function buscarUsuarioPorId(usuarioId: string): Promise<UsuarioRow | null> {
  const result = await pool.query<UsuarioRow>(
    'SELECT id, nome, pin_hash, pin_salt FROM usuarios WHERE id = $1',
    [usuarioId],
  );

  return result.rows[0] ?? null;
}

export async function atualizarNome(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string };
  const usuarioId = authReq.usuarioId;
  const nome = String(req.body?.nome ?? '').trim();
  const pinAtual = String(req.body?.pinAtual ?? '').trim();
  const erroPin = mensagemPinInvalido(pinAtual);

  if (!usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  if (nome.length < 2 || nome.length > 100) {
    res.status(400).json({ message: 'Nome deve ter entre 2 e 100 caracteres' });
    return;
  }

  if (erroPin) {
    res.status(400).json({ message: erroPin });
    return;
  }

  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario || !verifyPin(pinAtual, usuario.pin_salt, usuario.pin_hash)) {
    res.status(401).json({ message: 'PIN atual incorreto' });
    return;
  }

  if (usuario.nome === nome) {
    res.status(400).json({ message: 'Esse já é o seu nome atual' });
    return;
  }

  const nomeEmUso = await pool.query<{ id: string }>(
    'SELECT id FROM usuarios WHERE nome = $1 AND id <> $2',
    [nome, usuarioId],
  );

  if (nomeEmUso.rowCount && nomeEmUso.rowCount > 0) {
    res.status(409).json({ message: 'Esse nome já está em uso por outra pessoa' });
    return;
  }

  await pool.query('UPDATE usuarios SET nome = $1 WHERE id = $2', [nome, usuarioId]);

  res.json({
    token: signAuthToken(usuarioId, nome),
    usuario: {
      id: usuarioId,
      nome,
    },
  });
}

export async function atualizarPin(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string; usuarioNome?: string };
  const usuarioId = authReq.usuarioId;
  const pinAtual = String(req.body?.pinAtual ?? '').trim();
  const pinNovo = String(req.body?.pinNovo ?? '').trim();
  const pinConfirmacao = String(req.body?.pinConfirmacao ?? '').trim();
  const erroPinAtual = mensagemPinInvalido(pinAtual);
  const erroPinNovo = mensagemPinInvalido(pinNovo);

  if (!usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  if (erroPinAtual || erroPinNovo || mensagemPinInvalido(pinConfirmacao)) {
    res.status(400).json({ message: 'Todos os PINs devem ter 4 números' });
    return;
  }

  if (pinNovo !== pinConfirmacao) {
    res.status(400).json({ message: 'A confirmação do PIN não confere' });
    return;
  }

  if (pinAtual === pinNovo) {
    res.status(400).json({ message: 'O PIN novo deve ser diferente do atual' });
    return;
  }

  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario || !verifyPin(pinAtual, usuario.pin_salt, usuario.pin_hash)) {
    res.status(401).json({ message: 'PIN atual incorreto' });
    return;
  }

  const pinSalt = createPinSalt(usuarioId);
  const pinHash = hashPin(pinNovo, pinSalt);

  await pool.query('UPDATE usuarios SET pin_hash = $1, pin_salt = $2 WHERE id = $3', [
    pinHash,
    pinSalt,
    usuarioId,
  ]);

  res.json({
    message: 'PIN atualizado com sucesso',
    usuario: {
      id: usuarioId,
      nome: authReq.usuarioNome,
    },
  });
}
