/**
 * Critério institucional: a turma adulta de Formação de Atores recebe
 * interessados que já completaram 14 anos na data da inscrição.
 */
export const IDADE_MINIMA_FORMACAO = 14;
export const FAIXA_ATE_13 = 'Até 13 anos';

export function dataAtualBahia(): string {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bahia', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const parte = (tipo: string) => partes.find(p => p.type === tipo)?.value ?? '';
  return [parte('year'), parte('month'), parte('day')].join('-');
}

/** Retorna idade completa; -1 para data futura e null para datas inválidas. */
export function calcularIdade(dataNascimento: string, hoje: string = dataAtualBahia()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) return null;
  const [ano, mes, dia] = dataNascimento.split('-').map(Number);
  const [anoAtual, mesAtual, diaAtual] = hoje.split('-').map(Number);
  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || dia > 31 ||
    !Number.isInteger(anoAtual) || !Number.isInteger(mesAtual) || !Number.isInteger(diaAtual)) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  if (dataNascimento > hoje) return -1;
  return anoAtual - ano - (mesAtual < mes || (mesAtual === mes && diaAtual < dia) ? 1 : 0);
}

export function idadeMinimaAtendida(dataNascimento: string, hoje: string = dataAtualBahia()): boolean {
  const idade = calcularIdade(dataNascimento, hoje);
  return idade !== null && idade >= IDADE_MINIMA_FORMACAO;
}
