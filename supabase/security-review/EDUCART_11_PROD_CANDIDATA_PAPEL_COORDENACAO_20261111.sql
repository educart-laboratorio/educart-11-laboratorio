-- EducART 1.1 — PROVISIONAMENTO PARAMETRIZADO DE COORDENAÇÃO (REVISÃO).
-- NÃO EXECUTAR SEM APROVAÇÃO ESPECÍFICA DO TITULAR E PROVA DA IDENTIDADE.
-- Executar SOMENTE depois da migração acadêmica validada e backup/restauração.
-- Não contém nem divulga identificadores de usuários reais.
-- Requer na MESMA sessão, configurado expressamente por operador autorizado:
--   SET educart.autorizacao_papel_11 = 'DIRECAO_APROVOU_IDENTIDADE';
--   SET educart.coordenacao_auth_uid_11 = '<UUID CONFIRMADO DE auth.users>';
-- Cuidado: não basta ser o único administrador; identidade acadêmica deve
-- ser confirmada pela Coordenação / Direção antes de conceder papel.
-- Este script não cria contas, convites ou dados escolares.
BEGIN;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='30s';
DO $autorizar$
DECLARE v_uid uuid; v_count integer;
BEGIN
 IF current_setting('educart.autorizacao_papel_11',true)
    IS DISTINCT FROM 'DIRECAO_APROVOU_IDENTIDADE'
 THEN RAISE EXCEPTION 'Papel bloqueado: identidade não aprovada pela Direção'; END IF;
 v_uid:=nullif(current_setting('educart.coordenacao_auth_uid_11',true),'')::uuid;
 IF v_uid IS NULL THEN RAISE EXCEPTION 'ID Auth nominal ausente'; END IF;
 IF to_regclass('public.equipe_papeis') IS NULL OR
    to_regclass('public.portal_admins') IS NULL OR
    to_regclass('auth.users') IS NULL
 THEN RAISE EXCEPTION 'Banco acadêmico ou legado Auth incompleto'; END IF;
 SELECT count(*) INTO v_count
 FROM auth.users u JOIN public.portal_admins p ON p.user_id=u.id
 WHERE u.id=v_uid;
 IF v_count<>1 THEN RAISE EXCEPTION 'Conta não corresponde a Auth + portal_admins validado'; END IF;
 INSERT INTO public.equipe_papeis(user_id,papel,atribuido_por)
 VALUES(v_uid,'coordenacao',NULL)
 ON CONFLICT(user_id,papel) DO NOTHING;
 IF NOT EXISTS(
    SELECT 1 FROM public.equipe_papeis
    WHERE user_id=v_uid AND papel='coordenacao'
 ) THEN RAISE EXCEPTION 'Papel não ficou persistido'; END IF;
END;
$autorizar$;
COMMIT;
