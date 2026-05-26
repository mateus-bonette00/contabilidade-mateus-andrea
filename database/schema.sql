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

CREATE INDEX IF NOT EXISTS idx_entradas_usuario_data ON entradas (usuario_id, data_referencia);
CREATE INDEX IF NOT EXISTS idx_saidas_usuario_data ON saidas (usuario_id, data_referencia);

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
        pin_hash = 'db4c4440229dc070af8e27c4244d83d4cd3ed9cb5c81b6777d518b9ff23f529b7c90a23e14b9790c1db830f819512fcb9135f1bcbff1c1c33b87be108c8e3c59',
        pin_salt = 'andrea-salt-v1',
        updated_at = NOW()
    WHERE id = andrea_antiga_id;
  END IF;
END $$;

INSERT INTO usuarios (nome, sobrenome, email, pin_hash, pin_salt)
VALUES
  (
    'Mateus',
    'Silva',
    'mateus@familymoney.app',
    'e3c9f94b80b53a731cee80e153b7689898f35bc78107023d9e4eb9a61d830989cd8f02774910701cfff31731e87f4bb5088463dd8dc58dc621b8890fb1111126',
    'mateus-salt-v1'
  ),
  (
    'Andréa',
    'Silva',
    'andrea@familymoney.app',
    'db4c4440229dc070af8e27c4244d83d4cd3ed9cb5c81b6777d518b9ff23f529b7c90a23e14b9790c1db830f819512fcb9135f1bcbff1c1c33b87be108c8e3c59',
    'andrea-salt-v1'
  )
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    sobrenome = EXCLUDED.sobrenome,
    pin_hash = EXCLUDED.pin_hash,
    pin_salt = EXCLUDED.pin_salt,
    updated_at = NOW();
