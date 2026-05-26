import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: '5mb' }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'contabilidade-api',
      version: '0.1.0',
      endpoints: ['/api/health', '/api/auth/cadastro', '/api/auth/login', '/api/entradas', '/api/saidas'],
    });
  });

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
}
