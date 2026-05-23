CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entradas ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios (id) ON DELETE CASCADE;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios (id) ON DELETE CASCADE;

INSERT INTO usuarios (nome, pin_hash, pin_salt)
VALUES
  (
    'Mateus',
    '774fed8f9228edad4ac55790fffa7c768aa983549a1f6c970cb3d8ad130f6bebff56100551dc1da63d47aecd9543a07b526b95d2cc077d50a073ecc0058e6a30',
    'mateus-salt-v1'
  ),
  (
    'Andrea',
    '0a6de7907335b015c4200b45ce4d0d7dcafd96b6399d928f2a9269924343f2f562a978ea5f323f0c0a72f28ad46a6707070d05708a0064a146a09b4ca5d22513',
    'andrea-salt-v1'
  )
ON CONFLICT (nome) DO NOTHING;
