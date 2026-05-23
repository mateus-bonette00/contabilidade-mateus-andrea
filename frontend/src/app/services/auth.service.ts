import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginResponse, Usuario } from '../models/usuario.model';

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
      .pipe(
        tap((response) => {
          sessionStorage.setItem(STORAGE_TOKEN, response.token);
          sessionStorage.setItem(STORAGE_USUARIO, JSON.stringify(response.usuario));
          this.usuarioSignal.set(response.usuario);
        }),
      );
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USUARIO);
    this.usuarioSignal.set(null);
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
