import { Router } from 'express';
import { loginComPin, obterUsuarioLogado } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/login', loginComPin);
authRouter.get('/me', requireAuth, obterUsuarioLogado);
