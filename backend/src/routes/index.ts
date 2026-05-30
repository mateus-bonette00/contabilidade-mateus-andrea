import { Router } from 'express';
import { authRouter } from './auth.routes';
import { entradasRouter } from './entradas.routes';
import { healthRouter } from './health.routes';
import { openFinanceRouter } from './open-finance.routes';
import { saidasRouter } from './saidas.routes';
import { webhooksRouter } from './webhooks.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/webhooks', webhooksRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/entradas', entradasRouter);
apiRouter.use('/saidas', saidasRouter);
apiRouter.use('/open-finance', openFinanceRouter);
