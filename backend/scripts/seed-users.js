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
      pin: '0708',
      salt: 'mateus-salt-v1',
    },
    {
      nome: 'Andréa',
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
        nome VARCHAR(100) NOT NULL UNIQUE,
        pin_hash TEXT NOT NULL,
        pin_salt TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

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
              pin_hash = $2,
              pin_salt = $3
          WHERE id = $4
        `,
        [
          'Andréa',
          hashPin('2506', 'andrea-salt-v1'),
          'andrea-salt-v1',
          andreaAntiga.id,
        ],
      );
    }

    for (const usuario of usuarios) {
      await client.query(
        `
          INSERT INTO usuarios (nome, pin_hash, pin_salt)
          VALUES ($1, $2, $3)
          ON CONFLICT (nome) DO UPDATE
          SET pin_hash = EXCLUDED.pin_hash,
              pin_salt = EXCLUDED.pin_salt
        `,
        [usuario.nome, hashPin(usuario.pin, usuario.salt), usuario.salt],
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
