-- EducART 1.1 / R13-D | LEITURA PRIVADA DAS TURMAS, APENAS SUPABASE DEV
-- Executar SOMENTE no projeto esjrjzyvyhtzwgihcbsc.
-- Segurança: não altera cadastros, horários, Auth, produção, pagamentos ou tabelas.
-- A política antiga turmas_ler_autenticados expunha 3 turmas a usuário fictício autenticado
-- sem matrícula (verificação R13 read-only de 06/11/2026). Revogar leitura global.
-- Formações públicas/autenticadas permanecem como estão para não afetar o catálogo.

DO $preflight$
BEGIN
  IF to_regclass('public.turmas') IS NULL
    OR to_regclass('public.matriculas') IS NULL
    OR to_regclass('public.pessoas') IS NULL
    OR to_regclass('public.portal_admins') IS NULL
    OR to_regclass('public.equipe_papeis') IS NULL
  THEN RAISE EXCEPTION 'R13-D: dependência acadêmica ausente'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='turmas'
      AND policyname='turmas_ler_autenticados' AND cmd='SELECT'
      AND qual='true'
  ) THEN
    RAISE EXCEPTION 'R13-D: política anterior mudou; revisar antes de substituir';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='turmas'
      AND policyname='educart_turmas_equipe_titular_r13_dev'
  ) THEN
    RAISE EXCEPTION 'R13-D: política nova já existe; não reaplicar'; END IF;
END $preflight$;

DROP POLICY turmas_ler_autenticados ON public.turmas;

CREATE POLICY educart_turmas_equipe_titular_r13_dev
ON public.turmas FOR SELECT TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    -- Gestão autorizada vê a grade completa; Secretaria conserva a consulta.
    (
      EXISTS (SELECT 1 FROM public.portal_admins pa
              WHERE pa.user_id=(SELECT auth.uid()))
      AND EXISTS (SELECT 1 FROM public.equipe_papeis ep
                  WHERE ep.user_id=(SELECT auth.uid())
                    AND ep.papel IN ('secretaria','coordenacao'))
    )
    OR
    -- Estudante vê somente turmas às quais tem matrícula, inclusive pendente.
    EXISTS (
      SELECT 1 FROM public.matriculas m
      JOIN public.pessoas p ON p.id=m.pessoa_id
      WHERE m.turma_id=turmas.id
        AND p.auth_user_id=(SELECT auth.uid())
    )
  )
);

COMMENT ON POLICY educart_turmas_equipe_titular_r13_dev ON public.turmas
IS 'R13-D DEV: turma restrita a Coordenacao/Secretaria autorizada ou estudante matriculado na propria turma. Nao ler turmas globais.';
