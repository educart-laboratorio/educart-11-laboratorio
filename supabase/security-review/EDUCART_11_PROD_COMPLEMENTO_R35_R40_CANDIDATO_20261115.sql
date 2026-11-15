-- EducART 1.1 / PR #19 — complemento candidato para propostas docentes R35/R40.
-- FONTE: supabase/migrations/20261114205000_educart_r35_propostas_solucoes_docentes_dev.sql
--        supabase/migrations/20261114224701_educart_r40_fotos_propostas_docentes_privadas_dev.sql
-- REVISÃO TÉCNICA SOMENTE. NÃO APLICAR NO PROD NESTA FASE.
-- Execução futura: APÓS migração acadêmica aditiva, validação RLS, backup
-- restaurado, aprovação nominal da direção e janela de mudança.
-- Não contém dados do DEV, não concede papéis e não altera inscrições legadas.
-- O portal só pode ativar NEXT_PUBLIC_EDUCART_PROPOSTAS_DOCENTES_APROVADAS=true
-- APÓS validação HTTP/Auth/RLS/Storage no PROD. Nenhuma flag substitui RLS.

BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '120s';

DO $preflight$
DECLARE v_inscricoes bigint; v_admins bigint;
BEGIN
  IF current_setting('educart.autorizacao_prod_11',true) IS DISTINCT FROM 'DIRECAO_LIBEROU_IMPLANTACAO'
     OR current_setting('educart.backup_restaurado_11',true) IS DISTINCT FROM 'RESTAURACAO_TESTADA'
     OR current_setting('educart.autorizacao_propostas_11',true) IS DISTINCT FROM 'DIRECAO_APROVOU_PROPOSTAS'
  THEN RAISE EXCEPTION 'Propostas R35/R40 bloqueadas: autorização, restauração ou escopo ausente'; END IF;

  IF to_regclass('public.inscricoes_oficina') IS NULL
     OR to_regclass('public.portal_admins') IS NULL
     OR to_regclass('public.equipe_papeis') IS NULL
     OR to_regclass('auth.users') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR to_regclass('storage.buckets') IS NULL
  THEN RAISE EXCEPTION 'Pré-requisitos Auth, RLS, legado, acadêmico ou Storage ausentes'; END IF;

  IF to_regclass('public.educart_propostas_solucoes_docentes_dev') IS NOT NULL
     OR EXISTS (SELECT 1 FROM storage.buckets WHERE id='educart-fotos-propostas-docentes-dev')
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
        AND policyname IN ('educart_r40_docentes_foto_anon_insert_dev','educart_r40_docentes_foto_coord_select_dev'))
  THEN RAISE EXCEPTION 'R35/R40 já existe: revisar divergência e não reaplicar cegamente'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.equipe_papeis'::regclass AND relrowsecurity)
     OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.portal_admins'::regclass AND relrowsecurity)
  THEN RAISE EXCEPTION 'Tabelas de autorização sem RLS'; END IF;

  -- Não liberar recepção pública se ninguém puder legitimamente consultar.
  IF NOT EXISTS (
    SELECT 1 FROM public.equipe_papeis e
    JOIN public.portal_admins a ON a.user_id=e.user_id
    JOIN auth.users u ON u.id=e.user_id
    WHERE e.papel='coordenacao' AND u.email_confirmed_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Não existe coordenação administrativa confirmada'; END IF;

  SELECT count(*) INTO v_inscricoes FROM public.inscricoes_oficina;
  SELECT count(*) INTO v_admins FROM public.portal_admins;
  PERFORM set_config('educart.r35_snapshot_inscricoes',v_inscricoes::text,true);
  PERFORM set_config('educart.r35_snapshot_admins',v_admins::text,true);
END $preflight$;

-- R35: os dados de propostas ficam privados à Coordenação; apenas INSERT
-- anônimo de nova proposta é permitido, sem publicar/contratar/criar turma.
CREATE TABLE public.educart_propostas_solucoes_docentes_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_professor text NOT NULL CHECK (char_length(btrim(nome_professor)) BETWEEN 3 AND 150),
  email text CHECK (email IS NULL OR (char_length(email) <= 254
    AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  whatsapp text CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 30),
  proposta jsonb NOT NULL CHECK (jsonb_typeof(proposta)='object' AND char_length(proposta::text) <= 45000),
  estado text NOT NULL DEFAULT 'pendente_analise' CHECK (estado='pendente_analise'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (NULLIF(btrim(coalesce(email,'')),'') IS NOT NULL
    OR NULLIF(btrim(coalesce(whatsapp,'')),'') IS NOT NULL),
  CHECK (length(btrim(coalesce(proposta->>'nome',''))) BETWEEN 3 AND 120),
  CHECK (proposta->>'tipo' IN ('curso','oficina','aula','solucao'))
);
CREATE INDEX educart_propostas_docentes_criado_em_dev_idx
  ON public.educart_propostas_solucoes_docentes_dev(criado_em DESC);
ALTER TABLE public.educart_propostas_solucoes_docentes_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_propostas_solucoes_docentes_dev FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.educart_propostas_solucoes_docentes_dev TO anon;
GRANT SELECT ON public.educart_propostas_solucoes_docentes_dev TO authenticated;
CREATE POLICY educart_propostas_docentes_enviar_anon_dev
 ON public.educart_propostas_solucoes_docentes_dev
 FOR INSERT TO anon WITH CHECK (estado='pendente_analise');
CREATE POLICY educart_propostas_docentes_ler_coord_dev
 ON public.educart_propostas_solucoes_docentes_dev
 FOR SELECT TO authenticated USING (
   auth.uid() IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=auth.uid())
   AND EXISTS (SELECT 1 FROM public.equipe_papeis e
               WHERE e.user_id=auth.uid() AND e.papel='coordenacao')
 );

-- R40: imagens são privadas, no máximo 8 MiB, restritas a MIME e caminho.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('educart-fotos-propostas-docentes-dev',
        'educart-fotos-propostas-docentes-dev',
        false,8388608,ARRAY['image/jpeg','image/png','image/webp']);

CREATE POLICY educart_r40_docentes_foto_anon_insert_dev
 ON storage.objects FOR INSERT TO anon WITH CHECK (
   bucket_id='educart-fotos-propostas-docentes-dev'
   AND name ~ '^propostas/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/foto\.(jpg|png|webp)$'
 );
CREATE POLICY educart_r40_docentes_foto_coord_select_dev
 ON storage.objects FOR SELECT TO authenticated USING (
   bucket_id='educart-fotos-propostas-docentes-dev'
   AND auth.uid() IS NOT NULL
   AND EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
   AND EXISTS (SELECT 1 FROM public.equipe_papeis e
               WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
 );

-- Invariantes pós-DDL. Nenhuma identidade ou inscrição é modificada.
DO $postcheck$
DECLARE v_total bigint; v_admins bigint;
BEGIN
  SELECT count(*) INTO v_total FROM public.inscricoes_oficina;
  SELECT count(*) INTO v_admins FROM public.portal_admins;
  IF v_total::text IS DISTINCT FROM current_setting('educart.r35_snapshot_inscricoes',true)
    OR v_admins::text IS DISTINCT FROM current_setting('educart.r35_snapshot_admins',true)
  THEN RAISE EXCEPTION 'Contagens históricas alteradas — reversão da transação'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid='public.educart_propostas_solucoes_docentes_dev'::regclass AND relrowsecurity)
    OR NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='educart-fotos-propostas-docentes-dev' AND public=false)
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='educart_propostas_solucoes_docentes_dev' AND cmd='INSERT')
    OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
       AND tablename='educart_propostas_solucoes_docentes_dev' AND cmd='SELECT')
  THEN RAISE EXCEPTION 'R35/R40 não passou no pós-check'; END IF;
END $postcheck$;
COMMIT;
