import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { SecureCurrencyPipe } from '../../pipes/secure-currency.pipe';
import { EntradaRegistro, EntradasService } from '../../services/entradas.service';
import { SaidaRegistro, SaidasService } from '../../services/saidas.service';
import { AuthService } from '../../services/auth.service';
import { UserSettingsService } from '../../services/user-settings.service';

type VisaoDashboard = 'mes' | 'ano' | 'geral';
type RegistroFinanceiro = EntradaRegistro | SaidaRegistro;
type TipoMovimento = 'entrada' | 'saida';

interface MovimentoResumo {
  id: string;
  tipo: TipoMovimento;
  descricao: string;
  valor: number;
  data: string;
}

function valorEmCentavos(valor: number | string): number {
  return Math.round(Number(valor) * 100);
}

function somarValores(registros: RegistroFinanceiro[]): number {
  const totalCentavos = registros.reduce((total, registro) => total + valorEmCentavos(registro.valor), 0);
  return totalCentavos / 100;
}

function pertenceAoPeriodo(dataReferencia: string, visao: VisaoDashboard, hoje: Date): boolean {
  if (visao === 'geral') {
    return true;
  }

  const anoAtual = hoje.getFullYear().toString();
  const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');
  const [ano, mes] = dataReferencia.slice(0, 10).split('-');

  if (visao === 'ano') {
    return ano === anoAtual;
  }

  return ano === anoAtual && mes === mesAtual;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, SecureCurrencyPipe, DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly entradasService = inject(EntradasService);
  private readonly saidasService = inject(SaidasService);
  private readonly userSettings = inject(UserSettingsService);
  private readonly hoje = new Date();

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly settings = this.userSettings.settings;
  readonly visaoSelecionada = signal<VisaoDashboard>(this.userSettings.settings().dashboardDefaultView);
  readonly entradas = signal<EntradaRegistro[]>([]);
  readonly saidas = signal<SaidaRegistro[]>([]);

  readonly entradasFiltradas = computed(() =>
    this.entradas().filter((entrada) => pertenceAoPeriodo(entrada.data_referencia, this.visaoSelecionada(), this.hoje)),
  );
  readonly saidasFiltradas = computed(() =>
    this.saidas().filter((saida) => pertenceAoPeriodo(saida.data_referencia, this.visaoSelecionada(), this.hoje)),
  );
  readonly totalEntradas = computed(() => somarValores(this.entradasFiltradas()));
  readonly totalSaidas = computed(() => somarValores(this.saidasFiltradas()));
  readonly saldo = computed(() => this.totalEntradas() - this.totalSaidas());
  readonly saldoTotal = computed(() => somarValores(this.entradas()) - somarValores(this.saidas()));
  readonly usuarioNome = computed(() => this.auth.usuario()?.nome ?? 'Usuário');
  readonly quantidadeEntradas = computed(() => this.entradasFiltradas().length);
  readonly quantidadeSaidas = computed(() => this.saidasFiltradas().length);
  readonly movimentosRecentes = computed<MovimentoResumo[]>(() => {
    const entradas = this.entradasFiltradas().map((entrada) => ({
      id: entrada.id,
      tipo: 'entrada' as const,
      descricao: entrada.descricao,
      valor: Number(entrada.valor),
      data: entrada.data_referencia,
    }));
    const saidas = this.saidasFiltradas().map((saida) => ({
      id: saida.id,
      tipo: 'saida' as const,
      descricao: saida.descricao,
      valor: Number(saida.valor),
      data: saida.data_referencia,
    }));

    return [...entradas, ...saidas]
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 8);
  });
  readonly percentualSaidas = computed(() => {
    if (this.totalEntradas() <= 0) {
      return this.totalSaidas() > 0 ? 100 : 0;
    }

    return Math.min(100, Math.round((this.totalSaidas() / this.totalEntradas()) * 100));
  });
  readonly mensagemResumo = computed(() => {
    const saldo = this.saldo();

    if (saldo > 0) {
      return 'Parabéns, você está guardando dinheiro neste período.';
    }

    if (saldo === 0) {
      return 'Você ficou no equilíbrio. Agora é só tentar guardar um pouco mais.';
    }

    return 'Atenção: suas saídas passaram das entradas. Vale revisar os gastos.';
  });
  readonly periodoAtual = computed(() => {
    if (this.visaoSelecionada() === 'ano') {
      return `Ano de ${this.hoje.getFullYear()}`;
    }

    if (this.visaoSelecionada() === 'geral') {
      return 'Todos os registros';
    }

    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(this.hoje);
  });

  ngOnInit(): void {
    forkJoin({
      entradas: this.entradasService.listar(),
      saidas: this.saidasService.listar(),
    }).subscribe({
      next: ({ entradas, saidas }) => {
        this.entradas.set(entradas);
        this.saidas.set(saidas);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar o resumo. Tente novamente em instantes.');
        this.loading.set(false);
      },
    });
  }

  selecionarVisao(visao: VisaoDashboard): void {
    this.visaoSelecionada.set(visao);
  }
}
