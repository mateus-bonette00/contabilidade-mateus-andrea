import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EntradasService } from '../../services/entradas.service';
import { SaidasService } from '../../services/saidas.service';
import { dataLocalHoje } from '../../utils/data-local';

@Component({
  selector: 'app-lancamento',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './lancamento.component.html',
  styleUrl: './lancamento.component.scss',
})
export class LancamentoComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly entradasService = inject(EntradasService);
  private readonly saidasService = inject(SaidasService);

  readonly tipo = signal<'entrada' | 'saida'>('entrada');
  readonly salvando = signal(false);
  readonly erro = signal('');

  descricao = '';
  valor = '';
  data = dataLocalHoje();

  ngOnInit(): void {
    const tipo = this.route.snapshot.paramMap.get('tipo');
    this.tipo.set(tipo === 'saida' ? 'saida' : 'entrada');
  }

  get titulo(): string {
    return this.tipo() === 'entrada' ? 'Nova Entrada' : 'Nova Saída';
  }

  get voltarUrl(): string {
    return this.tipo() === 'entrada' ? '/entradas' : '/saidas';
  }

  salvar(): void {
    const descricao = this.descricao.trim();
    const valorNum = parseFloat(this.valor.replace(',', '.'));

    if (!descricao) {
      this.erro.set('Informe uma descrição.');
      return;
    }

    if (!valorNum || valorNum <= 0 || !isFinite(valorNum)) {
      this.erro.set('Informe um valor válido maior que zero.');
      return;
    }

    if (!this.data) {
      this.erro.set('Informe uma data.');
      return;
    }

    this.salvando.set(true);
    this.erro.set('');

    const payload = { descricao, valor: valorNum, data_referencia: this.data };

    const obs = this.tipo() === 'entrada'
      ? this.entradasService.criar(payload)
      : this.saidasService.criar(payload);

    obs.subscribe({
      next: () => this.router.navigate([this.voltarUrl]),
      error: () => {
        this.salvando.set(false);
        this.erro.set('Erro ao salvar. Verifique os dados e tente novamente.');
      },
    });
  }
}
