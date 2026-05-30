import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { apiRouter } from './routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRouter);
  app.use(errorHandler);

  return app;
}
