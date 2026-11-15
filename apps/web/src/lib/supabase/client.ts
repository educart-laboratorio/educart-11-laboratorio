import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Ações DEV que dependem de RPCs, RLS e serviços ainda não homologados em PROD.
// Falha fechada: qualquer URL diferente do projeto DEV preserva apenas o fluxo 1.1.
export const ACOES_ACADEMICAS_EXCLUSIVAS_DEV =
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://esjrjzyvyhtzwgihcbsc.supabase.co';

/**
 * Ativação explícita do recebimento público R35/R40 na EducART 1.1 oficial.
 * DEV permanece disponível para testes. Em PROD, iniciar DESATIVADO:
 * habilitar somente após tabela, bucket privado, RLS, limites e testes reais
 * serem comprovados no projeto PROD. A flag não substitui a segurança do DB.
 */
export const PROPOSTAS_DOCENTES_HABILITADAS =
  ACOES_ACADEMICAS_EXCLUSIVAS_DEV ||
  (process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://doygnsubiitencoyzjzk.supabase.co' &&
   process.env.NEXT_PUBLIC_EDUCART_PROPOSTAS_DOCENTES_APROVADAS === 'true');
