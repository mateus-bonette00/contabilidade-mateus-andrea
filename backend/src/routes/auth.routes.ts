import { Router } from 'express';
import {
  atualizarNome,
  atualizarPin,
  loginComPin,
  obterUsuarioLogado,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', loginComPin);
authRouter.get('/me', requireAuth, obterUsuarioLogado);
authRouter.patch('/nome', requireAuth, atualizarNome);
authRouter.patch('/pin', requireAuth, atualizarPin);
