-- EducART 1.1 — CORREÇÃO PRESERVATIVA DE POLÍTICA DE INSCRIÇÕES (11/11/2026).
-- REVISÃO SOMENTE. ENCERRO SEMPRE COM ROLLBACK. NÃO APLICAR EM PROD.
-- Divergência verificada por consultas somente leitura:
-- PROD aceita INSERT de anon na coluna status e a política atual valida apenas idade.
-- DEV exige status='pendente_confirmacao' e a mesma idade mínima.
-- A correção afeta somente novos INSERTs; não reclassifica nem remove
-- as dez inscrições históricas (incluindo duas marcadas matriculado).
-- NÃO copiar todas as políticas do DEV para produção. Preservar nome,
-- privilégios/roles atuais, UPDATE existente, perfis e portal_admins.
--
-- PRECONDIÇÕES PARA EVENTUAL PROMOÇÃO (fora desta transação):
--   backup recuperável demonstrado, revisão de risco, autenticação e
--   autorização específica da Direção, além de janela de publicação.
--   Verificar fluxo do formulário público: status omitido ou pendente_confirmacao.
--
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';
DO $preflight$
DECLARE v_total integer; v_insert_policies integer; v_policy record; v_status_def text;
BEGIN
  IF to_regclass('public.inscricoes_oficina') IS NULL
     OR to_regclass('public.portal_admins') IS NULL
  THEN RAISE EXCEPTION 'Legado obrigatório não encontrado'; END IF;

  SELECT count(*) INTO v_insert_policies
    FROM pg_policies WHERE schemaname='public'
      AND tablename='inscricoes_oficina' AND cmd='INSERT';
  IF v_insert_policies <> 1 THEN
    RAISE EXCEPTION 'Políticas INSERT mudaram; revisar antes de atuar';
  END IF;

  SELECT policyname, roles, with_check
    INTO v_policy FROM pg_policies
    WHERE schemaname='public' AND tablename='inscricoes_oficina'
      AND cmd='INSERT';
  IF v_policy.policyname IS DISTINCT FROM 'Permitir envio publico de fichas de inscricao'
    OR v_policy.roles IS DISTINCT FROM ARRAY['anon','authenticated']::name[]
    OR v_policy.with_check IS NULL
    OR v_policy.with_check NOT LIKE '%data_nascimento%'
  THEN RAISE EXCEPTION 'Pré-condições de RLS PROD mudaram'; END IF;

  SELECT column_default INTO v_status_def
   FROM information_schema.columns
   WHERE table_schema='public' AND table_name='inscricoes_oficina'
     AND column_name='status';
  IF v_status_def IS NULL OR v_status_def NOT LIKE '%pendente_confirmacao%'
  THEN RAISE EXCEPTION 'Padrão de status não é o esperado'; END IF;

  SELECT count(*) INTO v_total FROM public.inscricoes_oficina;
  IF v_total < 0 THEN RAISE EXCEPTION 'Contagem inválida'; END IF;
END; $preflight$;

-- ÚNICA ALTERAÇÃO PROPOSTA: preservar o recorte etário existente
-- e impedir inserir diretamente confirmado/matriculado ou outros estados.
ALTER POLICY "Permitir envio publico de fichas de inscricao"
ON public.inscricoes_oficina
WITH CHECK (
  status = 'pendente_confirmacao'
  AND data_nascimento <= (((now() AT TIME ZONE 'America/Bahia')::date - '14 years'::interval)::date)
);

DO $postcheck$
DECLARE v_cond text;
BEGIN
  SELECT with_check INTO v_cond FROM pg_policies
  WHERE schemaname='public' AND tablename='inscricoes_oficina'
    AND policyname='Permitir envio publico de fichas de inscricao' AND cmd='INSERT';
  IF v_cond NOT LIKE '%pendente_confirmacao%'
     OR v_cond NOT LIKE '%data_nascimento%'
  THEN RAISE EXCEPTION 'Revisão de política não confere'; END IF;
END; $postcheck$;

-- Ensaio sempre descartado. NUNCA substituir ROLLBACK sem rito específico.
ROLLBACK;
