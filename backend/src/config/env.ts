import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5433),
    user: process.env.DATABASE_USER ?? 'contabilidade',
    password: process.env.DATABASE_PASSWORD ?? 'contabilidade',
    name: process.env.DATABASE_NAME ?? 'contabilidade',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  authSecret: process.env.AUTH_SECRET ?? 'troque-esta-chave-em-producao',
  authTokenTtlMs: Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 24 * 7),
};
