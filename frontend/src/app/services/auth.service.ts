import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { AtualizarPerfilPayload, CadastroPayload, LoginResponse, Usuario } from '../models/usuario.model';

const STORAGE_TOKEN = 'fm_token';
const STORAGE_USUARIO = 'fm_usuario';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly usuarioSignal = signal<Usuario | null>(this.readStoredUsuario());

  readonly usuario = this.usuarioSignal.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly api: ApiService,
  ) {}

  get token(): string | null {
    return sessionStorage.getItem(STORAGE_TOKEN);
  }

  isLoggedIn(): boolean {
    return Boolean(this.token && this.usuarioSignal());
  }

  login(pin: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api.baseUrl}/auth/login`, { pin })
      .pipe(tap((response) => this.persistSession(response)));
  }

  cadastrar(payload: CadastroPayload): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.api.baseUrl}/auth/cadastro`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  carregarPerfil(): Observable<{ usuario: Usuario }> {
    return this.http
      .get<{ usuario: Usuario }>(`${this.api.baseUrl}/auth/me`)
      .pipe(tap((response) => this.usuarioSignal.set(response.usuario)));
  }

  atualizarPerfil(payload: AtualizarPerfilPayload): Observable<LoginResponse> {
    return this.http
      .patch<LoginResponse>(`${this.api.baseUrl}/auth/perfil`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  atualizarPin(pinAtual: string, pinNovo: string, pinConfirmacao: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.api.baseUrl}/auth/pin`, {
      pinAtual,
      pinNovo,
      pinConfirmacao,
    });
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USUARIO);
    this.usuarioSignal.set(null);
  }

  private persistSession(response: LoginResponse): void {
    sessionStorage.setItem(STORAGE_TOKEN, response.token);
    sessionStorage.setItem(STORAGE_USUARIO, JSON.stringify(response.usuario));
    this.usuarioSignal.set(response.usuario);
  }

  private readStoredUsuario(): Usuario | null {
    const raw = sessionStorage.getItem(STORAGE_USUARIO);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Usuario;
    } catch {
      return null;
    }
  }
}
