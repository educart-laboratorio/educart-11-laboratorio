-- EducART 1.2 | SOMENTE Supabase DEV esjrjzyvyhtzwgihcbsc
-- Fluxo unificado: inscrição + Pix comprovado ou bolsa aprovada + turma
-- -> matrícula ativa + convite individual + aviso em outbox.
-- Proíbe uso em PROD. Não conecta/remete email sem provedor explícito.
BEGIN;

DO $preflight$
BEGIN
  IF current_database() IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'Conferir projeto Supabase antes de aplicar'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname='educart_interno_dev')
    OR to_regclass('public.inscricoes_oficina') IS NULL
    OR to_regclass('public.matriculas') IS NULL
    OR to_regclass('public.pessoas') IS NULL
    OR to_regclass('public.equipe_papeis') IS NULL
  THEN RAISE EXCEPTION 'Dependências do ambiente DEV ausentes'; END IF;
  IF to_regclass('public.educart_ingressos_dev') IS NOT NULL
    OR to_regclass('public.educart_convites_dev') IS NOT NULL
    OR to_regclass('public.educart_emails_outbox_dev') IS NOT NULL
  THEN RAISE EXCEPTION 'Migração já instalada: não reaplicar'; END IF;
END $preflight$;

-- O comprovante é sempre privado e só é enviado por operadores autenticados.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('educart-comprovantes-pix-dev','educart-comprovantes-pix-dev',false,5242880,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY educart_comprovante_equipe_upload_dev ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id='educart-comprovantes-pix-dev'
    AND name ~ '^inscricoes/[0-9a-f-]{36}/[a-z0-9_-]{6,90}\.(pdf|jpg|jpeg|png|webp)$'
    AND EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(select auth.uid()))
    AND EXISTS(SELECT 1 FROM public.equipe_papeis e
      WHERE e.user_id=(select auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
  );
CREATE POLICY educart_comprovante_equipe_ler_dev ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id='educart-comprovantes-pix-dev'
    AND EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(select auth.uid()))
    AND EXISTS(SELECT 1 FROM public.equipe_papeis e
      WHERE e.user_id=(select auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
  );

CREATE TABLE public.educart_ingressos_dev(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidatura_id uuid NOT NULL UNIQUE REFERENCES public.inscricoes_oficina(id) ON DELETE RESTRICT,
 matricula_id uuid NOT NULL UNIQUE REFERENCES public.matriculas(id) ON DELETE RESTRICT,
 modalidade text NOT NULL CHECK (modalidade IN ('pix','bolsa')),
 comprovante_path text,
 identificador_pix text,
 valor_centavos integer,
 ocorrido_em timestamptz,
 referencia_conferencia text,
 bolsa_referencia text,
 aprovado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 aprovado_em timestamptz NOT NULL DEFAULT now(),
 CHECK (
  (modalidade='pix' AND comprovante_path IS NOT NULL
   AND identificador_pix IS NOT NULL AND valor_centavos>0
   AND ocorrido_em IS NOT NULL AND length(btrim(referencia_conferencia)) BETWEEN 8 AND 200
   AND bolsa_referencia IS NULL)
  OR (modalidade='bolsa' AND comprovante_path IS NULL
   AND identificador_pix IS NULL AND valor_centavos IS NULL
   AND ocorrido_em IS NULL AND referencia_conferencia IS NULL
   AND length(btrim(bolsa_referencia)) BETWEEN 8 AND 200)
 )
);
CREATE UNIQUE INDEX educart_ingresso_pix_identificador_dev ON public.educart_ingressos_dev(identificador_pix)
WHERE identificador_pix IS NOT NULL;
ALTER TABLE public.educart_ingressos_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_ingressos_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_ingressos_dev TO authenticated;
CREATE POLICY educart_ingresso_gestao_ler_dev ON public.educart_ingressos_dev
 FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(select auth.uid()))
  AND EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(select auth.uid())
   AND e.papel IN ('secretaria','coordenacao'))
 );

CREATE TABLE public.educart_convites_dev(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 pessoa_id uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE RESTRICT,
 matricula_id uuid NOT NULL UNIQUE REFERENCES public.matriculas(id) ON DELETE RESTRICT,
 email_destinatario text NOT NULL,
 situacao text NOT NULL DEFAULT 'pendente' CHECK(situacao IN ('pendente','ativado','revogado')),
 criado_em timestamptz NOT NULL DEFAULT now(),
 expira_em timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
 ativado_em timestamptz,
 CHECK (expira_em>criado_em)
);
CREATE INDEX educart_convites_pessoa_dev_idx ON public.educart_convites_dev(pessoa_id);
ALTER TABLE public.educart_convites_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_convites_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_convites_dev TO authenticated;
CREATE POLICY educart_convite_gestao_ler_dev ON public.educart_convites_dev
 FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(select auth.uid()))
  AND EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(select auth.uid())
   AND e.papel IN ('secretaria','coordenacao'))
 );

CREATE TABLE public.educart_emails_outbox_dev (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 matricula_id uuid NOT NULL UNIQUE REFERENCES public.matriculas(id) ON DELETE RESTRICT,
 convite_id uuid NOT NULL UNIQUE REFERENCES public.educart_convites_dev(id) ON DELETE RESTRICT,
 destinatario text NOT NULL,
 tipo text NOT NULL DEFAULT 'boas_vindas_minha_educart',
 estado text NOT NULL DEFAULT 'aguarda_integracao' CHECK (estado IN ('aguarda_integracao','pendente','enviando','enviado','falhou')),
 criado_em timestamptz NOT NULL DEFAULT now(),
 enviado_em timestamptz,
 tentativas integer NOT NULL DEFAULT 0 CHECK(tentativas>=0)
);
ALTER TABLE public.educart_emails_outbox_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_emails_outbox_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_emails_outbox_dev TO authenticated;
CREATE POLICY educart_email_gestao_ler_dev ON public.educart_emails_outbox_dev
 FOR SELECT TO authenticated USING (
  EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(select auth.uid()))
  AND EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(select auth.uid())
   AND e.papel IN ('secretaria','coordenacao'))
 );

-- Função interna privilegiada, NÃO exposta pela Data API. A validação de
-- auth.uid/portal_admins/papel ocorre antes de toda escrita. A RPC pública
-- é SECURITY INVOKER e apenas delega a este contrato auditado.
CREATE FUNCTION educart_interno_dev.efetivar_matricula_unificada(
 p_candidatura_id uuid, p_turma_id uuid, p_modalidade text,
 p_comprovante_path text, p_valor_centavos integer,
 p_identificador_pix text, p_ocorrido_em timestamptz,
 p_referencia_conferencia text, p_bolsa_referencia text,
 p_confirmei_documentacao boolean, p_pessoa_existente_id uuid
) RETURNS TABLE(matricula_id uuid,convite_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,extensions,pg_temp AS $$
DECLARE
 v_uid uuid:=auth.uid(); v_c public.inscricoes_oficina%rowtype;
 v_t public.turmas%rowtype; v_p public.pessoas%rowtype;
 v_m public.matriculas%rowtype; v_pix_id uuid; v_convite uuid;
 v_occup integer; v_coord boolean; v_email text; v_tel text;
 v_auth_account boolean;
BEGIN
 IF v_uid IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false')='true'
  OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
  OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid
    AND e.papel IN ('secretaria','coordenacao'))
 THEN RAISE EXCEPTION 'Somente Secretaria ou Coordenação autorizada' USING errcode='42501'; END IF;
 v_coord:=EXISTS(SELECT 1 FROM public.equipe_papeis e
   WHERE e.user_id=v_uid AND e.papel='coordenacao');
 IF p_confirmei_documentacao IS DISTINCT FROM true
  OR p_modalidade NOT IN ('pix','bolsa')
 THEN RAISE EXCEPTION 'Conferência e modalidade obrigatórias' USING errcode='22023'; END IF;
 IF p_modalidade='bolsa' AND NOT v_coord THEN
   RAISE EXCEPTION 'Bolsas exigem autorização da Coordenação' USING errcode='42501'; END IF;
 IF p_modalidade='bolsa' AND (
   length(btrim(coalesce(p_bolsa_referencia,''))) NOT BETWEEN 8 AND 200
   OR p_comprovante_path IS NOT NULL OR p_identificador_pix IS NOT NULL)
 THEN RAISE EXCEPTION 'Bolsa precisa de autorização registrada sem Pix' USING errcode='22023'; END IF;
 IF p_modalidade='pix' AND (
   p_comprovante_path IS NULL
   OR p_comprovante_path !~ ('^inscricoes/'||p_candidatura_id::text||'/[a-z0-9_-]{6,90}\.(pdf|jpg|jpeg|png|webp)$')
   OR p_valor_centavos IS NULL OR p_valor_centavos<1 OR p_valor_centavos>100000000
   OR length(btrim(coalesce(p_identificador_pix,''))) NOT BETWEEN 8 AND 100
   OR btrim(p_identificador_pix)<>p_identificador_pix
   OR p_ocorrido_em IS NULL OR p_ocorrido_em>now()+interval '5 minutes'
   OR length(btrim(coalesce(p_referencia_conferencia,''))) NOT BETWEEN 8 AND 200
 ) THEN RAISE EXCEPTION 'Comprovante, Pix e referência de extrato obrigatórios' USING errcode='22023'; END IF;
 IF p_modalidade='pix' AND NOT EXISTS(
   SELECT 1 FROM storage.objects o WHERE o.bucket_id='educart-comprovantes-pix-dev'
     AND o.name=p_comprovante_path
 ) THEN RAISE EXCEPTION 'Comprovante privado não localizado no Storage DEV' USING errcode='22023'; END IF;

 SELECT * INTO v_c FROM public.inscricoes_oficina WHERE id=p_candidatura_id FOR UPDATE;
 IF NOT FOUND OR v_c.status IN ('cancelado','matriculado') THEN
  RAISE EXCEPTION 'Inscrição ausente ou já finalizada' USING errcode='22023'; END IF;
 SELECT * INTO v_t FROM public.turmas WHERE id=p_turma_id FOR UPDATE;
 IF NOT FOUND OR v_t.situacao NOT IN ('planejada','aberta','em_andamento') THEN
  RAISE EXCEPTION 'Turma indisponível' USING errcode='22023'; END IF;
 SELECT * INTO v_m FROM public.matriculas WHERE candidatura_id=p_candidatura_id FOR UPDATE;
 IF FOUND AND (v_m.situacao<>'pendente' OR v_m.turma_id<>p_turma_id) THEN
  RAISE EXCEPTION 'Esta inscrição já possui matrícula incompatível' USING errcode='23505'; END IF;
 SELECT count(*) INTO v_occup FROM public.matriculas m
  WHERE m.turma_id=p_turma_id AND m.situacao IN ('pendente','ativa');
 IF v_t.capacidade IS NOT NULL
  AND v_occup >= v_t.capacidade
  AND v_m.id IS NULL THEN
  RAISE EXCEPTION 'Turma sem vagas' USING errcode='23514'; END IF;

 PERFORM pg_advisory_xact_lock(hashtextextended('educart-dev-reconciliacao-pessoas',0));
 v_email:=lower(btrim(v_c.email));
 v_tel:=regexp_replace(coalesce(v_c.telefone_whatsapp,''),'[^0-9]','','g');
 IF v_m.id IS NOT NULL THEN
   SELECT * INTO v_p FROM public.pessoas WHERE id=v_m.pessoa_id FOR UPDATE;
 ELSIF p_pessoa_existente_id IS NOT NULL THEN
   SELECT * INTO v_p FROM public.pessoas WHERE id=p_pessoa_existente_id FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Cadastro indicado não encontrado' USING errcode='22023'; END IF;
 ELSE
   IF EXISTS(SELECT 1 FROM public.pessoas p WHERE
     lower(btrim(coalesce(p.email,'')))=v_email OR
     regexp_replace(coalesce(p.telefone,''),'[^0-9]','','g')=v_tel)
   THEN RAISE EXCEPTION 'Pessoa possivelmente existente: selecione após conferência' USING errcode='23505'; END IF;
   INSERT INTO public.pessoas(nome_completo,email,telefone,data_nascimento,cidade,bairro)
   VALUES (v_c.nome_completo,v_c.email,v_c.telefone_whatsapp,v_c.data_nascimento,
     v_c.cidade_estado,v_c.endereco_bairro)
   RETURNING * INTO v_p;
 END IF;
 IF v_p.id IS NULL OR
   lower(btrim(v_p.nome_completo))<>lower(btrim(v_c.nome_completo)) OR
   (v_p.data_nascimento IS NOT NULL AND v_p.data_nascimento<>v_c.data_nascimento)
   OR NOT (
     (v_email<>'' AND lower(btrim(coalesce(v_p.email,'')))=v_email)
     OR (v_tel<>'' AND regexp_replace(coalesce(v_p.telefone,''),'[^0-9]','','g')=v_tel)
   )
 THEN RAISE EXCEPTION 'Pessoa divergente: revisar identidade antes da matrícula' USING errcode='22023'; END IF;

 IF v_m.id IS NULL THEN
   INSERT INTO public.matriculas(pessoa_id,turma_id,candidatura_id,origem,situacao)
   VALUES(v_p.id,p_turma_id,p_candidatura_id,'novo','pendente')
   RETURNING * INTO v_m;
 END IF;
 -- O estado pendente intermediário existe apenas DENTRO desta transação,
 -- nunca exige outra tela ou Pix prévio amarrado a matrícula.
 PERFORM set_config('educart.pix_conferencia_rpc','true',true);
 IF p_modalidade='pix' THEN
   INSERT INTO public.educart_pix_manuais(
     matricula_id,finalidade,valor_centavos,identificador_pix,ocorrido_em,
     descricao,registrado_por,situacao
   ) VALUES(v_m.id,'matricula',p_valor_centavos,p_identificador_pix,
     p_ocorrido_em,'Ingresso unificado com comprovante privado',v_uid,'registrado')
   RETURNING id INTO v_pix_id;
   UPDATE public.educart_pix_manuais SET
     situacao='conferido',conferido_por=v_uid,conferido_em=now(),
     referencia_conferencia=btrim(p_referencia_conferencia)
     WHERE id=v_pix_id AND situacao='registrado';
   IF NOT FOUND THEN RAISE EXCEPTION 'Conferência Pix não persistiu'; END IF;
 END IF;
 UPDATE public.matriculas SET situacao='ativa',
   ingresso_em=coalesce(ingresso_em,(now() at time zone 'America/Bahia')::date)
 WHERE id=v_m.id AND situacao='pendente';
 IF NOT FOUND THEN RAISE EXCEPTION 'Matrícula não ativada'; END IF;
 UPDATE public.inscricoes_oficina SET status='matriculado'
   WHERE id=p_candidatura_id AND status<>'matriculado';
 IF NOT FOUND THEN RAISE EXCEPTION 'Inscrição não reconciliada'; END IF;

 INSERT INTO public.educart_ingressos_dev(
  candidatura_id,matricula_id,modalidade,comprovante_path,
  identificador_pix,valor_centavos,ocorrido_em,referencia_conferencia,
  bolsa_referencia,aprovado_por
 ) VALUES(p_candidatura_id,v_m.id,p_modalidade,p_comprovante_path,
   p_identificador_pix,p_valor_centavos,p_ocorrido_em,p_referencia_conferencia,
   p_bolsa_referencia,v_uid);
 v_auth_account:=v_p.auth_user_id IS NOT NULL;
 INSERT INTO public.educart_convites_dev(pessoa_id,matricula_id,email_destinatario,
  situacao,ativado_em)
 VALUES(v_p.id,v_m.id,v_email,
   CASE WHEN v_auth_account THEN 'ativado' ELSE 'pendente' END,
   CASE WHEN v_auth_account THEN now() ELSE NULL END)
 RETURNING id INTO v_convite;
 INSERT INTO public.educart_emails_outbox_dev(matricula_id,convite_id,destinatario)
 VALUES(v_m.id,v_convite,v_email);
 -- Mensagem ainda NÃO foi enviada: aguarda integração de provedor.
 RETURN QUERY SELECT v_m.id,v_convite;
END; $$;
REVOKE ALL ON FUNCTION educart_interno_dev.efetivar_matricula_unificada(
 uuid,uuid,text,text,integer,text,timestamptz,text,text,boolean,uuid) FROM PUBLIC,anon,authenticated;

GRANT USAGE ON SCHEMA educart_interno_dev TO authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_dev.efetivar_matricula_unificada(
 uuid,uuid,text,text,integer,text,timestamptz,text,text,boolean,uuid) TO authenticated;

CREATE FUNCTION public.educart_efetivar_matricula_unificada_dev(
 p_candidatura_id uuid,p_turma_id uuid,p_modalidade text,
 p_comprovante_path text DEFAULT NULL,p_valor_centavos integer DEFAULT NULL,
 p_identificador_pix text DEFAULT NULL,p_ocorrido_em timestamptz DEFAULT NULL,
 p_referencia_conferencia text DEFAULT NULL,p_bolsa_referencia text DEFAULT NULL,
 p_confirmei_documentacao boolean DEFAULT false,p_pessoa_existente_id uuid DEFAULT NULL
) RETURNS TABLE(matricula_id uuid,convite_id uuid)
LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
  SELECT * FROM educart_interno_dev.efetivar_matricula_unificada(
    p_candidatura_id,p_turma_id,p_modalidade,p_comprovante_path,p_valor_centavos,
    p_identificador_pix,p_ocorrido_em,p_referencia_conferencia,
    p_bolsa_referencia,p_confirmei_documentacao,p_pessoa_existente_id
  );
$$;
REVOKE ALL ON FUNCTION public.educart_efetivar_matricula_unificada_dev(
 uuid,uuid,text,text,integer,text,timestamptz,text,text,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.educart_efetivar_matricula_unificada_dev(
 uuid,uuid,text,text,integer,text,timestamptz,text,text,boolean,uuid) TO authenticated;

-- Ativação: convite NÃO autentica. Exige login/conta e email confirmado,
-- igualdade entre email da conta e pessoa e matrícula ativa.
CREATE FUNCTION educart_interno_dev.ativar_convite(
 p_convite_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_conv public.educart_convites_dev%rowtype;
 v_p public.pessoas%rowtype; v_email text; v_verificado timestamptz;
BEGIN
 IF v_uid IS NULL OR coalesce(auth.jwt()->>'is_anonymous','false')='true' THEN
  RAISE EXCEPTION 'Autenticação pessoal obrigatória' USING errcode='42501'; END IF;
 SELECT lower(btrim(email)),email_confirmed_at INTO v_email,v_verificado
 FROM auth.users WHERE id=v_uid;
 IF v_email IS NULL OR v_verificado IS NULL THEN
  RAISE EXCEPTION 'Confirme seu email para ativar' USING errcode='42501'; END IF;
 SELECT * INTO v_conv FROM public.educart_convites_dev
  WHERE id=p_convite_id FOR UPDATE;
 IF NOT FOUND OR v_conv.situacao='revogado'
  OR (v_conv.situacao='pendente' AND v_conv.expira_em<=now()) THEN
   RAISE EXCEPTION 'Convite inválido ou expirado' USING errcode='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.matriculas m
   WHERE m.id=v_conv.matricula_id AND m.pessoa_id=v_conv.pessoa_id
     AND m.situacao='ativa') THEN
   RAISE EXCEPTION 'Matrícula não ativa' USING errcode='42501'; END IF;
 SELECT * INTO v_p FROM public.pessoas WHERE id=v_conv.pessoa_id FOR UPDATE;
 IF NOT FOUND OR lower(btrim(coalesce(v_p.email,'')))<>v_email
  OR lower(btrim(v_conv.email_destinatario))<>v_email
  OR (v_p.auth_user_id IS NOT NULL AND v_p.auth_user_id<>v_uid)
 THEN RAISE EXCEPTION 'Identidade da conta não corresponde à matrícula' USING errcode='42501'; END IF;
 UPDATE public.pessoas SET auth_user_id=v_uid
 WHERE id=v_p.id AND auth_user_id IS NULL;
 UPDATE public.educart_convites_dev
   SET situacao='ativado',ativado_em=coalesce(ativado_em,now())
 WHERE id=p_convite_id AND situacao<>'revogado';
 RETURN v_p.id;
END; $$;
REVOKE ALL ON FUNCTION educart_interno_dev.ativar_convite(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_dev.ativar_convite(uuid) TO authenticated;
CREATE FUNCTION public.educart_ativar_convite_dev(p_convite_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT educart_interno_dev.ativar_convite(p_convite_id);
$$;
REVOKE ALL ON FUNCTION public.educart_ativar_convite_dev(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.educart_ativar_convite_dev(uuid) TO authenticated;

COMMENT ON TABLE public.educart_ingressos_dev IS
 'EducART DEV: comprovação Pix privada ou bolsa autorizada, em uma transação com matrícula ativa.';
COMMENT ON TABLE public.educart_emails_outbox_dev IS
 'EducART DEV: fila de email ainda SEM PROVEDOR e SEM ENVIO REAL; estado aguarda_integracao.';
COMMENT ON TABLE public.educart_convites_dev IS
 'EducART DEV: convite não substitui autenticação, requer email confirmado igual ao cadastro e matrícula ativa.';
COMMIT;
