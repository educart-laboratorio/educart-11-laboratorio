/**
 * Tabela comercial de referência DC-093 (16/11/2026).
 * Não representa oferta aberta, contrato, dívida, recebimento ou autorização de cobrança.
 * Todos os valores são centavos inteiros, para evitar imprecisão financeira.
 */
export type CodigoFormatoExtra = 'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06';

export type FormatoExtra = Readonly<{
  codigo: CodigoFormatoExtra;
  encontros: number;
  horasPorEncontro: number;
  externoCentavos: number;
  atorEducartCentavos: number;
}>;

export const FORMATOS_EXTRAS: readonly FormatoExtra[] = Object.freeze([
  { codigo: 'F01', encontros: 1, horasPorEncontro: 2, externoCentavos: 30000, atorEducartCentavos: 15000 },
  { codigo: 'F02', encontros: 1, horasPorEncontro: 3, externoCentavos: 40000, atorEducartCentavos: 20000 },
  { codigo: 'F03', encontros: 2, horasPorEncontro: 2, externoCentavos: 50000, atorEducartCentavos: 25000 },
  { codigo: 'F04', encontros: 2, horasPorEncontro: 3, externoCentavos: 60000, atorEducartCentavos: 30000 },
  { codigo: 'F05', encontros: 3, horasPorEncontro: 2, externoCentavos: 90000, atorEducartCentavos: 45000 },
  { codigo: 'F06', encontros: 3, horasPorEncontro: 3, externoCentavos: 100000, atorEducartCentavos: 50000 },
]);

export const MAX_PARTICIPANTES_CENARIO = 10000;

export function obterFormatoExtra(codigo: string): FormatoExtra | null {
  return FORMATOS_EXTRAS.find(formato => formato.codigo === codigo) ?? null;
}

/** Para projeções exclusivamente hipotéticas. Nunca chama API ou registra operações. */
export function simularInvestimentoExtra(
  codigo: string,
  externos: number,
  atoresEducart: number,
): Readonly<{
  formato: FormatoExtra;
  totalPessoas: number;
  horasTotais: number;
  investimentoExternoCentavos: number;
  investimentoAtorCentavos: number;
  potencialBrutoCentavos: number;
}> {
  const formato = obterFormatoExtra(codigo);
  if (!formato) throw new RangeError('Formato comercial inexistente');
  if (![externos, atoresEducart].every(v => Number.isSafeInteger(v) && v >= 0 && v <= MAX_PARTICIPANTES_CENARIO)) {
    throw new RangeError('Quantidades devem ser números inteiros entre 0 e 10.000');
  }
  const investimentoExternoCentavos = externos * formato.externoCentavos;
  const investimentoAtorCentavos = atoresEducart * formato.atorEducartCentavos;
  return {
    formato,
    totalPessoas: externos + atoresEducart,
    horasTotais: formato.encontros * formato.horasPorEncontro,
    investimentoExternoCentavos,
    investimentoAtorCentavos,
    potencialBrutoCentavos: investimentoExternoCentavos + investimentoAtorCentavos,
  };
}

export function moedaBRL(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new RangeError('Valor monetário inválido');
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}