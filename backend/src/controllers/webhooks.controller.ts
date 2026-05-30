import crypto from 'crypto';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { marcarConexaoDesconectadaPorItemId, sincronizarConexaoPorItemId } from './open-finance.controller';

function webhookAssinaturaValida(req: Request): boolean {
  const segredo = env.openFinance.pluggyClientSecret;
  if (!segredo) {
    return true;
  }

  const assinatura = req.headers['x-pluggy-signature'];
  if (!assinatura || typeof assinatura !== 'string') {
    return false;
  }

  const corpo = JSON.stringify(req.body);
  const esperado = crypto.createHmac('sha256', segredo).update(corpo).digest('hex');
  const assinaturaBuffer = Buffer.from(assinatura);
  const esperadoBuffer = Buffer.from(esperado);

  if (assinaturaBuffer.length !== esperadoBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(assinaturaBuffer, esperadoBuffer);
}

export async function receberWebhookPluggy(req: Request, res: Response): Promise<void> {
  if (!webhookAssinaturaValida(req)) {
    res.status(401).json({ message: 'Assinatura inválida' });
    return;
  }

  const evento = String(req.body?.event ?? 'unknown');
  const eventId = String(req.body?.eventId ?? '');
  const itemId = String(req.body?.itemId ?? '');

  console.log(`[pluggy:webhook] event=${evento} eventId=${eventId} itemId=${itemId}`);
  res.json({ received: true });

  void processarWebhookPluggy(evento, itemId).catch((erro) => {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    console.error(`[pluggy:webhook] erro ao processar ${evento} itemId=${itemId}: ${mensagem}`);
  });
}

const EVENTOS_QUE_SINCRONIZAM = new Set([
  'item/created',
  'item/updated',
  'transactions/created',
  'transactions/updated',
  'transactions/deleted',
]);

async function processarWebhookPluggy(evento: string, itemId: string): Promise<void> {
  if (!itemId) {
    return;
  }

  if (EVENTOS_QUE_SINCRONIZAM.has(evento)) {
    const importadas = await sincronizarConexaoPorItemId(itemId);

    if (importadas !== null) {
      console.log(`[pluggy:webhook] sincronizacao automatica itemId=${itemId} importadas=${importadas}`);
    }

    return;
  }

  if (evento === 'item/deleted') {
    const desconectada = await marcarConexaoDesconectadaPorItemId(itemId);

    if (desconectada) {
      console.log(`[pluggy:webhook] conexao marcada como desconectada itemId=${itemId}`);
    }
  }
}
