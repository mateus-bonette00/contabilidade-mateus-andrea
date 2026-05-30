import { Router } from 'express';
import {
  desconectarConexao,
  gerarConnectToken,
  listarConfiguracaoOpenFinance,
  listarConexoes,
  registrarConexao,
  sincronizarConexao,
} from '../controllers/open-finance.controller';
import { requireAuth } from '../middleware/auth';

export const openFinanceRouter = Router();

openFinanceRouter.use(requireAuth);
openFinanceRouter.get('/configuracao', listarConfiguracaoOpenFinance);
openFinanceRouter.get('/conexoes', listarConexoes);
openFinanceRouter.post('/connect-token', gerarConnectToken);
openFinanceRouter.post('/conexoes', registrarConexao);
openFinanceRouter.post('/conexoes/:id/sincronizar', sincronizarConexao);
openFinanceRouter.delete('/conexoes/:id', desconectarConexao);
