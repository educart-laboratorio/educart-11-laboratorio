-- EDUCART 1.2 · TESTE TRANSACIONAL DE PAPEIS/RLS (somente Supabase DEV)
-- Projeto-alvo: esjrjzyvyhtzwgihcbsc. NÃO USAR EM PROD.
-- Execução manual auditada em 05/11/2026: PASS. NÃO executado pela CI.
-- O script gera contas sintéticas @example.invalid e DESCARTA TUDO com ROLLBACK.
-- Não remove dados pré-existentes, não envia email e não opera Pix real.
BEGIN;
SET LOCAL statement_timeout='20000';
DO $fixture$
DECLARE
 v_coord uuid:=gen_random_uuid(); v_sec uuid:=gen_random_uuid();
 v_aluno uuid:=gen_random_uuid(); v_intruso uuid:=gen_random_uuid();
 v_formacao uuid; v_turma uuid; v_inscricao uuid;
 v_email text:='hml-estudante-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid';
BEGIN
 INSERT INTO auth.users(id,email,aud,role,instance_id,created_at,updated_at,email_confirmed_at)
 VALUES
 (v_coord,'hml-coord-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000',now(),now(),now()),
 (v_sec,'hml-sec-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000',now(),now(),now()),
 (v_aluno,v_email,'authenticated','authenticated','00000000-0000-0000-0000-000000000000',now(),now(),now()),
 (v_intruso,'hml-intruso-'||replace(gen_random_uuid()::text,'-','')||'@example.invalid','authenticated','authenticated','00000000-0000-0000-0000-000000000000',now(),now(),now());
 INSERT INTO public.portal_admins(user_id) VALUES(v_coord),(v_sec);
 INSERT INTO public.equipe_papeis(user_id,papel) VALUES(v_coord,'coordenacao'),(v_sec,'secretaria');
 INSERT INTO public.formacoes(nome,tipo,publicada)
 VALUES('HML RLS AUTH ROLLBACK','curso',false) RETURNING id INTO v_formacao;
 INSERT INTO public.turmas(formacao_id,codigo,capacidade,situacao)
 VALUES(v_formacao,'HML-AUTH-RLS',1,'aberta') RETURNING id INTO v_turma;
 INSERT INTO public.inscricoes_oficina(nome_completo,data_nascimento,telefone_whatsapp,email,
  endereco_bairro,cidade_estado,objetivo,como_conheceu,turma_campanha,origem,status)
 VALUES('Estudante Sintética RLS',date '2001-08-13','71998765432',v_email,
  'HML','Salvador/BA','Teatro','Teste','HML-AUTH','HML-ROLLBACK','pendente_confirmacao')
 RETURNING id INTO v_inscricao;
 PERFORM set_config('educart.hml.coord',v_coord::text,true);
 PERFORM set_config('educart.hml.sec',v_sec::text,true);
 PERFORM set_config('educart.hml.aluno',v_aluno::text,true);
 PERFORM set_config('educart.hml.intruso',v_intruso::text,true);
 PERFORM set_config('educart.hml.inscricao',v_inscricao::text,true);
 PERFORM set_config('educart.hml.turma',v_turma::text,true);
END $fixture$;

-- Não usa a conta postgres para invocar RPC: executa como role authenticated,
-- exigindo os GRANTs reais, claims e RLS do usuário conectado.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('educart.hml.sec'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object(
 'sub',current_setting('educart.hml.sec'),'role','authenticated')::text,true);
DO $secretaria$
DECLARE rejeitou boolean:=false;
BEGIN
 BEGIN
  PERFORM 1 FROM public.educart_efetivar_matricula_unificada_dev(
   current_setting('educart.hml.inscricao')::uuid,
   current_setting('educart.hml.turma')::uuid,'bolsa',
   NULL,NULL,NULL,NULL,NULL,'BOLSA-CONFIRMADA-HML',true,NULL);
 EXCEPTION WHEN insufficient_privilege THEN rejeitou:=true;
 END;
 IF NOT rejeitou THEN RAISE EXCEPTION 'FALHA: Secretaria concedeu bolsa sozinha'; END IF;
END $secretaria$;

SELECT set_config('request.jwt.claim.sub',current_setting('educart.hml.coord'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object(
 'sub',current_setting('educart.hml.coord'),'role','authenticated')::text,true);
DO $coordenacao$
DECLARE matricula uuid; convite uuid;
BEGIN
 SELECT x.matricula_id,x.convite_id INTO matricula,convite
 FROM public.educart_efetivar_matricula_unificada_dev(
   current_setting('educart.hml.inscricao')::uuid,
   current_setting('educart.hml.turma')::uuid,'bolsa',
   NULL,NULL,NULL,NULL,NULL,'BOLSA-CONFIRMADA-HML',true,NULL) x;
 IF matricula IS NULL OR convite IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.educart_ingressos_dev WHERE matricula_id=matricula)
  OR NOT EXISTS(SELECT 1 FROM public.educart_emails_outbox_dev WHERE matricula_id=matricula)
 THEN RAISE EXCEPTION 'FALHA: Coordenacao sem matrícula/convite/outbox'; END IF;
 PERFORM set_config('educart.hml.matricula',matricula::text,true);
 PERFORM set_config('educart.hml.convite',convite::text,true);
END $coordenacao$;

SELECT set_config('request.jwt.claim.sub',current_setting('educart.hml.intruso'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object(
 'sub',current_setting('educart.hml.intruso'),'role','authenticated')::text,true);
DO $intruso$
DECLARE rejeitou boolean:=false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.educart_ingressos_dev)
  OR EXISTS(SELECT 1 FROM public.educart_convites_dev)
  OR EXISTS(SELECT 1 FROM public.educart_emails_outbox_dev)
  OR EXISTS(SELECT 1 FROM public.matriculas WHERE id=current_setting('educart.hml.matricula')::uuid)
 THEN RAISE EXCEPTION 'FALHA: intruso visualizou dados'; END IF;
 BEGIN
  PERFORM public.educart_ativar_convite_dev(current_setting('educart.hml.convite')::uuid);
 EXCEPTION WHEN insufficient_privilege THEN rejeitou:=true;
 END;
 IF NOT rejeitou THEN RAISE EXCEPTION 'FALHA: intruso ativou convite'; END IF;
END $intruso$;

SELECT set_config('request.jwt.claim.sub',current_setting('educart.hml.aluno'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object(
 'sub',current_setting('educart.hml.aluno'),'role','authenticated')::text,true);
DO $aluno$
DECLARE pessoa uuid;
BEGIN
 IF EXISTS(SELECT 1 FROM public.matriculas
    WHERE id=current_setting('educart.hml.matricula')::uuid)
 THEN RAISE EXCEPTION 'FALHA: aluno viu matrícula antes da ativação'; END IF;
 SELECT public.educart_ativar_convite_dev(current_setting('educart.hml.convite')::uuid)
 INTO pessoa;
 IF pessoa IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.matriculas
    WHERE id=current_setting('educart.hml.matricula')::uuid)
  OR EXISTS(SELECT 1 FROM public.educart_ingressos_dev)
  OR EXISTS(SELECT 1 FROM public.educart_emails_outbox_dev)
 THEN RAISE EXCEPTION 'FALHA: vínculo/privacidade após ativação'; END IF;
END $aluno$;
ROLLBACK;
SELECT 'PASS: bolsa apenas Coordenação, dados privados, convite seguro e RLS após ativação; rollback completo' AS resultado;
