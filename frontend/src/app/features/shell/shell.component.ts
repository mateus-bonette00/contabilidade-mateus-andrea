import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly sidebarCollapsed = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.sidebarCollapsed.set(localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true');
  }

  nomeCompleto(): string {
    const usuario = this.auth.usuario();
    if (!usuario) {
      return 'Usuário';
    }

    const nome = String(usuario.nome ?? '').trim();
    const sobrenome = String((usuario as { sobrenome?: string }).sobrenome ?? '').trim();
    const completo = `${nome} ${sobrenome}`.trim();

    return completo || nome || 'Usuário';
  }

  inicialUsuario(): string {
    const usuario = this.auth.usuario();
    const base = usuario?.nome?.trim() || 'U';
    return base.charAt(0).toUpperCase();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(this.sidebarCollapsed()));
    }
  }

  sair(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
