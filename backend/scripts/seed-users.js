const crypto = require('crypto');
const path = require('path');

const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function hashPin(pin, salt) {
  return crypto.scryptSync(pin, salt, 64).toString('hex');
}

async function main() {
  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5433),
    user: process.env.DATABASE_USER || 'contabilidade',
    password: process.env.DATABASE_PASSWORD || 'contabilidade',
    database: process.env.DATABASE_NAME || 'contabilidade',
  });

  const usuarios = [
    {
      nome: 'Mateus',
      sobrenome: 'Silva',
      email: 'mateus@familymoney.app',
      pin: '0708',
      salt: 'mateus-salt-v1',
    },
    {
      nome: 'Andréa',
      sobrenome: 'Silva',
      email: 'andrea@familymoney.app',
      pin: '2506',
      salt: 'andrea-salt-v1',
    },
  ];

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await client.query(`
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
      )
    `);

    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sobrenome VARCHAR(100)');
    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email VARCHAR(160)');
    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT');
    await client.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');

    await client.query(`
      UPDATE usuarios
      SET sobrenome = 'Silva'
      WHERE sobrenome IS NULL OR trim(sobrenome) = ''
    `);

    await client.query(`
      UPDATE usuarios
      SET email = CONCAT(
        lower(regexp_replace(nome, '[^a-zA-Z0-9]+', '', 'g')),
        '-',
        substr(id::text, 1, 6),
        '@familymoney.local'
      )
      WHERE email IS NULL OR trim(email) = ''
    `);

    await client.query('ALTER TABLE usuarios ALTER COLUMN sobrenome SET NOT NULL');
    await client.query('ALTER TABLE usuarios ALTER COLUMN email SET NOT NULL');
    await client.query('ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_nome_key');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_key ON usuarios (email)');

    const andreaAntigaResult = await client.query(
      'SELECT id FROM usuarios WHERE nome = $1 LIMIT 1',
      ['Andrea'],
    );
    const andreaNovaResult = await client.query(
      'SELECT id FROM usuarios WHERE nome = $1 LIMIT 1',
      ['Andréa'],
    );
    const tabelasResult = await client.query(`
      SELECT
        to_regclass('public.entradas') IS NOT NULL AS entradas_existe,
        to_regclass('public.saidas') IS NOT NULL AS saidas_existe
    `);

    const andreaAntiga = andreaAntigaResult.rows[0];
    const andreaNova = andreaNovaResult.rows[0];
    const tabelas = tabelasResult.rows[0] || {
      entradas_existe: false,
      saidas_existe: false,
    };

    if (andreaAntiga && andreaNova) {
      if (tabelas.entradas_existe) {
        await client.query('UPDATE entradas SET usuario_id = $1 WHERE usuario_id = $2', [
          andreaNova.id,
          andreaAntiga.id,
        ]);
      }

      if (tabelas.saidas_existe) {
        await client.query('UPDATE saidas SET usuario_id = $1 WHERE usuario_id = $2', [
          andreaNova.id,
          andreaAntiga.id,
        ]);
      }

      await client.query('DELETE FROM usuarios WHERE id = $1', [andreaAntiga.id]);
    } else if (andreaAntiga) {
      await client.query(
        `
          UPDATE usuarios
          SET nome = $1,
              sobrenome = $2,
              email = $3,
              pin_hash = $4,
              pin_salt = $5,
              updated_at = NOW()
          WHERE id = $6
        `,
        [
          'Andréa',
          'Silva',
          'andrea@familymoney.app',
          hashPin('2506', 'andrea-salt-v1'),
          'andrea-salt-v1',
          andreaAntiga.id,
        ],
      );
    }

    for (const usuario of usuarios) {
      await client.query(
        `
          INSERT INTO usuarios (nome, sobrenome, email, pin_hash, pin_salt)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (email) DO UPDATE
          SET nome = EXCLUDED.nome,
              sobrenome = EXCLUDED.sobrenome,
              pin_hash = EXCLUDED.pin_hash,
              pin_salt = EXCLUDED.pin_salt,
              updated_at = NOW()
        `,
        [usuario.nome, usuario.sobrenome, usuario.email, hashPin(usuario.pin, usuario.salt), usuario.salt],
      );
    }

    await client.query('COMMIT');
    console.log('Usuários criados/atualizados com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar usuários.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Erro inesperado ao executar o seed.');
  console.error(error);
  process.exitCode = 1;
});
