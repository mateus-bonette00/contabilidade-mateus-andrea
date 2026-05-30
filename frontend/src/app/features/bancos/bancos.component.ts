import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PluggyConnect } from 'pluggy-connect-sdk';
import { forkJoin } from 'rxjs';
import { ConfiguracaoOpenFinance, ConexaoBancaria, InstituicaoBancaria } from '../../models/conexao-bancaria.model';
import { OpenFinanceService } from '../../services/open-finance.service';

type TipoDocumento = 'cpf' | 'cnpj';

@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './bancos.component.html',
  styleUrl: './bancos.component.scss',
})
export class BancosComponent implements OnInit, OnDestroy {
  private readonly service = inject(OpenFinanceService);
  private widget: PluggyConnect | null = null;
  private itemRegistradoNoFluxo: string | null = null;
  private itemRegistrandoNoFluxo: string | null = null;
  private finalizarAposRegistro = false;

  readonly carregando = signal(true);
  readonly configuracao = signal<ConfiguracaoOpenFinance | null>(null);
  readonly conexoes = signal<ConexaoBancaria[]>([]);
  readonly instituicaoSelecionada = signal<InstituicaoBancaria | null>(null);
  readonly conectando = signal(false);
  readonly processandoId = signal<string | null>(null);
  readonly mensagem = signal('');
  readonly erro = signal('');
  readonly integracaoPronta = computed(() =>
    Boolean(this.configuracao()?.configurado && this.configuracao()?.instituicoes.every((instituicao) => instituicao.disponivel))
  );

  tipoDocumento: TipoDocumento = 'cpf';
  documento = '';

  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    void this.widget?.destroy();
  }

  selecionarBanco(instituicao: InstituicaoBancaria): void {
    this.instituicaoSelecionada.set(instituicao);
    this.mensagem.set('');
    this.erro.set('');
  }

  iniciarConexao(): void {
    const instituicao = this.instituicaoSelecionada();
    const configuracao = this.configuracao();
    const documento = this.documento.replace(/\D/g, '');
    const tamanhoDocumento = this.tipoDocumento === 'cpf' ? 11 : 14;

    if (!instituicao) {
      this.erro.set('Escolha um banco para continuar.');
      return;
    }

    if (!configuracao?.configurado) {
      this.erro.set('A integração ainda não foi ativada no servidor. Informe as credenciais Open Finance.');
      return;
    }

    if (!instituicao.disponivel) {
      this.erro.set(`O identificador Open Finance de ${instituicao.nome} ainda não foi configurado.`);
      return;
    }

    if (documento.length !== tamanhoDocumento) {
      this.erro.set(`Informe um ${this.tipoDocumento.toUpperCase()} válido para autorizar no banco.`);
      return;
    }

    this.conectando.set(true);
    this.erro.set('');
    this.mensagem.set('');

    this.service.criarConnectToken(instituicao.codigo).subscribe({
      next: (token) => this.abrirWidget(token.accessToken, token.selectedConnectorId, documento),
      error: (erro) => {
        this.conectando.set(false);
        this.erro.set(erro?.error?.message ?? 'Não foi possível iniciar a conexão bancária.');
      },
    });
  }

  sincronizar(conexao: ConexaoBancaria): void {
    this.processandoId.set(conexao.id);
    this.erro.set('');
    this.mensagem.set('');

    this.service.sincronizar(conexao.id).subscribe({
      next: ({ importadas }) => {
        this.processandoId.set(null);
        this.mensagem.set(`${importadas} movimentação(ões) sincronizada(s). Abra o dashboard para conferir.`);
        this.carregarConexoes();
      },
      error: (erro) => {
        this.processandoId.set(null);
        this.erro.set(erro?.error?.message ?? 'Não foi possível sincronizar as movimentações.');
      },
    });
  }

  desconectar(conexao: ConexaoBancaria): void {
    this.processandoId.set(conexao.id);
    this.erro.set('');
    this.mensagem.set('');

    this.service.desconectar(conexao.id).subscribe({
      next: ({ message }) => {
        this.processandoId.set(null);
        this.mensagem.set(message);
        this.carregarConexoes();
      },
      error: (erro) => {
        this.processandoId.set(null);
        this.erro.set(erro?.error?.message ?? 'Não foi possível desconectar o banco.');
      },
    });
  }

  formatarData(data: string | null): string {
    if (!data) {
      return 'Ainda não sincronizado';
    }

    return new Date(data).toLocaleString('pt-BR');
  }

  private carregarDados(): void {
    forkJoin({
      configuracao: this.service.obterConfiguracao(),
      conexoes: this.service.listarConexoes(),
    }).subscribe({
      next: ({ configuracao, conexoes }) => {
        this.configuracao.set(configuracao);
        this.conexoes.set(conexoes);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Não foi possível carregar as conexões bancárias.');
        this.carregando.set(false);
      },
    });
  }

  private carregarConexoes(): void {
    this.service.listarConexoes().subscribe({
      next: (conexoes) => this.conexoes.set(conexoes),
      error: () => this.erro.set('Não foi possível atualizar a lista de bancos.'),
    });
  }

  private abrirWidget(accessToken: string, selectedConnectorId: number | null, documento: string): void {
    const instituicao = this.instituicaoSelecionada();
    if (!instituicao) {
      this.conectando.set(false);
      return;
    }

    this.itemRegistradoNoFluxo = null;
    this.itemRegistrandoNoFluxo = null;
    this.finalizarAposRegistro = false;

    const openFinanceParameters = this.tipoDocumento === 'cpf' ? { cpf: documento } : { cnpj: documento };

    this.widget = new PluggyConnect({
      connectToken: accessToken,
      countries: ['BR'],
      products: ['ACCOUNTS', 'TRANSACTIONS'],
      connectorTypes: [this.tipoDocumento === 'cpf' ? 'PERSONAL_BANK' : 'BUSINESS_BANK'],
      ...(selectedConnectorId ? { selectedConnectorId } : {}),
      openFinanceParameters,
      language: 'pt',
      theme: 'light',
      onEvent: (payload: { event?: string; item?: { id?: string } }) => {
        const itemId = payload?.item?.id;

        if (!itemId) {
          return;
        }

        if (payload.event === 'ITEM_RESPONSE' || payload.event === 'LOGIN_STEP_COMPLETED') {
          this.registrarConexaoNoFluxo(instituicao.codigo, itemId, false);
        }
      },
      onSuccess: ({ item }) => this.registrarConexaoNoFluxo(instituicao.codigo, item.id, true),
      onError: ({ message }) => {
        this.conectando.set(false);
        this.erro.set(message || 'A autorização bancária não foi concluída.');
      },
      onClose: () => this.conectando.set(false),
    });

    void this.widget.init().catch(() => {
      this.conectando.set(false);
      this.erro.set('Não foi possível abrir a autorização segura do banco.');
    });
  }

  private registrarConexaoNoFluxo(instituicaoCodigo: string, itemId: string, finalizarAoConcluir: boolean): void {
    if (this.itemRegistradoNoFluxo === itemId) {
      if (finalizarAoConcluir) {
        this.finalizarFluxoConexao();
      }
      return;
    }

    if (this.itemRegistrandoNoFluxo === itemId) {
      this.finalizarAposRegistro = this.finalizarAposRegistro || finalizarAoConcluir;
      return;
    }

    this.itemRegistrandoNoFluxo = itemId;
    this.finalizarAposRegistro = finalizarAoConcluir;
    this.service.registrarConexao(instituicaoCodigo, itemId).subscribe({
      next: () => {
        this.itemRegistrandoNoFluxo = null;
        this.itemRegistradoNoFluxo = itemId;

        if (this.finalizarAposRegistro) {
          this.finalizarAposRegistro = false;
          this.finalizarFluxoConexao();
        } else {
          this.mensagem.set('Autorização recebida. O extrato será sincronizado automaticamente em instantes.');
        }

        this.carregarConexoes();
      },
      error: (erro) => {
        this.itemRegistrandoNoFluxo = null;
        this.conectando.set(false);
        this.erro.set(erro?.error?.message ?? 'A conexão ocorreu, mas não foi possível salvá-la.');
      },
    });
  }

  private finalizarFluxoConexao(): void {
    this.conectando.set(false);
    this.documento = '';
    this.instituicaoSelecionada.set(null);
    this.mensagem.set('Banco conectado. O extrato será sincronizado automaticamente. Use Sincronizar se quiser forçar uma atualização.');
    this.carregarConexoes();
  }
}
