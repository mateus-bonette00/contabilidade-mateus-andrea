import { Router } from 'express';
import {
  atualizarPerfil,
  atualizarPin,
  cadastrarUsuario,
  loginComPin,
  obterUsuarioLogado,
} from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

export const authRouter = Router();

authRouter.post('/cadastro', cadastrarUsuario);
authRouter.post('/login', loginComPin);
authRouter.get('/me', requireAuth, obterUsuarioLogado);
authRouter.patch('/perfil', requireAuth, atualizarPerfil);
authRouter.patch('/pin', requireAuth, atualizarPin);
