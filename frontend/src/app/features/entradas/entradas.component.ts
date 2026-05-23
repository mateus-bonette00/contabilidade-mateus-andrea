import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SecureCurrencyPipe } from '../../pipes/secure-currency.pipe';
import { EntradaRegistro, EntradasService } from '../../services/entradas.service';

function hojeInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function somarEntradas(registros: EntradaRegistro[]): number {
  const centavos = registros.reduce((total, registro) => total + Math.round(Number(registro.valor) * 100), 0);
  return centavos / 100;
}

@Component({
  selector: 'app-entradas',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, SecureCurrencyPipe, DatePipe],
  templateUrl: './entradas.component.html',
  styleUrl: './entradas.component.scss',
})
export class EntradasComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly entradasService = inject(EntradasService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly entradas = signal<EntradaRegistro[]>([]);
  readonly totalEntradas = computed(() => somarEntradas(this.entradas()));

  readonly form = this.formBuilder.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    valor: [0, [Validators.required, Validators.min(0.01)]],
    data_referencia: [hojeInput(), Validators.required],
  });

  ngOnInit(): void {
    this.carregarEntradas();
  }

  cadastrar(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Preencha descrição, valor e data para cadastrar a entrada.');
      return;
    }

    this.saving.set(true);
    const payload = {
      ...this.form.getRawValue(),
      descricao: this.form.controls.descricao.value.trim(),
      valor: Number(this.form.controls.valor.value),
    };

    this.entradasService.cadastrar(payload).subscribe({
      next: (entrada) => {
        this.entradas.update((entradas) => [entrada, ...entradas]);
        this.form.reset({ descricao: '', valor: 0, data_referencia: hojeInput() });
        this.successMessage.set('Entrada cadastrada com sucesso.');
        this.saving.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível cadastrar a entrada. Tente novamente.');
        this.saving.set(false);
      },
    });
  }

  private carregarEntradas(): void {
    this.loading.set(true);

    this.entradasService.listar().subscribe({
      next: (entradas) => {
        this.entradas.set(entradas);
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Não foi possível carregar suas entradas.');
        this.loading.set(false);
      },
    });
  }
}
