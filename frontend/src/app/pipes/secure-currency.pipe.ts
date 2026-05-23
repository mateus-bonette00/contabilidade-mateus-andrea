import { inject, Pipe, PipeTransform } from '@angular/core';
import { UserSettingsService } from '../services/user-settings.service';

@Pipe({
  name: 'secureCurrency',
  standalone: true,
  pure: false,
})
export class SecureCurrencyPipe implements PipeTransform {
  private readonly userSettings = inject(UserSettingsService);

  transform(value: number | string | null | undefined): string {
    const amount = Number(value ?? 0);

    if (this.userSettings.settings().hideValues) {
      return 'R$ ••••';
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}
