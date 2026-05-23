import { Router } from 'express';
import { createEntrada, listEntradas } from '../controllers/entradas.controller';
import { requireAuth } from '../middleware/auth';

export const entradasRouter = Router();

entradasRouter.use(requireAuth);
entradasRouter.get('/', listEntradas);
entradasRouter.post('/', createEntrada);
