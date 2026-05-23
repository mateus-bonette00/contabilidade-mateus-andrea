import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { ProfileService } from './services/profile.service';
import { UserSettingsService } from './services/user-settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly userSettings = inject(UserSettingsService);
  readonly profile = inject(ProfileService);

  readonly showShell = computed(() => this.auth.isLoggedIn());
  readonly sidebarCollapsed = signal(false);
  readonly isMobile = signal(false);

  readonly usuarioNome = computed(() => this.auth.usuario()?.nome ?? '');
  readonly usuarioId = computed(() => this.auth.usuario()?.id);

  private shellPreferencesApplied = false;

  private readonly onResize = () => {
    this.isMobile.set(window.innerWidth <= 900);
  };

  constructor() {
    this.onResize();
    if (this.isMobile()) {
      this.sidebarCollapsed.set(true);
    }
    window.addEventListener('resize', this.onResize);

    effect(() => {
      if (!this.showShell()) {
        this.shellPreferencesApplied = false;
        return;
      }

      if (this.shellPreferencesApplied) {
        return;
      }

      this.shellPreferencesApplied = true;

      if (this.isMobile() || this.userSettings.settings().startWithCollapsedSidebar) {
        this.sidebarCollapsed.set(true);
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  expandSidebar(): void {
    this.sidebarCollapsed.set(false);
  }

  collapseSidebar(): void {
    this.sidebarCollapsed.set(true);
  }

  onNavClick(): void {
    if (this.isMobile()) {
      this.collapseSidebar();
    }
  }

  sair(): void {
    if (this.userSettings.settings().confirmLogout) {
      const confirmar = window.confirm('Deseja sair da sua conta neste aparelho?');
      if (!confirmar) {
        return;
      }
    }

    this.collapseSidebar();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
