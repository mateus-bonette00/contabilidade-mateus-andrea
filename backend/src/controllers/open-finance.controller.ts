import { Response } from 'express';
import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  buscarTransacoesPluggy,
  criarConnectToken,
  listarInstituicoesResolvidas,
  obterInstituicao,
  pluggyConfigurado,
  removerItemPluggy,
  resolverInstituicaoOpenFinance,
  TransacaoPluggy,
} from '../services/pluggy.service';

interface ConexaoBancariaRow {
  id: string;
  instituicao_codigo: string;
  instituicao_nome: string;
  provedor: string;
  provedor_item_id: string | null;
  status: string;
  consent_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ConexaoBancariaInternaRow extends ConexaoBancariaRow {
  usuario_id: string;
}

function exigirUsuario(req: AuthenticatedRequest, res: Response): string | null {
  if (!req.usuarioId) {
    res.status(401).json({ message: 'Faça login com seu PIN' });
    return null;
  }

  return req.usuarioId;
}

async function buscarConexao(usuarioId: string, id: string): Promise<ConexaoBancariaInternaRow | null> {
  const result = await pool.query<ConexaoBancariaInternaRow>(
    `SELECT id, usuario_id, instituicao_codigo, instituicao_nome, provedor, provedor_item_id, status,
            consent_expires_at, last_synced_at, created_at, updated_at
     FROM conexoes_bancarias
     WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId],
  );

  return result.rows[0] ?? null;
}

async function buscarConexaoPorItemId(itemId: string): Promise<ConexaoBancariaInternaRow | null> {
  const result = await pool.query<ConexaoBancariaInternaRow>(
    `SELECT id, usuario_id, instituicao_codigo, instituicao_nome, provedor, provedor_item_id, status,
            consent_expires_at, last_synced_at, created_at, updated_at
     FROM conexoes_bancarias
     WHERE provedor = 'pluggy'
       AND provedor_item_id = $1
       AND status <> 'desconectada'
     ORDER BY updated_at DESC
     LIMIT 1`,
    [itemId],
  );

  return result.rows[0] ?? null;
}

export async function listarConfiguracaoOpenFinance(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!exigirUsuario(req, res)) {
    return;
  }

  const instituicoes = await listarInstituicoesResolvidas();

  res.json({
    provedor: 'Pluggy',
    configurado: pluggyConfigurado(),
    instituicoes: instituicoes.map(({ codigo, nome, connectorId }) => ({
      codigo,
      nome,
      disponivel: pluggyConfigurado() && connectorId !== null,
    })),
  });
}

export async function listarConexoes(req: AuthenticatedRequest, res: Response): Promise<void> {
  const usuarioId = exigirUsuario(req, res);
  if (!usuarioId) {
    return;
  }

  const result = await pool.query<ConexaoBancariaRow>(
    `SELECT id, instituicao_codigo, instituicao_nome, provedor, provedor_item_id, status,
            consent_expires_at, last_synced_at, created_at, updated_at
     FROM conexoes_bancarias
     WHERE usuario_id = $1 AND status <> 'desconectada'
     ORDER BY created_at DESC`,
    [usuarioId],
  );

  res.json(result.rows);
}

export async function gerarConnectToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  const usuarioId = exigirUsuario(req, res);
  if (!usuarioId) {
    return;
  }

  const instituicao = await resolverInstituicaoOpenFinance(String(req.body?.instituicaoCodigo ?? ''));

  if (!instituicao) {
    res.status(400).json({ message: 'Selecione uma instituição válida.' });
    return;
  }

  if (!pluggyConfigurado()) {
    res.status(503).json({
      message: 'Integração Open Finance ainda não ativada. Configure as credenciais Pluggy no servidor.',
    });
    return;
  }

  if (!instituicao.connectorId) {
    res.status(503).json({
      message: `${instituicao.nome} ainda não está disponível para conexão nesta aplicação Pluggy.`,
    });
    return;
  }

  const accessToken = await criarConnectToken(usuarioId);

  res.json({
    accessToken,
    selectedConnectorId: instituicao.connectorId,
  });
}

export async function registrarConexao(req: AuthenticatedRequest, res: Response): Promise<void> {
  const usuarioId = exigirUsuario(req, res);
  if (!usuarioId) {
    return;
  }

  const itemId = String(req.body?.itemId ?? '').trim();
  const instituicao = obterInstituicao(String(req.body?.instituicaoCodigo ?? ''));

  if (!instituicao || !/^[a-zA-Z0-9-]{10,120}$/.test(itemId)) {
    res.status(400).json({ message: 'Dados da conexão inválidos.' });
    return;
  }

  const result = await pool.query<ConexaoBancariaRow>(
    `INSERT INTO conexoes_bancarias
       (usuario_id, instituicao_codigo, instituicao_nome, provedor, provedor_item_id, status)
     VALUES ($1, $2, $3, 'pluggy', $4, 'ativa')
     ON CONFLICT (provedor, provedor_item_id) WHERE provedor_item_id IS NOT NULL
     DO UPDATE SET status = 'ativa', updated_at = NOW()
     WHERE conexoes_bancarias.usuario_id = EXCLUDED.usuario_id
     RETURNING id, instituicao_codigo, instituicao_nome, provedor, provedor_item_id, status,
               consent_expires_at, last_synced_at, created_at, updated_at`,
    [usuarioId, instituicao.codigo, instituicao.nome, itemId],
  );

  if (!result.rows[0]) {
    res.status(409).json({ message: 'Essa conexão já pertence a outro usuário.' });
    return;
  }

  res.status(201).json(result.rows[0]);
}

async function salvarTransacao(
  client: PoolClient,
  usuarioId: string,
  conexao: ConexaoBancariaRow,
  transacao: TransacaoPluggy,
): Promise<boolean> {
  if (
    transacao.status !== 'POSTED' ||
    (transacao.type !== 'CREDIT' && transacao.type !== 'DEBIT') ||
    !Number.isFinite(transacao.amount)
  ) {
    return false;
  }

  const tabela = transacao.type === 'CREDIT' ? 'entradas' : 'saidas';
  const descricao = String(transacao.description || 'Movimentação bancária').trim().slice(0, 255);
  const valor = Math.abs(transacao.amount).toFixed(2);
  const dataReferencia = String(transacao.date).slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia) || Number(valor) <= 0) {
    return false;
  }

  await client.query(
    `INSERT INTO ${tabela}
       (usuario_id, descricao, valor, data_referencia, origem, conexao_bancaria_id,
        transacao_externa_id, instituicao_nome)
     VALUES ($1, $2, $3, $4, 'open_finance', $5, $6, $7)
     ON CONFLICT (usuario_id, conexao_bancaria_id, transacao_externa_id)
       WHERE transacao_externa_id IS NOT NULL
     DO UPDATE SET descricao = EXCLUDED.descricao,
                   valor = EXCLUDED.valor,
                   data_referencia = EXCLUDED.data_referencia,
                   instituicao_nome = EXCLUDED.instituicao_nome,
                   updated_at = NOW()`,
    [usuarioId, descricao || 'Movimentação bancária', valor, dataReferencia, conexao.id, transacao.id, conexao.instituicao_nome],
  );

  return true;
}

async function executarSincronizacao(conexao: ConexaoBancariaInternaRow): Promise<number> {
  const transacoes = await buscarTransacoesPluggy(String(conexao.provedor_item_id));
  const client = await pool.connect();
  let importadas = 0;

  try {
    await client.query('BEGIN');
    for (const transacao of transacoes) {
      if (await salvarTransacao(client, conexao.usuario_id, conexao, transacao)) {
        importadas += 1;
      }
    }

    await client.query(
      `UPDATE conexoes_bancarias
       SET last_synced_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND usuario_id = $2`,
      [conexao.id, conexao.usuario_id],
    );
    await client.query('COMMIT');
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }

  return importadas;
}

export async function sincronizarConexaoPorItemId(itemId: string): Promise<number | null> {
  const conexao = await buscarConexaoPorItemId(itemId);

  if (!conexao || !conexao.provedor_item_id || !pluggyConfigurado()) {
    return null;
  }

  return executarSincronizacao(conexao);
}

export async function marcarConexaoDesconectadaPorItemId(itemId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE conexoes_bancarias
     SET status = 'desconectada', updated_at = NOW()
     WHERE provedor = 'pluggy' AND provedor_item_id = $1 AND status <> 'desconectada'`,
    [itemId],
  );

  return (result.rowCount ?? 0) > 0;
}

export async function sincronizarConexao(req: AuthenticatedRequest, res: Response): Promise<void> {
  const usuarioId = exigirUsuario(req, res);
  if (!usuarioId) {
    return;
  }

  const conexao = await buscarConexao(usuarioId, String(req.params.id ?? ''));

  if (!conexao || conexao.status !== 'ativa' || !conexao.provedor_item_id) {
    res.status(404).json({ message: 'Conexão bancária ativa não encontrada.' });
    return;
  }

  if (!pluggyConfigurado()) {
    res.status(503).json({ message: 'Credenciais do provedor Open Finance não estão configuradas.' });
    return;
  }

  const importadas = await executarSincronizacao(conexao);

  res.json({ message: 'Movimentações sincronizadas.', importadas });
}

export async function desconectarConexao(req: AuthenticatedRequest, res: Response): Promise<void> {
  const usuarioId = exigirUsuario(req, res);
  if (!usuarioId) {
    return;
  }

  const conexao = await buscarConexao(usuarioId, String(req.params.id ?? ''));

  if (!conexao || conexao.status === 'desconectada') {
    res.status(404).json({ message: 'Conexão bancária não encontrada.' });
    return;
  }

  if (conexao.provedor_item_id) {
    if (!pluggyConfigurado()) {
      res.status(503).json({ message: 'Ative as credenciais Open Finance para revogar a conexão com segurança.' });
      return;
    }
    await removerItemPluggy(conexao.provedor_item_id);
  }

  await pool.query(
    `UPDATE conexoes_bancarias SET status = 'desconectada', updated_at = NOW()
     WHERE id = $1 AND usuario_id = $2`,
    [conexao.id, usuarioId],
  );

  res.json({ message: 'Banco desconectado com sucesso.' });
}
