/** TC-06: transporta apenas escolhas conhecidas da triagem para a inscrição.
 * Não presume data de nascimento, identidade ou descrição de experiência.
 */
const objetivos: Record<string,{objetivo:string;objetivoOutro:string}> = {
  'Atuação profissional': { objetivo: 'Ser Ator/Atriz profissional', objetivoOutro: '' },
  'Oratória e comunicação': { objetivo: 'Aprimorar comunicação e oratória', objetivoOutro: '' },
  'Desinibição e confiança': { objetivo: 'Desinibição e desenvolvimento pessoal', objetivoOutro: '' },
  'Arte e descoberta': { objetivo: 'Outro', objetivoOutro: 'Arte e descoberta' },
};
const experiencias: Record<string,'Sim'|'Não'> = {
  'Estou começando': 'Não',
  'Já participei de aulas ou oficinas': 'Sim',
  'Já tenho experiência em cena': 'Sim',
};
const faixas = new Set(['Até 13 anos','14 a 17 anos','18 a 29 anos','30 a 49 anos','50 anos ou mais']);

export type TriagemInscricao = {
  objetivo?: string;
  objetivoOutro?: string;
  experienciaPrevia?: 'Sim'|'Não';
  objetivoRotulo?: string;
  experienciaRotulo?: string;
  faixaRotulo?: string;
};
export function mapearTriagemInscricao(search: string): TriagemInscricao | null {
  const q = new URLSearchParams(search);
  const objetivo = q.get('objetivo') || '';
  const experiencia = q.get('experiencia') || '';
  const faixa = q.get('faixa') || '';
  const resultado: TriagemInscricao = {};
  if (Object.hasOwn(objetivos, objetivo)) {
    resultado.objetivo = objetivos[objetivo].objetivo;
    resultado.objetivoOutro = objetivos[objetivo].objetivoOutro;
    resultado.objetivoRotulo = objetivo;
  }
  if (Object.hasOwn(experiencias, experiencia)) {
    resultado.experienciaPrevia = experiencias[experiencia];
    resultado.experienciaRotulo = experiencia;
  }
  if (faixas.has(faixa)) resultado.faixaRotulo = faixa;
  return Object.keys(resultado).length ? resultado : null;
}
