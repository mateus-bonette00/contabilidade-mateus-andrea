import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  atualizarPerfil,
  atualizarPin,
  cadastrarUsuario,
  loginComPin,
  obterUsuarioLogado,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
});

const cadastroLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitos cadastros realizados. Tente novamente em 1 hora.' },
});

authRouter.post('/cadastro', cadastroLimiter, cadastrarUsuario);
authRouter.post('/login', loginLimiter, loginComPin);
authRouter.get('/me', requireAuth, obterUsuarioLogado);
authRouter.patch('/perfil', requireAuth, atualizarPerfil);
authRouter.patch('/pin', requireAuth, atualizarPin);
