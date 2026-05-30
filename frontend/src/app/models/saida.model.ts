export interface Saida {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
  origem?: 'manual' | 'open_finance';
  instituicao_nome?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NovaSaida {
  descricao: string;
  valor: number;
  data_referencia: string;
}
