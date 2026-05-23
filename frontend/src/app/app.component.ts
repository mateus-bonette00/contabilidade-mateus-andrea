import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showShell = computed(() => this.auth.isLoggedIn());

  readonly usuarioNome = computed(() => this.auth.usuario()?.nome ?? '');

  sair(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
