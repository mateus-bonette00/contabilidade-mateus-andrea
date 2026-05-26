import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Saida, NovaSaida } from '../models/saida.model';

@Injectable({ providedIn: 'root' })
export class SaidasService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  listar(): Observable<Saida[]> {
    return this.http.get<Saida[]>(`${this.api.baseUrl}/saidas`);
  }

  criar(saida: NovaSaida): Observable<Saida> {
    return this.http.post<Saida>(`${this.api.baseUrl}/saidas`, saida);
  }
}
