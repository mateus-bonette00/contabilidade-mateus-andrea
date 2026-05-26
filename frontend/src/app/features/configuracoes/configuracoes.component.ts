import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-configuracoes',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracoes.component.html',
  styleUrl: './configuracoes.component.scss',
})
export class ConfiguracoesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly carregando = signal(true);
  readonly salvandoPerfil = signal(false);
  readonly salvandoPin = signal(false);
  readonly erroPerfil = signal('');
  readonly sucessoPerfil = signal('');
  readonly erroPin = signal('');
  readonly sucessoPin = signal('');

  nome = '';
  sobrenome = '';
  email = '';
  fotoUrl: string | null = null;
  pinAtualPerfil = '';

  pinAtual = '';
  pinNovo = '';
  pinConfirmacao = '';

  ngOnInit(): void {
    this.auth.carregarPerfil().subscribe({
      next: ({ usuario }) => {
        this.nome = usuario.nome;
        this.sobrenome = usuario.sobrenome;
        this.email = usuario.email;
        this.fotoUrl = usuario.fotoUrl;
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
      },
    });
  }

  onFotoSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.erroPerfil.set('Selecione apenas arquivo de imagem.');
      input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.erroPerfil.set('A foto deve ter no máximo 2MB.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.fotoUrl = typeof reader.result === 'string' ? reader.result : null;
      this.erroPerfil.set('');
    };
    reader.readAsDataURL(file);
  }

  removerFoto(): void {
    this.fotoUrl = null;
  }

  salvarPerfil(): void {
    const nome = this.nome.trim();
    const sobrenome = this.sobrenome.trim();
    const email = this.email.trim().toLowerCase();
    const pinAtual = this.pinAtualPerfil.trim();

    if (!nome || !sobrenome || !email || !pinAtual) {
      this.erroPerfil.set('Preencha nome, sobrenome, e-mail e PIN atual.');
      return;
    }

    this.salvandoPerfil.set(true);
    this.erroPerfil.set('');
    this.sucessoPerfil.set('');

    this.auth.atualizarPerfil({ nome, sobrenome, email, fotoUrl: this.fotoUrl, pinAtual }).subscribe({
      next: () => {
        this.salvandoPerfil.set(false);
        this.sucessoPerfil.set('Perfil atualizado com sucesso.');
        this.pinAtualPerfil = '';
      },
      error: (erro) => {
        this.salvandoPerfil.set(false);
        this.erroPerfil.set(erro?.error?.message ?? 'Não foi possível atualizar o perfil.');
      },
    });
  }

  salvarPin(): void {
    const pinAtual = this.pinAtual.trim();
    const pinNovo = this.pinNovo.trim();
    const pinConfirmacao = this.pinConfirmacao.trim();

    if (!pinAtual || !pinNovo || !pinConfirmacao) {
      this.erroPin.set('Preencha todos os campos de PIN.');
      return;
    }

    this.salvandoPin.set(true);
    this.erroPin.set('');
    this.sucessoPin.set('');

    this.auth.atualizarPin(pinAtual, pinNovo, pinConfirmacao).subscribe({
      next: (resposta) => {
        this.salvandoPin.set(false);
        this.sucessoPin.set(resposta.message);
        this.pinAtual = '';
        this.pinNovo = '';
        this.pinConfirmacao = '';
      },
      error: (erro) => {
        this.salvandoPin.set(false);
        this.erroPin.set(erro?.error?.message ?? 'Não foi possível atualizar o PIN.');
      },
    });
  }

  sairDaConta(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
