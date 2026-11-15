-- EducART 1.1 / R07.1 — APENAS PROJETO SUPABASE DEV: esjrjzyvyhtzwgihcbsc.
-- Decisao de menor privilegio: acesso gerencial as mensalidades reservado
-- a Coordenacao (Aline/Master). Felipe Secretaria permanece com inscricoes,
-- candidaturas, pessoas e matriculas sem acesso geral financeiro.
-- O direito de um estudante ler as PROPRIAS mensalidades continua preservado
-- pela policy educart_estudante_ler_mensalidades_proprias_dev (nao alterada).
-- Nenhuma confirmacao de pagamento, usuario, matricula ou turma sera alterada.
-- NAO APLICAR EM PRODUCAO. NAO RODAR SEM REVISAO DO ACCOUNT/PROJETO.
DO $r071_preflight$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='mensalidades_formacao'
     AND policyname='mensalidades_admin_select' AND cmd='SELECT'
 ) THEN RAISE EXCEPTION 'R07.1: policy de selecao administrativa ausente'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='mensalidades_formacao'
     AND policyname='educart_estudante_ler_mensalidades_proprias_dev'
     AND cmd='SELECT'
 ) THEN RAISE EXCEPTION 'R07.1: politica de leitura do estudante ausente'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='mensalidades_formacao'
     AND c.relrowsecurity
 ) THEN RAISE EXCEPTION 'R07.1: RLS financeiro desligado'; END IF;
END $r071_preflight$;

ALTER POLICY "mensalidades_admin_select" ON public.mensalidades_formacao
TO authenticated
USING (
 EXISTS (
   SELECT 1 FROM public.portal_admins pa
   WHERE pa.user_id=(SELECT auth.uid())
 ) AND EXISTS (
   SELECT 1 FROM public.equipe_papeis ep
   WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'
 )
);
