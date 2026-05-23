import { Router } from 'express';
import { authRouter } from './auth.routes';
import { entradasRouter } from './entradas.routes';
import { healthRouter } from './health.routes';
import { saidasRouter } from './saidas.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/entradas', entradasRouter);
apiRouter.use('/saidas', saidasRouter);
