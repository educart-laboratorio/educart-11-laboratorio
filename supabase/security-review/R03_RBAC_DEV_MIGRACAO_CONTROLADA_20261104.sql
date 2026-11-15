-- STATUS DE 04/11/2026: APLICADO PERMANENTEMENTE SOMENTE NO database-dev.
-- Migração Supabase confirmada: 20261104113629.
-- Arquivo é CÓPIA DE RASTREABILIDADE (fora de supabase/migrations).
-- NÃO REAPLICAR EM DEV e NÃO PROMOVER PARA database-prod.
-- Nenhum usuário foi provisionado e nenhum papel foi concedido.
-- O RBAC de inscrições é real; outras tabelas acadêmicas/financeiras
-- requerem políticas específicas antes de operações reais.
-- EducART 1.1 / R03 — RBAC de Secretaria e Coordenação.
-- ESCOPO AUTORIZADO: APENAS Supabase database-dev (esjrjzyvyhtzwgihcbsc).
-- Não aplicar em database-prod, nem copiar para supabase/migrations genéricas.
-- Não concede papéis, cria contas ou altera inscrições reais.
-- A autorização "avante" sucedeu pedido de tornar RBAC permanente em DEV.
--
-- Regras:
-- - admin_login / admin_dashboard: autenticação + membership portal_admins
--   e ao menos um papel explícito em equipe_papeis.
-- - secretaria: ler inscrições, acompanhar contatos, sem mudar status.
-- - coordenacao: ler inscrições e alterar somente status.
-- - ambos: união dos papéis, mediante concessões auditáveis.
-- - membership não substitui papel; papel sozinho sem portal_admins não dá acesso.
-- - granted_by é reservado para operação confiável de concessão;
--   nenhum GRANT INSERT/UPDATE/DELETE é concedido via Data API.

DO $preflight$
BEGIN
 IF EXISTS (SELECT 1 FROM public.portal_admins) THEN
   RAISE EXCEPTION 'R03: portal_admins não vazio: revisar migração de privilégios antes de migrar';
 END IF;
 IF to_regclass('public.equipe_papeis') IS NOT NULL THEN
   RAISE EXCEPTION 'R03: equipe_papeis já existe';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='inscricoes_oficina'
     AND policyname='educart_public_submit_pending_14'
 ) THEN RAISE EXCEPTION 'R03: hardening 14+ do DEV ausente'; END IF;
 IF (SELECT count(*) FROM pg_policies
     WHERE schemaname='public' AND tablename='inscricoes_oficina'
     AND policyname IN ('educart_admin_read_inscricoes','educart_admin_update_inscricoes')) <> 2
 THEN RAISE EXCEPTION 'R03: policies administrativas esperadas ausentes'; END IF;
END $preflight$;

CREATE TABLE public.equipe_papeis (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  papel text NOT NULL CHECK (papel IN ('secretaria','coordenacao')),
  atribuido_em timestamptz NOT NULL DEFAULT now(),
  atribuido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY(user_id,papel)
);

ALTER TABLE public.equipe_papeis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.equipe_papeis FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.equipe_papeis TO authenticated;

CREATE POLICY "educart_equipe_papeis_ler_proprios"
ON public.equipe_papeis FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- SELECT: somente membros de portal_admins COM papel explícito.
-- RLS é a barreira real, inclusive para REST/Data API fora da UI.
ALTER POLICY "educart_admin_read_inscricoes" ON public.inscricoes_oficina
TO authenticated
USING (
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(
   SELECT 1 FROM public.equipe_papeis e
   WHERE e.user_id=(SELECT auth.uid()) AND e.papel IN ('secretaria','coordenacao')
 )
);

-- UPDATE: exige papel de Coordenação, nunca Secretaria isolada.
ALTER POLICY "educart_admin_update_inscricoes" ON public.inscricoes_oficina
TO authenticated
USING (
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(
   SELECT 1 FROM public.equipe_papeis e
   WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao'
 )
)
WITH CHECK (
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(
   SELECT 1 FROM public.equipe_papeis e
   WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao'
 )
);
