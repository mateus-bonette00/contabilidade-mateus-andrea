import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SecureCurrencyPipe } from '../../pipes/secure-currency.pipe';
import { SaidaRegistro, SaidasService } from '../../services/saidas.service';

function hojeInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function somarSaidas(registros: SaidaRegistro[]): number {
  const centavos = registros.reduce((total, registro) => total + Math.round(Number(registro.valor) * 100), 0);
  return centavos / 100;
}

@Component({
  selector: 'app-saidas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SecureCurrencyPipe, DatePipe],
  templateUrl: './saidas.component.html',
  styleUrl: './saidas.component.scss',
})
export class SaidasComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly saidasService = inject(SaidasService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly saidas = signal<SaidaRegistro[]>([]);
  readonly totalSaidas = computed(() => somarSaidas(this.saidas()));

  readonly form = this.formBuilder.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    data_referencia: [hojeInput(), Validators.required],
  });

  ngOnInit(): void {
    this.carregarSaidas();
  }

  cadastrar(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Preencha descrição, valor e data para cadastrar a saída.');
      return;
    }

    this.saving.set(true);
    const payload = {
      ...this.form.getRawValue(),
      descricao: this.form.controls.descricao.value.trim(),
      valor: Number(this.form.controls.valor.value),
    };

    this.saidasService.cadastrar(payload).subscribe({
      next: (saida) => {
        this.saidas.update((saidas) => [saida, ...saidas]);
        this.form.reset({ descricao: '', valor: 0, data_referencia: hojeInput() });
        this.successMessage.set('Saída cadastrada com sucesso.');
        this.saving.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível cadastrar a saída. Tente novamente.');
        this.saving.set(false);
      },
    });
  }

  private carregarSaidas(): void {
    this.loading.set(true);

    this.saidasService.listar().subscribe({
      next: (saidas) => {
        this.saidas.set(saidas);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar suas saídas.');
        this.loading.set(false);
      },
    });
  }
}
