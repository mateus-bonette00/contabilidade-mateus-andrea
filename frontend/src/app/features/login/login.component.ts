import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChildren, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly modo = signal<'login' | 'cadastro'>('login');
  readonly digits = signal(['', '', '', '']);
  readonly errorMessage = signal('');
  readonly loading = signal(false);

  readonly nomeCadastro = signal('');
  readonly sobrenomeCadastro = signal('');
  readonly emailCadastro = signal('');
  readonly pinCadastro = signal('');
  readonly pinConfirmacaoCadastro = signal('');

  readonly titulo = computed(() => this.modo() === 'login' ? 'Digite seu PIN' : 'Criar cadastro');
  readonly subtitulo = computed(() =>
    this.modo() === 'login'
      ? 'Acesse sua conta com os 4 números cadastrados.'
      : 'Preencha nome, sobrenome, e-mail e PIN para criar sua conta.'
  );

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngAfterViewInit(): void {
    this.focarPrimeiroCampoLogin();
  }

  alternarModo(modo: 'login' | 'cadastro'): void {
    this.modo.set(modo);
    this.errorMessage.set('');

    if (modo === 'login') {
      this.focarPrimeiroCampoLogin();
    }
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1);

    const nextDigits = [...this.digits()];
    nextDigits[index] = value;
    this.digits.set(nextDigits);
    input.value = value;
    this.errorMessage.set('');

    if (value && index < 3) {
      this.pinInputs.get(index + 1)?.nativeElement.focus();
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Backspace') {
      return;
    }

    const currentDigits = [...this.digits()];

    if (currentDigits[index]) {
      currentDigits[index] = '';
      this.digits.set(currentDigits);
      return;
    }

    if (index > 0) {
      currentDigits[index - 1] = '';
      this.digits.set(currentDigits);
      this.pinInputs.get(index - 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') ?? '';
    const pastedDigits = pastedText.replace(/\D/g, '').slice(0, 4);

    if (!pastedDigits) {
      return;
    }

    const nextDigits = ['', '', '', ''];
    for (let index = 0; index < pastedDigits.length; index += 1) {
      nextDigits[index] = pastedDigits[index];
    }

    this.digits.set(nextDigits);
    this.errorMessage.set('');

    setTimeout(() => {
      this.pinInputs.forEach((pinInput, index) => {
        pinInput.nativeElement.value = nextDigits[index];
      });

      const nextFocusIndex = Math.min(pastedDigits.length, 3);
      this.pinInputs.get(nextFocusIndex)?.nativeElement.focus();
    });
  }

  entrar(): void {
    const pin = this.digits().join('');

    if (pin.length !== 4) {
      this.errorMessage.set('Digite os 4 números do PIN');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.login(pin).subscribe({
      next: () => {
        this.loading.set(false);
        this.resetPinFields();
        this.router.navigate(['/dashboard']);
      },
      error: (erro) => {
        this.loading.set(false);
        this.errorMessage.set(erro?.error?.message ?? 'PIN incorreto. Tente novamente.');
        this.digits.set(['', '', '', '']);
        this.focarPrimeiroCampoLogin();
      },
    });
  }

  cadastrar(): void {
    const nome = this.nomeCadastro().trim();
    const sobrenome = this.sobrenomeCadastro().trim();
    const email = this.emailCadastro().trim().toLowerCase();
    const pin = this.pinCadastro().trim();
    const pinConfirmacao = this.pinConfirmacaoCadastro().trim();

    if (!nome || !sobrenome || !email || !pin || !pinConfirmacao) {
      this.errorMessage.set('Preencha todos os campos para cadastrar.');
      return;
    }

    if (!/^\d{4}$/.test(pin) || !/^\d{4}$/.test(pinConfirmacao)) {
      this.errorMessage.set('PIN e confirmação devem ter 4 números.');
      return;
    }

    if (pin !== pinConfirmacao) {
      this.errorMessage.set('A confirmação do PIN não confere.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.auth.cadastrar({ nome, sobrenome, email, pin, pinConfirmacao }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (erro) => {
        this.loading.set(false);
        this.errorMessage.set(erro?.error?.message ?? 'Não foi possível criar seu cadastro.');
      },
    });
  }

  atualizarPinCadastro(valor: string): void {
    this.pinCadastro.set(this.extrairPin(valor));
  }

  atualizarPinConfirmacaoCadastro(valor: string): void {
    this.pinConfirmacaoCadastro.set(this.extrairPin(valor));
  }

  private resetPinFields(): void {
    this.digits.set(['', '', '', '']);
    this.errorMessage.set('');
  }

  private focarPrimeiroCampoLogin(): void {
    setTimeout(() => this.pinInputs?.first?.nativeElement.focus());
  }

  private extrairPin(valor: string): string {
    return valor.replace(/\D/g, '').slice(0, 4);
  }
}
