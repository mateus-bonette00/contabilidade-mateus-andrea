import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren, signal } from '@angular/core';
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
export class LoginComponent implements AfterViewInit {
  @ViewChildren('pinInput') pinInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly digits = signal(['', '', '', '']);
  readonly errorMessage = signal('');
  readonly loading = signal(false);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
  ) {}

  ngAfterViewInit(): void {
    setTimeout(() => this.pinInputs.first?.nativeElement.focus());
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
        this.router.navigateByUrl('/dashboard');
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('PIN incorreto. Tente novamente.');
        this.digits.set(['', '', '', '']);
        setTimeout(() => this.pinInputs.first?.nativeElement.focus());
      },
    });
  }
}
