/**
 * Q9/Q14 — conferência estrita da leitura individual R11.
 * Não cria, quita nem deduz dívida. Se a consulta de 24 parcelas for parcial,
 * não apresenta saldo ou adimplência incompletos ao estudante.
 */
import { montarProgresso24, somarMeses, type Progresso24 } from './progresso-24.ts';

export type ParcelaExtratoIndividual = {
  matricula_id: string;
  numero: number;
  competencia: string;
  vencimento_em: string;
  valor_centavos: number;
  situacao: 'pendente'|'paga';
  confirmado_em: string|null;
};

const mesValido = (s: string) => /^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(s);
function dataReal(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [ano, mes, dia] = s.split('-').map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  return d.getUTCFullYear()===ano && d.getUTCMonth()===mes-1 && d.getUTCDate()===dia;
}

export function conferirExtratoR11Individual(
  matriculaId: string,
  parcelas: readonly ParcelaExtratoIndividual[],
  hoje: string,
): Progresso24|null {
  if (!matriculaId || parcelas.length!==24) return null;
  const porNumero = new Map<number, ParcelaExtratoIndividual>();
  for (const p of parcelas) {
    if (p.matricula_id!==matriculaId || !Number.isInteger(p.numero) || p.numero<1 || p.numero>24
      || porNumero.has(p.numero) || !mesValido(p.competencia)
      || !dataReal(p.vencimento_em) || !Number.isSafeInteger(p.valor_centavos)
      || p.valor_centavos<=0 || !['pendente','paga'].includes(p.situacao)
      || (p.situacao==='paga'&&!p.confirmado_em)) return null;
    porNumero.set(p.numero,p);
  }
  const primeiro = porNumero.get(1);
  if (!primeiro) return null;
  const inicio = primeiro.competencia.slice(0,7);
  try {
    for (let numero=1;numero<=24;numero++) {
      const p=porNumero.get(numero);
      if (!p || p.competencia.slice(0,7)!==somarMeses(inicio,numero-1)) return null;
    }
    const resultado = montarProgresso24(inicio,parcelas.map(p=>({
      competencia:p.competencia,vencimento_em:p.vencimento_em,
      status:p.situacao==='paga'?'pago' as const:'pendente' as const,
      confirmado_em:p.confirmado_em,
    })),hoje);
    return resultado.semLancamento===0 ? resultado : null;
  } catch { return null; }
}
