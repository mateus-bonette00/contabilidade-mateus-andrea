function normalizarValorEntrada(valorInput: unknown): string | null {
  if (typeof valorInput === 'number') {
    if (!Number.isFinite(valorInput)) {
      return null;
    }

    return String(valorInput);
  }

  if (typeof valorInput === 'string') {
    const limpo = valorInput.trim();
    return limpo.length > 0 ? limpo : null;
  }

  return null;
}

function parseCentavos(valorNormalizado: string): number | null {
  const semEspacos = valorNormalizado.replace(/\s+/g, '').replace(',', '.');

  if (!/^\d{1,10}(\.\d{1,2})?$/.test(semEspacos)) {
    return null;
  }

  const [parteInteira, parteDecimal = ''] = semEspacos.split('.');
  const centavosStr = `${parteInteira}${parteDecimal.padEnd(2, '0')}`;
  const centavos = Number(centavosStr);

  if (!Number.isSafeInteger(centavos) || centavos <= 0) {
    return null;
  }

  return centavos;
}

export function validarValorMonetario(valorInput: unknown): string | null {
  const valorNormalizado = normalizarValorEntrada(valorInput);

  if (!valorNormalizado) {
    return null;
  }

  const centavos = parseCentavos(valorNormalizado);

  if (centavos === null) {
    return null;
  }

  return (centavos / 100).toFixed(2);
}

export function validarDataReferencia(dataInput: unknown): string | null {
  if (typeof dataInput !== 'string') {
    return null;
  }

  const valor = dataInput.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return null;
  }

  const [anoStr, mesStr, diaStr] = valor.split('-');
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) {
    return null;
  }

  const data = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    data.getUTCFullYear() !== ano ||
    data.getUTCMonth() + 1 !== mes ||
    data.getUTCDate() !== dia
  ) {
    return null;
  }

  return valor;
}
