import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type DashboardView = 'mes' | 'ano' | 'geral';

export interface UserSettings {
  dashboardDefaultView: DashboardView;
  hideValues: boolean;
  startWithCollapsedSidebar: boolean;
  confirmLogout: boolean;
  showRecentMovements: boolean;
}

const STORAGE_KEY = 'fm_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  dashboardDefaultView: 'mes',
  hideValues: false,
  startWithCollapsedSidebar: false,
  confirmLogout: true,
  showRecentMovements: true,
};

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly auth = inject(AuthService);
  private readonly allSettings = signal<Record<string, UserSettings>>(this.readAll());

  readonly settings = computed(() => {
    const usuarioId = this.auth.usuario()?.id;

    if (!usuarioId) {
      return DEFAULT_SETTINGS;
    }

    return { ...DEFAULT_SETTINGS, ...this.allSettings()[usuarioId] };
  });

  update(partial: Partial<UserSettings>): void {
    const usuarioId = this.auth.usuario()?.id;

    if (!usuarioId) {
      return;
    }

    const next = {
      ...this.allSettings(),
      [usuarioId]: {
        ...this.settings(),
        ...partial,
      },
    };

    this.allSettings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  reset(): void {
    const usuarioId = this.auth.usuario()?.id;

    if (!usuarioId) {
      return;
    }

    const next = { ...this.allSettings() };
    delete next[usuarioId];
    this.allSettings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  private readAll(): Record<string, UserSettings> {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, UserSettings>;
    } catch {
      return {};
    }
  }
}
