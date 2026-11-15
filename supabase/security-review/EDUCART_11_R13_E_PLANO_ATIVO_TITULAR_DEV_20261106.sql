-- R13-E | PLANOS FINANCEIROS ATIVOS VISÍVEIS SOMENTE AO TITULAR (Supabase DEV)
-- Esquema DEV: esjrjzyvyhtzwgihcbsc. Não aplicar em PROD.
-- Esta política é ADITIVA e somente SELECT: nunca libera rascunhos,
-- não permite alterações, não confirma recebimentos ou cria dívidas.
DO $guard$
BEGIN
 IF to_regclass('public.educart_planos_financeiros_r11_dev') IS NULL
 OR to_regclass('public.pessoas') IS NULL
 OR to_regclass('public.matriculas') IS NULL THEN
   RAISE EXCEPTION 'R13-E: dependências DEV ausentes';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='educart_planos_financeiros_r11_dev'
     AND policyname='educart_r11_planos_admin_select' AND cmd='SELECT'
 ) OR EXISTS (
   SELECT 1 FROM pg_policies
   WHERE schemaname='public' AND tablename='educart_planos_financeiros_r11_dev'
     AND policyname='educart_r13_plano_ativo_estudante_proprio_dev'
 ) THEN RAISE EXCEPTION 'R13-E: políticas divergem; revisar manualmente'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM pg_class WHERE oid='public.educart_planos_financeiros_r11_dev'::regclass
     AND relrowsecurity=true
 ) THEN RAISE EXCEPTION 'R13-E: RLS precisa estar habilitado'; END IF;
END $guard$;

CREATE POLICY educart_r13_plano_ativo_estudante_proprio_dev
ON public.educart_planos_financeiros_r11_dev FOR SELECT TO authenticated
USING (
  situacao='ativo'
  AND (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.matriculas m
    JOIN public.pessoas p ON p.id=m.pessoa_id
    WHERE m.id=educart_planos_financeiros_r11_dev.matricula_id
      AND p.auth_user_id=(SELECT auth.uid())
  )
);
COMMENT ON POLICY educart_r13_plano_ativo_estudante_proprio_dev
 ON public.educart_planos_financeiros_r11_dev
IS 'R13-E DEV: apenas plano ativo da matrícula do próprio estudante é visível. Rascunhos seguem privados da Coordenação.';
