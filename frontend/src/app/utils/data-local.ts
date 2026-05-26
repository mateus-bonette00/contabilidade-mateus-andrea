export interface MesAno {
  mes: number;
  ano: number;
}

export function mesAnoAtual(): MesAno {
  const agora = new Date();
  return { mes: agora.getMonth(), ano: agora.getFullYear() };
}

export function dataLocalHoje(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function parseDataReferencia(data: string): Date {
  const [parteData] = data.split('T');
  const [ano, mes, dia] = parteData.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

export function mesAnoDaData(data: string): MesAno {
  const referencia = parseDataReferencia(data);
  return { mes: referencia.getMonth(), ano: referencia.getFullYear() };
}

export function isMesAnoAposAtual(mes: number, ano: number, referencia = mesAnoAtual()): boolean {
  return ano > referencia.ano || (ano === referencia.ano && mes > referencia.mes);
}

export function proximoMesAno(mes: number, ano: number): MesAno {
  return mes === 11 ? { mes: 0, ano: ano + 1 } : { mes: mes + 1, ano };
}

export function mesAnteriorMesAno(mes: number, ano: number): MesAno {
  return mes === 0 ? { mes: 11, ano: ano - 1 } : { mes: mes - 1, ano };
}

export function podeAvancarMes(mes: number, ano: number): boolean {
  const proximo = proximoMesAno(mes, ano);
  return !isMesAnoAposAtual(proximo.mes, proximo.ano);
}
