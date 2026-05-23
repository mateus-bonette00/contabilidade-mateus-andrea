export interface Usuario {
  id: string;
  nome: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}
