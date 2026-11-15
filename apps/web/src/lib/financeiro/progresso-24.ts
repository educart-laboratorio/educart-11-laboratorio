/**
 * EducART R11 — projeção pura da evolução de 24 mensalidades por matrícula.
 * Não cria cobranças, não confirma recebimentos e não acessa o Supabase.
 * Verde apenas com status pago e confirmação persistida.
 */
export const TOTAL_PARCELAS_FORMACAO = 24 as const;
export type StatusParcela = 'paga' | 'vencida' | 'pendente' | 'futura' | 'cancelada' | 'sem_lancamento' | 'sem_plano';
export type MensalidadeProgresso = {
  competencia: string; // YYYY-MM-DD, primeiro dia do mês
  vencimento_em: string; // YYYY-MM-DD
  status: 'pendente'|'pago'|'cancelado';
  confirmado_em: string|null;
};
export type ProgressoParcela = {
  numero: number;
  competencia: string|null;
  estado: StatusParcela;
};
export type Progresso24 = {
  parcelas: ProgressoParcela[];
  pagas: number; vencidas: number; pendentes: number; semLancamento: number;
  possuiPlano: boolean;
};
const mesValido = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const dataValida = (v: string) => /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(v);
export function somarMeses(competencia: string, acrescimo: number): string {
  if (!mesValido(competencia) || !Number.isInteger(acrescimo) || acrescimo<0 || acrescimo>=240)
    throw new Error('Competência ou índice de mês inválido');
  const [ano,mes] = competencia.split('-').map(Number);
  const data = new Date(Date.UTC(ano,mes-1+acrescimo,1));
  return data.toISOString().slice(0,7);
}
export function montarProgresso24(
  inicioCompetencia: string|null,
  mensalidades: readonly MensalidadeProgresso[],
  hoje: string,
): Progresso24 {
  if (!dataValida(hoje) || Number.isNaN(Date.parse(hoje+'T00:00:00Z')))
    throw new Error('Data de referência inválida');
  if (inicioCompetencia !== null && !mesValido(inicioCompetencia))
    throw new Error('Início de contrato inválido');
  const linhas = new Map<string, MensalidadeProgresso>();
  for (const m of mensalidades) {
    const competencia = m.competencia.slice(0,7);
    if (!mesValido(competencia) || !dataValida(m.vencimento_em) ||
        !/^(pendente|pago|cancelado)$/.test(m.status)) throw new Error('Parcela inválida');
    if (linhas.has(competencia)) throw new Error('Parcela de competência duplicada');
    linhas.set(competencia,m);
  }
  const parcelas: ProgressoParcela[] = Array.from({length:TOTAL_PARCELAS_FORMACAO},(_,idx)=>{
    if (inicioCompetencia===null) return {numero:idx+1,competencia:null,estado:'sem_plano' as StatusParcela};
    const competencia=somarMeses(inicioCompetencia,idx);
    const m=linhas.get(competencia);
    let estado:StatusParcela='sem_lancamento';
    if (m) {
      if (m.status==='pago') estado=m.confirmado_em?'paga':'sem_lancamento';
      else if (m.status==='cancelado') estado='cancelada';
      else if (m.vencimento_em<hoje) estado='vencida';
      else if (competencia>hoje.slice(0,7)) estado='futura';
      else estado='pendente';
    }
    return {numero:idx+1,competencia,estado};
  });
  return {
    parcelas,
    pagas:parcelas.filter(p=>p.estado==='paga').length,
    vencidas:parcelas.filter(p=>p.estado==='vencida').length,
    pendentes:parcelas.filter(p=>p.estado==='pendente').length,
    semLancamento:parcelas.filter(p=>p.estado==='sem_lancamento'||p.estado==='sem_plano').length,
    possuiPlano:inicioCompetencia!==null,
  };
}
/** Histórico de competências até o mês atual, sem inventar parcelas ausentes. */
export function historicoAteMesAtual(progresso:Progresso24,hoje:string):ProgressoParcela[] {
  if(!dataValida(hoje))throw new Error('Data inválida');
  const mes=hoje.slice(0,7);
  return progresso.parcelas.filter(p=>p.competencia!==null && p.competencia<=mes);
}
