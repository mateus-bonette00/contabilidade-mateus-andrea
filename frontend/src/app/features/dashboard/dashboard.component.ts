import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Entrada } from '../../models/entrada.model';
import { Saida } from '../../models/saida.model';
import { AuthService } from '../../services/auth.service';
import { EntradasService } from '../../services/entradas.service';
import { SaidasService } from '../../services/saidas.service';
import {
  MesAno,
  dataLocalHoje,
  mesAnoAtual,
  mesAnoDaData,
  mesAnteriorMesAno,
  parseDataReferencia,
  podeAvancarMes,
  proximoMesAno,
} from '../../utils/data-local';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
type TipoFiltro = 'todos' | 'entrada' | 'saida';
type PeriodoTabela = 'mes' | 'dia' | 'ano';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  tipo: 'entrada' | 'saida';
  grupo: string;
}

interface DadosMes {
  label: string;
  entrada: number;
  saida: number;
  saldo: number;
  mes: number;
  ano: number;
}

interface GrupoGasto {
  label: string;
  valor: number;
  percentual: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly entradasService = inject(EntradasService);
  private readonly saidasService = inject(SaidasService);

  readonly carregando = signal(true);
  readonly entradas = signal<Entrada[]>([]);
  readonly saidas = signal<Saida[]>([]);
  readonly mesAtual = signal<MesAno>(mesAnoAtual());
  readonly dataSelecionada = signal(dataLocalHoje());
  readonly tipoFiltro = signal<TipoFiltro>('todos');
  readonly periodoTabela = signal<PeriodoTabela>('mes');
  readonly termoBusca = signal('');

  readonly mesesOpcoes = MESES.map((label, valor) => ({ label, valor }));

  readonly mesLabel = computed(() => {
    const { mes, ano } = this.mesAtual();
    return `${MESES[mes]} ${ano}`;
  });

  readonly podeIrMesSeguinte = computed(() => {
    const { mes, ano } = this.mesAtual();
    return podeAvancarMes(mes, ano);
  });

  readonly anosDisponiveis = computed(() => {
    const anos = new Set<number>([mesAnoAtual().ano]);
    const incluirAno = (data: string) => anos.add(mesAnoDaData(data).ano);

    this.entradas().forEach(e => incluirAno(e.data_referencia));
    this.saidas().forEach(s => incluirAno(s.data_referencia));

    return [...anos].sort((a, b) => b - a);
  });

  readonly entradasDoMes = computed(() => {
    const { mes, ano } = this.mesAtual();
    return this.entradas().filter(e => {
      const d = parseDataReferencia(e.data_referencia);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
  });

  readonly saidasDoMes = computed(() => {
    const { mes, ano } = this.mesAtual();
    return this.saidas().filter(s => {
      const d = parseDataReferencia(s.data_referencia);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });
  });

  readonly totalEntradasCentavos = computed(() => this.somarCentavos(this.entradasDoMes()));
  readonly totalSaidasCentavos = computed(() => this.somarCentavos(this.saidasDoMes()));
  readonly saldoCentavos = computed(() => this.totalEntradasCentavos() - this.totalSaidasCentavos());

  readonly totalEntradas = computed(() => this.centavosParaValor(this.totalEntradasCentavos()));
  readonly totalSaidas = computed(() => this.centavosParaValor(this.totalSaidasCentavos()));
  readonly saldo = computed(() => this.centavosParaValor(this.saldoCentavos()));

  readonly economiaDoMes = computed(() => this.centavosParaValor(Math.max(this.saldoCentavos(), 0)));

  readonly taxaEconomia = computed(() => {
    const entradas = this.totalEntradasCentavos();
    return entradas > 0 ? Math.round((this.saldoCentavos() / entradas) * 100) : 0;
  });

  readonly transacoesDoPeriodo = computed<Transacao[]>(() => {
    const modo = this.periodoTabela();
    const { mes, ano } = this.mesAtual();
    const dataEscolhida = this.dataSelecionada();

    const pertenceAoPeriodo = (dataReferencia: string): boolean => {
      const data = parseDataReferencia(dataReferencia);

      if (modo === 'dia') {
        return this.normalizarDataISO(dataReferencia) === dataEscolhida;
      }

      if (modo === 'ano') {
        return data.getFullYear() === ano;
      }

      return data.getMonth() === mes && data.getFullYear() === ano;
    };

    const entradasPeriodo: Transacao[] = this.entradas()
      .filter(entrada => pertenceAoPeriodo(entrada.data_referencia))
      .map(entrada => ({
        id: `entrada-${entrada.id}`,
        descricao: entrada.descricao,
        valor: this.centavosParaValor(Math.abs(this.valorEmCentavos(entrada.valor))),
        data: entrada.data_referencia,
        tipo: 'entrada' as const,
        grupo: 'Entrada',
      }));

    const saidasPeriodo: Transacao[] = this.saidas()
      .filter(saida => pertenceAoPeriodo(saida.data_referencia))
      .map(saida => ({
        id: `saida-${saida.id}`,
        descricao: saida.descricao,
        valor: this.centavosParaValor(-Math.abs(this.valorEmCentavos(saida.valor))),
        data: saida.data_referencia,
        tipo: 'saida' as const,
        grupo: 'Saída',
      }));

    return [...entradasPeriodo, ...saidasPeriodo].sort((a, b) => b.data.localeCompare(a.data));
  });

  readonly transacoesTabela = computed<Transacao[]>(() => {
    const tipo = this.tipoFiltro();
    const termo = this.normalizarTexto(this.termoBusca());

    return this.transacoesDoPeriodo()
      .filter(t => tipo === 'todos' || t.tipo === tipo)
      .filter(t => !termo || this.normalizarTexto(`${t.descricao} ${t.grupo}`).includes(termo));
  });

  readonly totalEntradasPeriodoCentavos = computed(() =>
    this.transacoesDoPeriodo()
      .filter(transacao => transacao.valor > 0)
      .reduce((acc, transacao) => acc + this.valorEmCentavos(transacao.valor), 0)
  );

  readonly totalSaidasPeriodoCentavos = computed(() =>
    this.transacoesDoPeriodo()
      .filter(transacao => transacao.valor < 0)
      .reduce((acc, transacao) => acc + Math.abs(this.valorEmCentavos(transacao.valor)), 0)
  );

  readonly totalEntradasPeriodo = computed(() =>
    this.centavosParaValor(this.totalEntradasPeriodoCentavos())
  );

  readonly totalSaidasPeriodo = computed(() =>
    this.centavosParaValor(this.totalSaidasPeriodoCentavos())
  );

  readonly dadosGrafico = computed<DadosMes[]>(() => {
    const { mes, ano } = this.mesAtual();
    const meses: DadosMes[] = [];

    for (let i = 5; i >= 0; i--) {
      let m = mes - i;
      let a = ano;
      if (m < 0) { m += 12; a -= 1; }

      const entradaCentavos = this.totalCentavosNoPeriodo(this.entradas(), m, a);
      const saidaCentavos = this.totalCentavosNoPeriodo(this.saidas(), m, a);

      meses.push({
        label: MESES[m].slice(0, 3),
        entrada: this.centavosParaValor(entradaCentavos),
        saida: this.centavosParaValor(saidaCentavos),
        saldo: this.centavosParaValor(entradaCentavos - saidaCentavos),
        mes: m,
        ano: a,
      });
    }

    return meses;
  });

  readonly maxGrafico = computed(() => {
    const dados = this.dadosGrafico();
    return Math.max(...dados.map(d => Math.max(d.entrada, d.saida)), 1);
  });

  readonly dadosAno = computed<DadosMes[]>(() => {
    const { ano } = this.mesAtual();

    return MESES.map((nome, mes) => {
      const entradaCentavos = this.totalCentavosNoPeriodo(this.entradas(), mes, ano);
      const saidaCentavos = this.totalCentavosNoPeriodo(this.saidas(), mes, ano);

      return {
        label: nome.slice(0, 3),
        entrada: this.centavosParaValor(entradaCentavos),
        saida: this.centavosParaValor(saidaCentavos),
        saldo: this.centavosParaValor(entradaCentavos - saidaCentavos),
        mes,
        ano,
      };
    });
  });

  readonly totalEntradasAnoCentavos = computed(() =>
    this.dadosAno().reduce((acc, mes) => acc + this.valorEmCentavos(mes.entrada), 0)
  );

  readonly totalSaidasAnoCentavos = computed(() =>
    this.dadosAno().reduce((acc, mes) => acc + this.valorEmCentavos(mes.saida), 0)
  );

  readonly saldoAnualCentavos = computed(() => this.totalEntradasAnoCentavos() - this.totalSaidasAnoCentavos());
  readonly totalEntradasAno = computed(() => this.centavosParaValor(this.totalEntradasAnoCentavos()));
  readonly totalSaidasAno = computed(() => this.centavosParaValor(this.totalSaidasAnoCentavos()));
  readonly saldoAnual = computed(() => this.centavosParaValor(this.saldoAnualCentavos()));

  readonly maxSaldoAnualAbs = computed(() =>
    Math.max(...this.dadosAno().map(d => Math.abs(d.saldo)), 1)
  );

  readonly melhorMesAno = computed(() =>
    [...this.dadosAno()].sort((a, b) => b.saldo - a.saldo)[0]
  );

  readonly gruposGasto = computed<GrupoGasto[]>(() => {
    const total = this.totalSaidasCentavos();
    const grupos = new Map<string, number>();

    this.saidasDoMes().forEach(saida => {
      const grupo = this.classificarGrupo(saida.descricao);
      grupos.set(grupo, (grupos.get(grupo) ?? 0) + this.valorEmCentavos(saida.valor));
    });

    return [...grupos.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, centavos]) => ({
        label,
        valor: this.centavosParaValor(centavos),
        percentual: total > 0 ? Math.round((centavos / total) * 100) : 0,
      }));
  });

  readonly maiorGasto = computed(() =>
    [...this.saidasDoMes()].sort((a, b) => this.valorEmCentavos(b.valor) - this.valorEmCentavos(a.valor))[0]
  );

  readonly saldoMesAnterior = computed(() => {
    const { mes, ano } = this.mesAtual();
    const mesAnterior = mes === 0 ? 11 : mes - 1;
    const anoAnterior = mes === 0 ? ano - 1 : ano;
    const entradas = this.totalCentavosNoPeriodo(this.entradas(), mesAnterior, anoAnterior);
    const saidas = this.totalCentavosNoPeriodo(this.saidas(), mesAnterior, anoAnterior);

    return this.centavosParaValor(entradas - saidas);
  });

  readonly variacaoVsMesAnterior = computed(() => this.saldo() - this.saldoMesAnterior());

  readonly resumoPrincipal = computed(() => {
    if (this.saldo() > 0) {
      return `Vocês estão positivos em ${this.mesLabel()} e guardaram ${this.formatarValor(this.economiaDoMes())}.`;
    }

    if (this.saldo() < 0) {
      return `As saídas passaram das entradas em ${this.mesLabel()}. Vale olhar os maiores gastos.`;
    }

    return `Entradas e saídas estão empatadas em ${this.mesLabel()}.`;
  });

  readonly mensagemEconomia = computed(() => {
    if (this.saldo() > 0) {
      return `${this.taxaEconomia()}% das entradas ficou guardado.`;
    }

    if (this.saldo() < 0) {
      return `Faltaram ${this.formatarValor(Math.abs(this.saldo()))} para fechar positivo.`;
    }

    return 'Este mês fechou exatamente no zero.';
  });

  ngOnInit(): void {
    forkJoin({ entradas: this.entradasService.listar(), saidas: this.saidasService.listar() }).subscribe({
      next: ({ entradas, saidas }) => {
        this.entradas.set(entradas);
        this.saidas.set(saidas);
        this.carregando.set(false);
      },
      error: () => this.carregando.set(false),
    });
  }

  mesAnterior(): void {
    const { mes, ano } = this.mesAtual();
    this.mesAtual.set(mesAnteriorMesAno(mes, ano));
  }

  mesSeguinte(): void {
    if (!this.podeIrMesSeguinte()) {
      return;
    }

    const { mes, ano } = this.mesAtual();
    this.mesAtual.set(proximoMesAno(mes, ano));
  }

  selecionarMes(valor: string): void {
    const mes = Number(valor);
    const { ano } = this.mesAtual();
    this.mesAtual.set({ mes, ano });
  }

  selecionarAno(valor: string): void {
    const ano = Number(valor);
    const { mes } = this.mesAtual();
    this.mesAtual.set({ mes, ano });
  }

  selecionarTipo(tipo: TipoFiltro): void {
    this.tipoFiltro.set(tipo);
  }

  selecionarPeriodoTabela(periodo: PeriodoTabela): void {
    this.periodoTabela.set(periodo);
  }

  selecionarData(data: string): void {
    if (!data) {
      return;
    }

    this.dataSelecionada.set(data);
    this.periodoTabela.set('dia');
  }

  formatarValor(valor: number | string): string {
    const numero = typeof valor === 'number' ? valor : this.centavosParaValor(this.valorEmCentavos(valor));
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarData(data: string): string {
    return parseDataReferencia(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  formatarDataCompleta(data: string): string {
    return parseDataReferencia(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  barHeight(valor: number): number {
    return (valor / this.maxGrafico()) * 120;
  }

  barHeightSaldo(valor: number): number {
    return Math.max(4, (Math.abs(valor) / this.maxSaldoAnualAbs()) * 52);
  }

  barWidthGrupo(percentual: number): number {
    return Math.max(percentual, 6);
  }

  abs(valor: number): number {
    return Math.abs(valor);
  }

  trackById(_: number, item: { id: string }): string {
    return item.id;
  }

  trackByLabel(_: number, dado: DadosMes): string {
    return `${dado.label}-${dado.ano}`;
  }

  trackByGrupo(_: number, grupo: GrupoGasto): string {
    return grupo.label;
  }

  private somarCentavos(items: Array<{ valor: string | number }>): number {
    return items.reduce((acc, item) => acc + this.valorEmCentavos(item.valor), 0);
  }

  private totalCentavosNoPeriodo(items: Array<{ valor: string | number; data_referencia: string }>, mes: number, ano: number): number {
    return items
      .filter(item => {
        const data = parseDataReferencia(item.data_referencia);
        return data.getMonth() === mes && data.getFullYear() === ano;
      })
      .reduce((acc, item) => acc + this.valorEmCentavos(item.valor), 0);
  }

  private valorEmCentavos(valor: string | number): number {
    if (typeof valor === 'number') {
      return Math.round(valor * 100);
    }

    const limpo = valor.trim().replace(/\s/g, '');
    const formatoBr = limpo.includes(',') && limpo.lastIndexOf(',') > limpo.lastIndexOf('.');
    const normalizado = formatoBr ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
    const numero = Number(normalizado);

    return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
  }

  private centavosParaValor(centavos: number): number {
    return centavos / 100;
  }

  private normalizarTexto(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private normalizarDataISO(data: string): string {
    const dataFormatada = parseDataReferencia(data);
    const ano = dataFormatada.getFullYear();
    const mes = String(dataFormatada.getMonth() + 1).padStart(2, '0');
    const dia = String(dataFormatada.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private classificarGrupo(descricao: string): string {
    const texto = this.normalizarTexto(descricao);
    const grupos = [
      { label: 'Mercado e comida', termos: ['mercado', 'super', 'padaria', 'acougue', 'horti', 'restaurante', 'ifood', 'lanche', 'comida'] },
      { label: 'Casa', termos: ['aluguel', 'condominio', 'luz', 'energia', 'agua', 'internet', 'gas', 'casa'] },
      { label: 'Transporte', termos: ['uber', '99', 'combustivel', 'gasolina', 'onibus', 'metro', 'estacionamento', 'transporte'] },
      { label: 'Saude', termos: ['farmacia', 'medico', 'consulta', 'exame', 'dentista', 'saude'] },
      { label: 'Lazer', termos: ['cinema', 'viagem', 'show', 'shopping', 'lazer', 'presente'] },
      { label: 'Contas e servicos', termos: ['cartao', 'boleto', 'assinatura', 'netflix', 'spotify', 'servico'] },
    ];

    return grupos.find(grupo => grupo.termos.some(termo => texto.includes(termo)))?.label ?? 'Outros gastos';
  }
}
