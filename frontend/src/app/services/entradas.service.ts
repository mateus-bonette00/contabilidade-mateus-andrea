import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Entrada, NovaEntrada } from '../models/entrada.model';

@Injectable({ providedIn: 'root' })
export class EntradasService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  listar(): Observable<Entrada[]> {
    return this.http.get<Entrada[]>(`${this.api.baseUrl}/entradas`);
  }

  criar(entrada: NovaEntrada): Observable<Entrada> {
    return this.http.post<Entrada>(`${this.api.baseUrl}/entradas`, entrada);
  }
}
