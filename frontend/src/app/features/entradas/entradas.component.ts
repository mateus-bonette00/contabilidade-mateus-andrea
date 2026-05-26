import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Entrada } from '../../models/entrada.model';
import { EntradasService } from '../../services/entradas.service';
import {
  mesAnoAtual,
  mesAnteriorMesAno,
  parseDataReferencia,
  podeAvancarMes,
  proximoMesAno,
} from '../../utils/data-local';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './entradas.component.html',
  styleUrl: './entradas.component.scss',
})
export class EntradasComponent implements OnInit {
  private readonly service = inject(EntradasService);

  readonly carregando = signal(true);
  readonly entradas = signal<Entrada[]>([]);
  readonly mesAtual = signal(mesAnoAtual());

  readonly podeIrMesSeguinte = computed(() => {
    const { mes, ano } = this.mesAtual();
    return podeAvancarMes(mes, ano);
  });

  readonly mesLabel = computed(() => {
    const { mes, ano } = this.mesAtual();
    return `${MESES[mes]} ${ano}`;
  });

  readonly entradasDoMes = computed(() => {
    const { mes, ano } = this.mesAtual();
    return this.entradas()
      .filter(e => {
        const d = parseDataReferencia(e.data_referencia);
        return d.getMonth() === mes && d.getFullYear() === ano;
      })
      .sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
  });

  readonly total = computed(() =>
    this.entradasDoMes().reduce((acc, e) => acc + Number(e.valor), 0)
  );

  ngOnInit(): void {
    this.service.listar().subscribe({
      next: (entradas) => { this.entradas.set(entradas); this.carregando.set(false); },
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

  formatarValor(valor: number | string): string {
    return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  formatarData(data: string): string {
    return parseDataReferencia(data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  trackById(_: number, e: Entrada): string { return e.id; }
}
