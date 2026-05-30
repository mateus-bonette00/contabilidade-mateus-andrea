export interface InstituicaoBancaria {
  codigo: 'bb' | 'itau' | 'nubank';
  nome: string;
  disponivel: boolean;
}

export interface ConfiguracaoOpenFinance {
  provedor: string;
  configurado: boolean;
  instituicoes: InstituicaoBancaria[];
}

export interface ConexaoBancaria {
  id: string;
  instituicao_codigo: string;
  instituicao_nome: string;
  provedor: string;
  provedor_item_id: string | null;
  status: 'ativa' | 'erro' | 'expirada' | 'desconectada';
  consent_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectTokenResponse {
  accessToken: string;
  selectedConnectorId: number | null;
}
