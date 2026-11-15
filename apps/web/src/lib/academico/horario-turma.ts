/** Horários são exclusivos da turma; datas ISO são convertidas em UTC para evitar deslocamentos de fuso. */
export type HorarioSemanalTurma = { dia: number; inicio: string; fim: string };
export function horarioSemanalNaData(horarios: readonly HorarioSemanalTurma[] | null | undefined, dataISO: string): HorarioSemanalTurma | null {
  if (!Array.isArray(horarios) || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return null;
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  const diaSemana = data.getUTCDay();
  const horaValida = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  return horarios.find(h => h.dia === diaSemana && horaValida(h.inicio) && horaValida(h.fim) && h.inicio < h.fim) ?? null;
}
