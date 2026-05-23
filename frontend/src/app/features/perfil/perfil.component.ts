import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { DashboardView, UserSettings, UserSettingsService } from '../../services/user-settings.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly profile = inject(ProfileService);
  readonly userSettings = inject(UserSettingsService);

  readonly usuario = this.auth.usuario;
  readonly usuarioId = computed(() => this.usuario()?.id);
  readonly usuarioNome = computed(() => this.usuario()?.nome ?? 'Usuário');
  readonly photo = computed(() => this.profile.photoFor(this.usuarioId()));
  readonly initials = computed(() => this.profile.initials(this.usuarioNome()));
  readonly settings = this.userSettings.settings;

  readonly modalNomeAberto = signal(false);
  readonly modalPinAberto = signal(false);
  readonly salvando = signal(false);
  readonly formError = signal('');
  readonly formSuccess = signal('');

  readonly nomeNovo = signal('');
  readonly pinAtualNome = signal('');
  readonly pinAtualPin = signal('');
  readonly pinNovo = signal('');
  readonly pinConfirmacao = signal('');

  salvarFoto(event: Event): void {
    const usuarioId = this.usuarioId();
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!usuarioId || !file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.profile.savePhoto(usuarioId, String(reader.result));
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removerFoto(): void {
    const usuarioId = this.usuarioId();
    if (!usuarioId) {
      return;
    }
    this.profile.savePhoto(usuarioId, '');
  }

  abrirModalNome(): void {
    this.limparFormulario();
    this.nomeNovo.set(this.usuarioNome());
    this.modalNomeAberto.set(true);
  }

  abrirModalPin(): void {
    this.limparFormulario();
    this.modalPinAberto.set(true);
  }

  fecharModais(): void {
    this.modalNomeAberto.set(false);
    this.modalPinAberto.set(false);
    this.limparFormulario();
  }

  salvarNome(): void {
    const nome = this.nomeNovo().trim();
    const pinAtual = this.pinAtualNome().trim();

    if (nome.length < 2) {
      this.formError.set('Digite um nome com pelo menos 2 letras.');
      return;
    }

    if (!/^\d{4}$/.test(pinAtual)) {
      this.formError.set('Digite seu PIN atual com 4 números.');
      return;
    }

    this.salvando.set(true);
    this.formError.set('');

    this.auth.atualizarNome(nome, pinAtual).subscribe({
      next: () => {
        this.salvando.set(false);
        this.formSuccess.set('Nome atualizado com sucesso.');
        this.fecharModais();
      },
      error: (error) => {
        this.salvando.set(false);
        this.formError.set(error?.error?.message ?? 'Não foi possível atualizar o nome.');
      },
    });
  }

  salvarPin(): void {
    const pinAtual = this.pinAtualPin().trim();
    const pinNovo = this.pinNovo().trim();
    const pinConfirmacao = this.pinConfirmacao().trim();

    if (!/^\d{4}$/.test(pinAtual) || !/^\d{4}$/.test(pinNovo) || !/^\d{4}$/.test(pinConfirmacao)) {
      this.formError.set('Todos os PINs devem ter 4 números.');
      return;
    }

    if (pinNovo !== pinConfirmacao) {
      this.formError.set('A confirmação do PIN não confere.');
      return;
    }

    this.salvando.set(true);
    this.formError.set('');

    this.auth.atualizarPin(pinAtual, pinNovo, pinConfirmacao).subscribe({
      next: (response) => {
        this.salvando.set(false);
        this.formSuccess.set(response.message ?? 'PIN atualizado com sucesso.');
        this.fecharModais();
      },
      error: (error) => {
        this.salvando.set(false);
        this.formError.set(error?.error?.message ?? 'Não foi possível atualizar o PIN.');
      },
    });
  }

  alterarVisaoPadrao(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as DashboardView;
    this.userSettings.update({ dashboardDefaultView: value });
  }

  alternar(chave: keyof UserSettings, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.userSettings.update({ [chave]: checked });
  }

  restaurarPadroes(): void {
    const confirmar = window.confirm('Restaurar todas as configurações para o padrão?');
    if (!confirmar) {
      return;
    }
    this.userSettings.reset();
  }

  sair(): void {
    if (this.settings().confirmLogout) {
      const confirmar = window.confirm('Deseja sair da sua conta neste aparelho?');
      if (!confirmar) {
        return;
      }
    }

    this.auth.logout();
    this.router.navigateByUrl('/login');
  }

  atualizarCampo(campo: 'nomeNovo' | 'pinAtualNome' | 'pinAtualPin' | 'pinNovo' | 'pinConfirmacao', event: Event): void {
    const valor = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, campo === 'nomeNovo' ? 100 : 4);

    if (campo === 'nomeNovo') {
      this.nomeNovo.set((event.target as HTMLInputElement).value.slice(0, 100));
      return;
    }

    const map = {
      pinAtualNome: this.pinAtualNome,
      pinAtualPin: this.pinAtualPin,
      pinNovo: this.pinNovo,
      pinConfirmacao: this.pinConfirmacao,
    } as const;

    map[campo].set(valor);
    (event.target as HTMLInputElement).value = valor;
  }

  private limparFormulario(): void {
    this.formError.set('');
    this.formSuccess.set('');
    this.nomeNovo.set('');
    this.pinAtualNome.set('');
    this.pinAtualPin.set('');
    this.pinNovo.set('');
    this.pinConfirmacao.set('');
    this.salvando.set(false);
  }
}
