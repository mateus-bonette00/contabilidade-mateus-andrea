import { Router } from 'express';
import { createSaida, listSaidas } from '../controllers/saidas.controller';
import { requireAuth } from '../middleware/auth';

export const saidasRouter = Router();

saidasRouter.use(requireAuth);
saidasRouter.get('/', listSaidas);
saidasRouter.post('/', createSaida);
