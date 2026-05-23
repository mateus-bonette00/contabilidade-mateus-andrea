import crypto from 'crypto';

export function hashPin(pin: string, salt: string): string {
  return crypto.scryptSync(pin, salt, 64).toString('hex');
}

export function createPinSalt(usuarioId: string): string {
  return `${usuarioId}-${crypto.randomBytes(8).toString('hex')}`;
}

export function verifyPin(pin: string, salt: string, expectedHash: string): boolean {
  const actualHash = hashPin(pin, salt);
  const actualBuffer = Buffer.from(actualHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
