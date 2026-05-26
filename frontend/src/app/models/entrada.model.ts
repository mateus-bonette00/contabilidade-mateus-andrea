export interface Entrada {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
  created_at: string;
  updated_at: string;
}

export interface NovaEntrada {
  descricao: string;
  valor: number;
  data_referencia: string;
}
