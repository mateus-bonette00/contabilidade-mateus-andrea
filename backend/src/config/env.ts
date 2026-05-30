import dotenv from 'dotenv';

dotenv.config();

function numeroOpcional(valor: string | undefined): number | null {
  const numero = Number(valor);
  return valor && Number.isInteger(numero) ? numero : null;
}

function obrigatorio(nome: string): string {
  const valor = process.env[nome];
  if (!valor || valor.trim() === '') {
    throw new Error(`Variável de ambiente obrigatória não definida: ${nome}`);
  }
  return valor.trim();
}

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
  authSecret: process.env.NODE_ENV === 'production'
    ? obrigatorio('AUTH_SECRET')
    : (process.env.AUTH_SECRET ?? 'dev-secret-local-nao-usar-em-producao'),
  authTokenTtlMs: Number(process.env.AUTH_TOKEN_TTL_MS ?? 1000 * 60 * 60 * 24 * 7),
  openFinance: {
    pluggyBaseUrl: process.env.PLUGGY_BASE_URL ?? 'https://api.pluggy.ai',
    pluggyClientId: process.env.PLUGGY_CLIENT_ID ?? '',
    pluggyClientSecret: process.env.PLUGGY_CLIENT_SECRET ?? '',
    webhookUrl: process.env.PLUGGY_WEBHOOK_URL ?? '',
    connectorIds: {
      bb: numeroOpcional(process.env.PLUGGY_CONNECTOR_BB_ID),
      itau: numeroOpcional(process.env.PLUGGY_CONNECTOR_ITAU_ID),
      nubank: numeroOpcional(process.env.PLUGGY_CONNECTOR_NUBANK_ID),
    },
  },
};
