export interface Entrada {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
  origem: string;
  instituicao_nome: string | null;
  created_at: string;
  updated_at: string;
}

export interface Saida {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
  origem: string;
  instituicao_nome: string | null;
  created_at: string;
  updated_at: string;
}
