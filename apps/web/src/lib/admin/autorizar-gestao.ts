import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * R03 — Verificação explícita de associação à equipe administrativa.
 *
 * O login Supabase sozinho NÃO concede acesso à gestão.
 * A fonte de autorização é a tabela portal_admins, cuja política RLS
 * restringe SELECT ao próprio auth.uid() nas bases auditadas.
 *
 * Esta função reduz exposição involuntária na UI; a barreira REAL para
 * SELECT/UPDATE de inscrições continua sendo o RLS do banco.
 * Aline/Felipe são atribuições operacionais, não privilégios presumidos.
 */
export async function verificarAcessoGestao(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  if (!userId) return false;

  try {
    const { data, error } = await supabase
      .from('portal_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    return !error && data?.user_id === userId;
  } catch {
    // Em falha de rede ou permissão, negar por padrão (fail closed).
    return false;
  }
}

/** Papéis persistidos no servidor. Um usuário pode possuir ambos. */
export type PapelGestao = 'secretaria' | 'coordenacao';

/**
 * Consulta de menor privilégio: autenticação + portal_admins +
 * um ou dois papéis válidos; sem confiar em user_metadata, e-mail ou UI.
 * Falhas, resposta ambígua ou ausência de papel => acesso negado.
 */
export async function obterPapeisGestao(
  supabase: SupabaseClient,
  userId: string
): Promise<PapelGestao[]> {
  if (!(await verificarAcessoGestao(supabase, userId))) return [];

  try {
    const { data, error } = await supabase
      .from('equipe_papeis')
      .select('papel')
      .eq('user_id', userId);
    if (error || !Array.isArray(data)) return [];

    return Array.from(
      new Set(
        data
          .map((registro: { papel?: unknown }) => registro.papel)
          .filter((papel): papel is PapelGestao =>
            papel === 'secretaria' || papel === 'coordenacao'
          )
      )
    );
  } catch {
    return [];
  }
}
