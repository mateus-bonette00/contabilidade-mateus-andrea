import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface EntradaRegistro {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
}

export interface EntradaPayload {
  descricao: string;
  valor: number;
  data_referencia: string;
}

@Injectable({ providedIn: 'root' })
export class EntradasService {
  constructor(
    private readonly http: HttpClient,
    private readonly api: ApiService,
  ) {}

  listar(): Observable<EntradaRegistro[]> {
    return this.http.get<EntradaRegistro[]>(`${this.api.baseUrl}/entradas`);
  }

  cadastrar(payload: EntradaPayload): Observable<EntradaRegistro> {
    return this.http.post<EntradaRegistro>(`${this.api.baseUrl}/entradas`, payload);
  }
}
