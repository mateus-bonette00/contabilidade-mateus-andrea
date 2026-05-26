import crypto from 'crypto';
import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { createPinSalt, hashPin, verifyPin } from '../utils/pin';
import { signAuthToken } from '../utils/token';

interface UsuarioRow {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  foto_url: string | null;
  pin_hash: string;
  pin_salt: string;
  created_at: string;
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function nomeCompleto(nome: string, sobrenome: string): string {
  return `${nome} ${sobrenome}`.trim();
}

function validarNomeCampo(valor: string, label: string): string | null {
  const limpo = valor.trim();

  if (limpo.length < 2 || limpo.length > 100) {
    return `${label} deve ter entre 2 e 100 caracteres`;
  }

  return null;
}

function validarEmail(email: string): string | null {
  const limpo = normalizarEmail(email);
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!regex.test(limpo) || limpo.length > 160) {
    return 'Informe um e-mail válido';
  }

  return null;
}

function mensagemPinInvalido(pin: string): string | null {
  if (!/^\d{4}$/.test(pin.trim())) {
    return 'PIN deve ter 4 números';
  }

  return null;
}

function validarFotoUrl(fotoUrl: string | null): string | null {
  if (!fotoUrl) {
    return null;
  }

  if (fotoUrl.length > 1_600_000) {
    return 'A foto é muito grande';
  }

  const ehDataUrl = fotoUrl.startsWith('data:image/');
  const ehHttp = /^https?:\/\//.test(fotoUrl);

  if (!ehDataUrl && !ehHttp) {
    return 'Formato da foto inválido';
  }

  return null;
}

async function buscarUsuarioPorId(usuarioId: string): Promise<UsuarioRow | null> {
  const result = await pool.query<UsuarioRow>(
    `
      SELECT id, nome, sobrenome, email, foto_url, pin_hash, pin_salt, created_at
      FROM usuarios
      WHERE id = $1
    `,
    [usuarioId],
  );

  return result.rows[0] ?? null;
}

async function buscarUsuarioPorEmail(email: string): Promise<UsuarioRow | null> {
  const result = await pool.query<UsuarioRow>(
    `
      SELECT id, nome, sobrenome, email, foto_url, pin_hash, pin_salt, created_at
      FROM usuarios
      WHERE email = $1
    `,
    [normalizarEmail(email)],
  );

  return result.rows[0] ?? null;
}

async function pinEmUso(pin: string, ignorarUsuarioId?: string): Promise<boolean> {
  const result = await pool.query<Pick<UsuarioRow, 'id' | 'pin_hash' | 'pin_salt'>>(
    'SELECT id, pin_hash, pin_salt FROM usuarios',
  );

  return result.rows.some((usuario) => {
    if (ignorarUsuarioId && usuario.id === ignorarUsuarioId) {
      return false;
    }

    return verifyPin(pin, usuario.pin_salt, usuario.pin_hash);
  });
}

function montarUsuarioPublico(usuario: UsuarioRow) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    sobrenome: usuario.sobrenome,
    email: usuario.email,
    fotoUrl: usuario.foto_url,
    createdAt: usuario.created_at,
  };
}

export async function cadastrarUsuario(req: Request, res: Response): Promise<void> {
  const nome = String(req.body?.nome ?? '').trim();
  const sobrenome = String(req.body?.sobrenome ?? '').trim();
  const email = normalizarEmail(String(req.body?.email ?? ''));
  const pin = String(req.body?.pin ?? '').trim();
  const pinConfirmacao = String(req.body?.pinConfirmacao ?? '').trim();

  const erroNome = validarNomeCampo(nome, 'Nome');
  const erroSobrenome = validarNomeCampo(sobrenome, 'Sobrenome');
  const erroEmail = validarEmail(email);
  const erroPin = mensagemPinInvalido(pin);

  if (erroNome || erroSobrenome || erroEmail || erroPin) {
    res.status(400).json({ message: erroNome || erroSobrenome || erroEmail || erroPin });
    return;
  }

  if (pin !== pinConfirmacao) {
    res.status(400).json({ message: 'A confirmação do PIN não confere' });
    return;
  }

  const emailExistente = await buscarUsuarioPorEmail(email);

  if (emailExistente) {
    res.status(409).json({ message: 'Esse e-mail já está cadastrado' });
    return;
  }

  if (await pinEmUso(pin)) {
    res.status(409).json({ message: 'Esse PIN já está em uso. Escolha outro PIN.' });
    return;
  }

  const usuarioId = crypto.randomUUID();
  const pinSalt = createPinSalt(usuarioId);
  const pinHash = hashPin(pin, pinSalt);

  const criado = await pool.query<UsuarioRow>(
    `
      INSERT INTO usuarios (id, nome, sobrenome, email, foto_url, pin_hash, pin_salt)
      VALUES ($1, $2, $3, $4, NULL, $5, $6)
      RETURNING id, nome, sobrenome, email, foto_url, pin_hash, pin_salt, created_at
    `,
    [usuarioId, nome, sobrenome, email, pinHash, pinSalt],
  );

  const usuario = criado.rows[0];

  res.status(201).json({
    token: signAuthToken(usuario.id, nomeCompleto(usuario.nome, usuario.sobrenome)),
    usuario: montarUsuarioPublico(usuario),
  });
}

export async function loginComPin(req: Request, res: Response): Promise<void> {
  const pin = String(req.body?.pin ?? '').trim();

  if (!/^\d{4}$/.test(pin)) {
    res.status(400).json({ message: 'PIN deve ter 4 números' });
    return;
  }

  const result = await pool.query<UsuarioRow>(
    `
      SELECT id, nome, sobrenome, email, foto_url, pin_hash, pin_salt, created_at
      FROM usuarios
      ORDER BY created_at ASC
    `,
  );

  const usuario = result.rows.find((row) => verifyPin(pin, row.pin_salt, row.pin_hash));

  if (!usuario) {
    res.status(401).json({ message: 'PIN incorreto' });
    return;
  }

  res.json({
    token: signAuthToken(usuario.id, nomeCompleto(usuario.nome, usuario.sobrenome)),
    usuario: montarUsuarioPublico(usuario),
  });
}

export async function obterUsuarioLogado(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string };

  if (!authReq.usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  const usuario = await buscarUsuarioPorId(authReq.usuarioId);

  if (!usuario) {
    res.status(404).json({ message: 'Usuário não encontrado' });
    return;
  }

  res.json({ usuario: montarUsuarioPublico(usuario) });
}

export async function atualizarPerfil(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string };
  const usuarioId = authReq.usuarioId;
  const nome = String(req.body?.nome ?? '').trim();
  const sobrenome = String(req.body?.sobrenome ?? '').trim();
  const email = normalizarEmail(String(req.body?.email ?? ''));
  const pinAtual = String(req.body?.pinAtual ?? '').trim();
  const fotoUrlInput = req.body?.fotoUrl;
  const fotoUrl = typeof fotoUrlInput === 'string' ? (fotoUrlInput.trim() || null) : null;

  if (!usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return;
  }

  const erroNome = validarNomeCampo(nome, 'Nome');
  const erroSobrenome = validarNomeCampo(sobrenome, 'Sobrenome');
  const erroEmail = validarEmail(email);
  const erroPin = mensagemPinInvalido(pinAtual);
  const erroFoto = validarFotoUrl(fotoUrl);

  if (erroNome || erroSobrenome || erroEmail || erroPin || erroFoto) {
    res.status(400).json({ message: erroNome || erroSobrenome || erroEmail || erroPin || erroFoto });
    return;
  }

  const usuario = await buscarUsuarioPorId(usuarioId);

  if (!usuario || !verifyPin(pinAtual, usuario.pin_salt, usuario.pin_hash)) {
    res.status(401).json({ message: 'PIN atual incorreto' });
    return;
  }

  const emailExistente = await buscarUsuarioPorEmail(email);

  if (emailExistente && emailExistente.id !== usuarioId) {
    res.status(409).json({ message: 'Esse e-mail já está em uso por outra pessoa' });
    return;
  }

  const atualizado = await pool.query<UsuarioRow>(
    `
      UPDATE usuarios
      SET nome = $1,
          sobrenome = $2,
          email = $3,
          foto_url = $4,
          updated_at = NOW()
      WHERE id = $5
      RETURNING id, nome, sobrenome, email, foto_url, pin_hash, pin_salt, created_at
    `,
    [nome, sobrenome, email, fotoUrl, usuarioId],
  );

  const usuarioAtualizado = atualizado.rows[0];

  res.json({
    token: signAuthToken(usuarioId, nomeCompleto(usuarioAtualizado.nome, usuarioAtualizado.sobrenome)),
    usuario: montarUsuarioPublico(usuarioAtualizado),
  });
}

export async function atualizarPin(req: Request, res: Response): Promise<void> {
  const authReq = req as Request & { usuarioId?: string };
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

  if (await pinEmUso(pinNovo, usuarioId)) {
    res.status(409).json({ message: 'Esse PIN já está em uso. Escolha outro PIN.' });
    return;
  }

  const pinSalt = createPinSalt(usuarioId);
  const pinHash = hashPin(pinNovo, pinSalt);

  await pool.query(
    'UPDATE usuarios SET pin_hash = $1, pin_salt = $2, updated_at = NOW() WHERE id = $3',
    [pinHash, pinSalt, usuarioId],
  );

  res.json({ message: 'PIN atualizado com sucesso' });
}
