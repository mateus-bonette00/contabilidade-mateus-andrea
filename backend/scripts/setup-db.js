const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

async function main() {
  const schemaPath = path.resolve(__dirname, '..', '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const pool = new Pool({
    host: process.env.DATABASE_HOST || 'localhost',
    port: Number(process.env.DATABASE_PORT || 5433),
    user: process.env.DATABASE_USER || 'contabilidade',
    password: process.env.DATABASE_PASSWORD || 'contabilidade',
    database: process.env.DATABASE_NAME || 'contabilidade',
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Schema aplicado com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao aplicar schema.');
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Erro inesperado no setup do banco.');
  console.error(error);
  process.exitCode = 1;
});
