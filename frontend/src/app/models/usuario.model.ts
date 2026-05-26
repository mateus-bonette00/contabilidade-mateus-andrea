export interface Usuario {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
  fotoUrl: string | null;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface CadastroPayload {
  nome: string;
  sobrenome: string;
  email: string;
  pin: string;
  pinConfirmacao: string;
}

export interface AtualizarPerfilPayload {
  nome: string;
  sobrenome: string;
  email: string;
  fotoUrl: string | null;
  pinAtual: string;
}
