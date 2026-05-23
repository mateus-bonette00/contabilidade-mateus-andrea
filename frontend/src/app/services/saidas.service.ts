import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface SaidaRegistro {
  id: string;
  descricao: string;
  valor: string;
  data_referencia: string;
}

export interface SaidaPayload {
  descricao: string;
  valor: number;
  data_referencia: string;
}

@Injectable({ providedIn: 'root' })
export class SaidasService {
  constructor(
    private readonly http: HttpClient,
    private readonly api: ApiService,
  ) {}

  listar(): Observable<SaidaRegistro[]> {
    return this.http.get<SaidaRegistro[]>(`${this.api.baseUrl}/saidas`);
  }

  cadastrar(payload: SaidaPayload): Observable<SaidaRegistro> {
    return this.http.post<SaidaRegistro>(`${this.api.baseUrl}/saidas`, payload);
  }
}
