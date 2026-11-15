-- AutoDEV / EducART 1.1 R04
-- MIGRAÇÃO APLICADA EXCLUSIVAMENTE NO Supabase database-dev em 05/11/2026.
-- Aplicação: Supabase apply_migration: educart_r04_turmas_secretaria_planejada_audit_dev_20261105
-- NÃO executar na produção. SQL apenas para rastreabilidade/rollback manual auditado.
ALTER TABLE public.turmas
  ADD COLUMN criada_por uuid DEFAULT auth.uid()
  REFERENCES auth.users(id);
COMMENT ON COLUMN public.turmas.criada_por IS 'R04 DEV: auth.uid() do responsável pela criação; registros anteriores permanecem NULL.';
CREATE POLICY educart_r04_secretaria_cria_turma_planejada_dev
ON public.turmas FOR INSERT TO authenticated
WITH CHECK (
  situacao = 'planejada'
  AND criada_por = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.portal_admins adm
    WHERE adm.user_id = (SELECT auth.uid())
  )
  AND EXISTS (
    SELECT 1 FROM public.equipe_papeis ep
    WHERE ep.user_id = (SELECT auth.uid()) AND ep.papel = 'secretaria'
  )
);
-- Reversão controlada, só em DEV e após auditar referências:
-- DROP POLICY educart_r04_secretaria_cria_turma_planejada_dev ON public.turmas;
-- ALTER TABLE public.turmas DROP COLUMN criada_por;
