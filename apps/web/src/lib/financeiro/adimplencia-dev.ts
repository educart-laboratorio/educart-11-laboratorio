/**
 * EducART 1.1 / R05: avaliação CONSERVADORA de parcelas cadastradas no DEV.
 * Dados incompletos, competência atual ausente e pagamentos sem conferência
 * jamais geram estado verde de adimplência.
 */
export type EstadoAdimplencia =
  | 'regular'
  | 'vencido'
  | 'pendente'
  | 'conferencia'
  | 'sem_lancamento'
  | 'sem_competencia'
  | 'amostra_incompleta';

export interface ParcelaAdimplencia {
  competencia: string; // YYYY-MM-01, data do primeiro dia do mês
  vencimento_em: string; // YYYY-MM-DD, data civil
  status: string;
  confirmado_em: string | null;
  confirmado_por: string | null;
}

export function classificarAdimplencia(
  parcelas: readonly ParcelaAdimplencia[],
  hoje: string,
  amostraCompleta: boolean,
): EstadoAdimplencia {
  if (!amostraCompleta) return 'amostra_incompleta';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(hoje)) return 'amostra_incompleta';

  const validas = parcelas.filter(p => p.status !== 'cancelado');
  if (validas.length === 0) return 'sem_lancamento';

  if (validas.some(p => p.status === 'pendente' && p.vencimento_em < hoje))
    return 'vencido';
  if (validas.some(p => p.status === 'pendente')) return 'pendente';

  if (validas.some(p =>
    p.status !== 'pago' || !p.confirmado_em || !p.confirmado_por))
    return 'conferencia';

  // Pagamentos antigos confirmados não bastam para afirmar adimplência atual.
  const competenciaAtual = hoje.slice(0, 7) + '-01';
  if (!validas.some(p => p.competencia === competenciaAtual))
    return 'sem_competencia';

  return 'regular';
}
