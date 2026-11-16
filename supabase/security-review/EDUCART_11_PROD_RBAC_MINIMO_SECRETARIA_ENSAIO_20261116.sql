-- SUPER GSI TC18 | CANDIDATA RBAC MINIMA PARA SECRETARIA LEGADA
-- SOMENTE ENSAIO: ROLLBACK OBRIGATORIO, nao aplicar em PROD/DEV.
-- Diferente da candidata academica de 13 tabelas, cria somente equipe_papeis
-- para o portal legado; reforca INSERT publico e UPDATE de inscricoes.
-- Nao cria contas Auth; exige UID+email da coordenacao aprovados, usuario Auth confirmado e ja em portal_admins.
-- Ensaio pode atribuir SOMENTE esse papel no banco descartavel; ROLLBACK obrigatorio.
-- Flags sao portoes de seguranca, NAO evidencias substitutas de autorizacao
-- expressa e backup real restaurado; futura migracao requer CLI e revisao.
BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='40s';
DO $gate$
DECLARE p record; n bigint; a bigint; coordenador_uid uuid; coordenador_email text;
BEGIN
 IF current_setting('educart.tc18_aprovacao',true) IS DISTINCT FROM 'DIRECAO_LIBEROU_FASE_MINIMA'
 OR current_setting('educart.tc18_restore',true) IS DISTINCT FROM 'RESTAURACAO_TESTADA'
 THEN RAISE EXCEPTION 'TC18: autorizacao e restauracao nao comprovadas'; END IF;
 coordenador_uid := NULLIF(current_setting('educart.tc18_coordenador_uid',true),'')::uuid;
 IF coordenador_uid IS NULL
 THEN RAISE EXCEPTION 'TC18: coordenador UID aprovado ausente'; END IF;
 -- Exigir email nominal de identidade Auth confirmada. A associacao em
 -- portal_admins sozinha nao atribui autoridade de Coordenacao.
 coordenador_email := NULLIF(lower(btrim(current_setting('educart.tc18_coordenador_email',true))), '');
 IF coordenador_email IS NULL OR coordenador_email !~ '^[^@[:space:]]+@[^@[:space:]]+$'
 THEN RAISE EXCEPTION 'TC18: email de coordenacao aprovado ausente'; END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.portal_admins pa JOIN auth.users u ON u.id=pa.user_id
   WHERE pa.user_id=coordenador_uid AND lower(btrim(u.email))=coordenador_email
     AND u.email_confirmed_at IS NOT NULL
 ) THEN RAISE EXCEPTION 'TC18: coordenador sem identidade Auth confirmada ou vinculo'; END IF;
 IF to_regclass('public.equipe_papeis') IS NOT NULL
 THEN RAISE EXCEPTION 'TC18: tabela equipe_papeis ja existe'; END IF;
 IF to_regclass('public.inscricoes_oficina') IS NULL
 OR to_regclass('public.portal_admins') IS NULL
 OR to_regclass('public.perfis_administrativos_oficina') IS NULL
 OR to_regclass('auth.users') IS NULL
 THEN RAISE EXCEPTION 'TC18: legado PROD exigido ausente'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
  AND tablename='inscricoes_oficina' AND cmd='INSERT')<>1
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='public'
  AND tablename='inscricoes_oficina' AND cmd='UPDATE')<>1
 THEN RAISE EXCEPTION 'TC18: quantidade de policies divergiu'; END IF;
 SELECT * INTO p FROM pg_policies WHERE schemaname='public'
   AND tablename='inscricoes_oficina' AND cmd='INSERT';
 IF p.policyname IS DISTINCT FROM 'Permitir envio publico de fichas de inscricao'
 OR p.roles IS DISTINCT FROM ARRAY['anon','authenticated']::name[]
 OR p.with_check NOT LIKE '%data_nascimento%'
 OR p.with_check LIKE '%pendente_confirmacao%'
 THEN RAISE EXCEPTION 'TC18: INSERT PROD nao corresponde ao historico'; END IF;
 SELECT * INTO p FROM pg_policies WHERE schemaname='public'
  AND tablename='inscricoes_oficina' AND cmd='UPDATE';
 IF p.policyname IS DISTINCT FROM 'educart_admin_update_inscricoes'
 OR p.roles IS DISTINCT FROM ARRAY['authenticated']::name[]
 OR p.qual NOT LIKE '%portal_admins%'
 THEN RAISE EXCEPTION 'TC18: UPDATE PROD nao corresponde ao historico'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.inscricoes_oficina'::regclass AND relrowsecurity)
 OR NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.portal_admins'::regclass AND relrowsecurity)
 THEN RAISE EXCEPTION 'TC18: RLS legado desativado'; END IF;
 IF NOT EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='inscricoes_oficina'
    AND column_name='status' AND column_default LIKE '%pendente_confirmacao%')
 THEN RAISE EXCEPTION 'TC18: status default divergente'; END IF;
 SELECT count(*) INTO n FROM public.inscricoes_oficina;
 SELECT count(*) INTO a FROM public.portal_admins;
 IF a<1 THEN RAISE EXCEPTION 'TC18: nao ha admin legado'; END IF;
 PERFORM set_config('educart.tc18_n',n::text,true);
 PERFORM set_config('educart.tc18_a',a::text,true);
END $gate$;

CREATE TABLE public.equipe_papeis(
 user_id uuid NOT NULL,
 papel text NOT NULL CHECK(papel IN ('secretaria','coordenacao')),
 atribuido_em timestamptz NOT NULL DEFAULT now(),
 atribuido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 PRIMARY KEY(user_id,papel),
 FOREIGN KEY(user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.equipe_papeis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipe_papeis FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.equipe_papeis TO authenticated;
CREATE POLICY educart_equipe_papeis_ler_proprios ON public.equipe_papeis
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
-- Provisionamento atomico: jamais retirar o UPDATE do admin sem atribuir o
-- papel aprovado na MESMA transacao, impedindo perda de funcao legada.
INSERT INTO public.equipe_papeis(user_id,papel)
 VALUES (current_setting('educart.tc18_coordenador_uid',true)::uuid,'coordenacao');

ALTER POLICY "Permitir envio publico de fichas de inscricao"
 ON public.inscricoes_oficina WITH CHECK (
 status='pendente_confirmacao' AND
 data_nascimento <= (((now() AT TIME ZONE 'America/Bahia')::date - '14 years'::interval)::date)
);
ALTER POLICY educart_admin_update_inscricoes ON public.inscricoes_oficina
 USING (
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.equipe_papeis p WHERE p.user_id=(SELECT auth.uid()) AND p.papel='coordenacao')
 )
 WITH CHECK (
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.equipe_papeis p WHERE p.user_id=(SELECT auth.uid()) AND p.papel='coordenacao')
 );
DO $post$
BEGIN
 IF (SELECT count(*) FROM public.inscricoes_oficina)::text IS DISTINCT FROM current_setting('educart.tc18_n',true)
 OR (SELECT count(*) FROM public.portal_admins)::text IS DISTINCT FROM current_setting('educart.tc18_a',true)
 OR (SELECT count(*) FROM public.equipe_papeis)<>1
 OR NOT EXISTS (SELECT 1 FROM public.equipe_papeis
   WHERE user_id=current_setting('educart.tc18_coordenador_uid',true)::uuid
     AND papel='coordenacao')
 THEN RAISE EXCEPTION 'TC18: dados legados ou papel atomico divergente'; END IF;
 IF has_table_privilege('anon','public.equipe_papeis','SELECT')
 OR has_table_privilege('authenticated','public.equipe_papeis','INSERT')
 OR NOT has_table_privilege('authenticated','public.equipe_papeis','SELECT')
 THEN RAISE EXCEPTION 'TC18: GRANT indevido'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid='public.equipe_papeis'::regclass AND relrowsecurity)
 THEN RAISE EXCEPTION 'TC18: RLS da equipe ausente'; END IF;
END $post$;
-- O ROLLBACK e INVIOLAVEL no artefato de revisao.
ROLLBACK;
