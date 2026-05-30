import { env } from '../config/env';

export type InstituicaoCodigo = 'bb' | 'itau' | 'nubank';

export interface InstituicaoOpenFinance {
  codigo: InstituicaoCodigo;
  nome: string;
  connectorId: number | null;
}

export interface TransacaoPluggy {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'CREDIT' | 'DEBIT';
  status: string;
}

interface PluggyAuthResponse {
  apiKey: string;
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}

interface PluggyAccount {
  id: string;
}

interface PluggyListResponse<T> {
  results: T[];
  totalPages?: number;
}

interface PluggyConnector {
  id: number;
  name: string;
}

const NOMES_INSTITUICOES: Record<InstituicaoCodigo, string> = {
  bb: 'Banco do Brasil',
  itau: 'Itaú',
  nubank: 'Nubank',
};

export function pluggyConfigurado(): boolean {
  return Boolean(env.openFinance.pluggyClientId && env.openFinance.pluggyClientSecret);
}

export function listarInstituicoes(): InstituicaoOpenFinance[] {
  return (Object.keys(NOMES_INSTITUICOES) as InstituicaoCodigo[]).map((codigo) => ({
    codigo,
    nome: NOMES_INSTITUICOES[codigo],
    connectorId: env.openFinance.connectorIds[codigo],
  }));
}

export function obterInstituicao(codigo: string): InstituicaoOpenFinance | null {
  return listarInstituicoes().find((instituicao) => instituicao.codigo === codigo) ?? null;
}

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function pluggyRequest<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const response = await fetch(`${env.openFinance.pluggyBaseUrl}${path}`, init);

  if (!response.ok) {
    const mensagem = await response.text();
    throw new Error(`Pluggy retornou ${response.status}: ${mensagem.slice(0, 160)}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function obterApiKey(): Promise<string> {
  if (!pluggyConfigurado()) {
    throw new Error('Integração Open Finance ainda não configurada no servidor.');
  }

  const resposta = await pluggyRequest<PluggyAuthResponse>('/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: env.openFinance.pluggyClientId,
      clientSecret: env.openFinance.pluggyClientSecret,
    }),
  });

  return resposta.apiKey;
}

export async function criarConnectToken(usuarioId: string): Promise<string> {
  const apiKey = await obterApiKey();
  const options: Record<string, unknown> = {
    clientUserId: usuarioId,
    avoidDuplicates: true,
  };

  if (env.openFinance.webhookUrl) {
    options.webhookUrl = env.openFinance.webhookUrl;
  }

  const resposta = await pluggyRequest<PluggyConnectTokenResponse>('/connect_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({ options }),
  });

  return resposta.accessToken;
}

async function buscarConectoresOpenFinance(nome: string): Promise<PluggyConnector[]> {
  const apiKey = await obterApiKey();
  const parametros = new URLSearchParams({
    isOpenFinance: 'true',
    countries: 'BR',
    name: nome,
  });

  const resposta = await pluggyRequest<PluggyListResponse<PluggyConnector> | PluggyConnector[]>(
    `/connectors?${parametros.toString()}`,
    { method: 'GET', headers: { 'X-API-KEY': apiKey } },
  );

  return Array.isArray(resposta) ? resposta : resposta.results;
}

function escolherMelhorConnector(
  conectores: PluggyConnector[],
  instituicao: InstituicaoOpenFinance,
): PluggyConnector | null {
  if (conectores.length === 0) {
    return null;
  }

  const nomeEsperado = normalizarTexto(instituicao.nome);
  const porNomeExato = conectores.find((conector) => normalizarTexto(conector.name) === nomeEsperado);

  if (porNomeExato) {
    return porNomeExato;
  }

  const porPrefixo = conectores.find((conector) => normalizarTexto(conector.name).startsWith(nomeEsperado));
  if (porPrefixo) {
    return porPrefixo;
  }

  const porInclusao = conectores.find((conector) => normalizarTexto(conector.name).includes(nomeEsperado));
  return porInclusao ?? conectores[0] ?? null;
}

export async function resolverInstituicaoOpenFinance(codigo: string): Promise<InstituicaoOpenFinance | null> {
  const instituicao = obterInstituicao(codigo);

  if (!instituicao) {
    return null;
  }

  if (instituicao.connectorId !== null || !pluggyConfigurado()) {
    return instituicao;
  }

  const conectores = await buscarConectoresOpenFinance(instituicao.nome);
  const conector = escolherMelhorConnector(conectores, instituicao);

  return {
    ...instituicao,
    connectorId: conector?.id ?? null,
  };
}

export async function listarInstituicoesResolvidas(): Promise<InstituicaoOpenFinance[]> {
  const instituicoes = listarInstituicoes();

  if (!pluggyConfigurado()) {
    return instituicoes;
  }

  return Promise.all(
    instituicoes.map(async (instituicao) => {
      if (instituicao.connectorId !== null) {
        return instituicao;
      }

      const conectores = await buscarConectoresOpenFinance(instituicao.nome);
      const conector = escolherMelhorConnector(conectores, instituicao);

      return {
        ...instituicao,
        connectorId: conector?.id ?? null,
      };
    }),
  );
}

export async function removerItemPluggy(itemId: string): Promise<void> {
  const apiKey = await obterApiKey();

  await pluggyRequest<Record<string, never>>(`/items/${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { 'X-API-KEY': apiKey },
  });
}

export async function buscarTransacoesPluggy(itemId: string): Promise<TransacaoPluggy[]> {
  const apiKey = await obterApiKey();
  const contasResponse = await pluggyRequest<PluggyListResponse<PluggyAccount> | PluggyAccount[]>(
    `/accounts?itemId=${encodeURIComponent(itemId)}&type=BANK`,
    { method: 'GET', headers: { 'X-API-KEY': apiKey } },
  );
  const contas = Array.isArray(contasResponse) ? contasResponse : contasResponse.results;
  const transacoes: TransacaoPluggy[] = [];

  for (const conta of contas) {
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const resposta = await pluggyRequest<PluggyListResponse<TransacaoPluggy>>(
        `/transactions?accountId=${encodeURIComponent(conta.id)}&page=${pagina}&pageSize=500`,
        { method: 'GET', headers: { 'X-API-KEY': apiKey } },
      );
      transacoes.push(...resposta.results);
      totalPaginas = resposta.totalPages ?? 1;
      pagina += 1;
    } while (pagina <= totalPaginas);
  }

  return transacoes;
}
