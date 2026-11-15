/**
 * Vocabulário único de campanhas da EducART.
 *
 * A classificação serve apenas à apresentação do painel. Não altera,
 * reclassifica ou migra inscrições existentes no Supabase.
 */
export const CAMPANHA_FORMACAO_ATUAL = 'Formação de Atores EducART · 2 anos';
export const CAMPANHA_INTERESSE_FORMACAO_ANTERIOR = 'Interesse em Formação de Atores · EducART';
export const CAMPANHA_OUTUBRO_2026 = 'Turma de Outubro / 2026';

export type GrupoCampanha = 'formacao' | 'historico' | 'outras';
export type FiltroCampanha = GrupoCampanha | 'todas';

function normalizar(nome: string | null | undefined): string {
  return (nome ?? '').trim().normalize('NFKC').toLocaleLowerCase('pt-BR');
}

/** Não converte rótulos desconhecidos em inscrições da formação atual. */
export function classificarCampanha(nome: string | null | undefined): GrupoCampanha {
  const valor = normalizar(nome);
  if (valor === normalizar(CAMPANHA_FORMACAO_ATUAL)
    || valor === normalizar(CAMPANHA_INTERESSE_FORMACAO_ANTERIOR)) {
    return 'formacao';
  }
  if (valor === normalizar(CAMPANHA_OUTUBRO_2026)
    || valor.startsWith('turma de outubro')) {
    return 'historico';
  }
  return 'outras';
}

export const NOME_GRUPO_CAMPANHA: Record<GrupoCampanha, string> = {
  formacao: 'Formação de Atores · 2 anos',
  historico: 'Histórico · Turma de Outubro',
  outras: 'Outras campanhas',
};
