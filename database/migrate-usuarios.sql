CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  pin_salt TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE entradas ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios (id) ON DELETE CASCADE;
ALTER TABLE saidas ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES usuarios (id) ON DELETE CASCADE;

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
        pin_hash = 'db4c4440229dc070af8e27c4244d83d4cd3ed9cb5c81b6777d518b9ff23f529b7c90a23e14b9790c1db830f819512fcb9135f1bcbff1c1c33b87be108c8e3c59',
        pin_salt = 'andrea-salt-v1'
    WHERE id = andrea_antiga_id;
  END IF;
END $$;

INSERT INTO usuarios (nome, pin_hash, pin_salt)
VALUES
  (
    'Mateus',
    'e3c9f94b80b53a731cee80e153b7689898f35bc78107023d9e4eb9a61d830989cd8f02774910701cfff31731e87f4bb5088463dd8dc58dc621b8890fb1111126',
    'mateus-salt-v1'
  ),
  (
    'Andréa',
    'db4c4440229dc070af8e27c4244d83d4cd3ed9cb5c81b6777d518b9ff23f529b7c90a23e14b9790c1db830f819512fcb9135f1bcbff1c1c33b87be108c8e3c59',
    'andrea-salt-v1'
  )
ON CONFLICT (nome) DO UPDATE
SET pin_hash = EXCLUDED.pin_hash,
    pin_salt = EXCLUDED.pin_salt;
