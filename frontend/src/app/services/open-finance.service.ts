import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ConfiguracaoOpenFinance,
  ConexaoBancaria,
  ConnectTokenResponse,
} from '../models/conexao-bancaria.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class OpenFinanceService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  obterConfiguracao(): Observable<ConfiguracaoOpenFinance> {
    return this.http.get<ConfiguracaoOpenFinance>(`${this.api.baseUrl}/open-finance/configuracao`);
  }

  listarConexoes(): Observable<ConexaoBancaria[]> {
    return this.http.get<ConexaoBancaria[]>(`${this.api.baseUrl}/open-finance/conexoes`);
  }

  criarConnectToken(instituicaoCodigo: string): Observable<ConnectTokenResponse> {
    return this.http.post<ConnectTokenResponse>(`${this.api.baseUrl}/open-finance/connect-token`, {
      instituicaoCodigo,
    });
  }

  registrarConexao(instituicaoCodigo: string, itemId: string): Observable<ConexaoBancaria> {
    return this.http.post<ConexaoBancaria>(`${this.api.baseUrl}/open-finance/conexoes`, {
      instituicaoCodigo,
      itemId,
    });
  }

  sincronizar(id: string): Observable<{ message: string; importadas: number }> {
    return this.http.post<{ message: string; importadas: number }>(
      `${this.api.baseUrl}/open-finance/conexoes/${id}/sincronizar`,
      {},
    );
  }

  desconectar(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api.baseUrl}/open-finance/conexoes/${id}`);
  }
}
