import crypto from 'crypto';
import { env } from '../config/env';

interface TokenPayload {
  sub: string;
  nome: string;
  exp: number;
}

function encodePayload(payload: TokenPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodePayload(encoded: string): TokenPayload | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

export function signAuthToken(usuarioId: string, nome: string): string {
  const payload: TokenPayload = {
    sub: usuarioId,
    nome,
    exp: Date.now() + env.authTokenTtlMs,
  };

  const encoded = encodePayload(payload);
  const signature = crypto.createHmac('sha256', env.authSecret).update(encoded).digest('base64url');

  return `${encoded}.${signature}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  const [encoded, signature] = token.split('.');

  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.authSecret)
    .update(encoded)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const payload = decodePayload(encoded);

  if (!payload || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}
