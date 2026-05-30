CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  foto_url TEXT,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sobrenome VARCHAR(100);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(160);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE usuarios
SET sobrenome = 'Silva'
WHERE sobrenome IS NULL OR trim(sobrenome) = '';

UPDATE usuarios
SET email = CONCAT(
  lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '', 'g')),
  '-',
  substr(id::text, 1, 6),
  '@familymoney.local'
)
WHERE email IS NULL OR trim(email) = '';

ALTER TABLE usuarios ALTER COLUMN sobrenome SET NOT NULL;
ALTER TABLE usuarios ALTER COLUMN email SET NOT NULL;

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_nome_key;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_key ON usuarios (email);

CREATE TABLE IF NOT EXISTS entradas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data_referencia DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS saidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  descricao VARCHAR(255) NOT NULL,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  data_referencia DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conexoes_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  instituicao_codigo VARCHAR(40) NOT NULL,
  instituicao_nome VARCHAR(120) NOT NULL,
  provedor VARCHAR(32) NOT NULL DEFAULT 'pluggy',
  provedor_item_id VARCHAR(120),
  status VARCHAR(24) NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'erro', 'expirada', 'desconectada')),
  consent_expires_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entradas ADD COLUMN IF NOT EXISTS origem VARCHAR(24) NOT NULL DEFAULT 'manual';
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS conexao_bancaria_id UUID REFERENCES conexoes_bancarias (id) ON DELETE SET NULL;
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS transacao_externa_id VARCHAR(120);
ALTER TABLE entradas ADD COLUMN IF NOT EXISTS instituicao_nome VARCHAR(120);

ALTER TABLE saidas ADD COLUMN IF NOT EXISTS origem VARCHAR(24) NOT NULL DEFAULT 'manual';
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS conexao_bancaria_id UUID REFERENCES conexoes_bancarias (id) ON DELETE SET NULL;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS transacao_externa_id VARCHAR(120);
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS instituicao_nome VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_entradas_usuario_data ON entradas (usuario_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_saidas_usuario_data ON saidas (usuario_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_conexoes_bancarias_usuario ON conexoes_bancarias (usuario_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS conexoes_bancarias_item_unique
  ON conexoes_bancarias (provedor, provedor_item_id)
  WHERE provedor_item_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS entradas_transacao_bancaria_unique
  ON entradas (usuario_id, conexao_bancaria_id, transacao_externa_id)
  WHERE transacao_externa_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS saidas_transacao_bancaria_unique
  ON saidas (usuario_id, conexao_bancaria_id, transacao_externa_id)
  WHERE transacao_externa_id IS NOT NULL;

DO $$
DECLARE
  andrea_antiga_id UUID;
  andrea_id UUID;
BEGIN
  SELECT id INTO andrea_antiga_id
  FROM usuarios
  WHERE nome = 'Andrea'
  LIMIT 1;

  SELECT id INTO andrea_id
  FROM usuarios
  WHERE nome = 'Andréa'
  LIMIT 1;

  IF andrea_antiga_id IS NOT NULL AND andrea_id IS NOT NULL THEN
    UPDATE entradas SET usuario_id = andrea_id WHERE usuario_id = andrea_antiga_id;
    UPDATE saidas SET usuario_id = andrea_id WHERE usuario_id = andrea_antiga_id;
    DELETE FROM usuarios WHERE id = andrea_antiga_id;
  ELSIF andrea_antiga_id IS NOT NULL THEN
    UPDATE usuarios
    SET nome = 'Andréa',
        sobrenome = COALESCE(NULLIF(trim(sobrenome), ''), 'Silva'),
        email = COALESCE(NULLIF(trim(email), ''), 'andrea@familymoney.app'),
        updated_at = NOW()
    WHERE id = andrea_antiga_id;
  END IF;
END $$;
