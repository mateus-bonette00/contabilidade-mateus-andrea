import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Saida } from '../../models/saida.model';
import { SaidasService } from '../../services/saidas.service';
import {
  mesAnoAtual,
  mesAnteriorMesAno,
  parseDataReferencia,
  podeAvancarMes,
  proximoMesAno,
} from '../../utils/data-local';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

@Component({
  selector: 'app-saidas',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './saidas.component.html',
  styleUrl: './saidas.component.scss',
})
export class SaidasComponent implements OnInit {
  private readonly service = inject(SaidasService);

  readonly carregando = signal(true);
  readonly saidas = signal<Saida[]>([]);
  readonly mesAtual = signal(mesAnoAtual());

  readonly podeIrMesSeguinte = computed(() => {
    const { mes, ano } = this.mesAtual();
    return podeAvancarMes(mes, ano);
  });

  readonly mesLabel = computed(() => {
    const { mes, ano } = this.mesAtual();
    return `${MESES[mes]} ${ano}`;
  });

  readonly saidasDoMes = computed(() => {
    const { mes, ano } = this.mesAtual();
    return this.saidas()
      .filter(s => {
        const d = parseDataReferencia(s.data_referencia);
        return d.getMonth() === mes && d.getFullYear() === ano;
      })
      .sort((a, b) => b.data_referencia.localeCompare(a.data_referencia));
  });

  readonly total = computed(() =>
    this.saidasDoMes().reduce((acc, s) => acc + Number(s.valor), 0)
  );

  ngOnInit(): void {
    this.service.listar().subscribe({
      next: (saidas) => { this.saidas.set(saidas); this.carregando.set(false); },
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

  trackById(_: number, s: Saida): string { return s.id; }
}
