-- EducART 1.1 — proposta DEV: portal individual privado, consentimento e vinculação auditada.
-- APLICAR SOMENTE NO DATABASE-DEV esjrjzyvyhtzwgihcbsc após revisão.
-- Não mover para migrations comuns nem aplicar em database-prod.
-- Preserva todas as tabelas e políticas já existentes; somente adições com preflight.

DO $preflight$
BEGIN
 IF to_regclass('public.educart_solicitacoes_vinculo_dev') IS NOT NULL
    OR to_regclass('public.educart_fotos_consentimento_dev') IS NOT NULL
    OR EXISTS(select 1 from storage.buckets where id='educart-foto-individual-dev')
 THEN RAISE EXCEPTION 'Estrutura da 1.1 já existe — não reaplicar'; END IF;
 IF to_regclass('public.pessoas') IS NULL OR to_regclass('public.portal_admins') IS NULL
    OR to_regclass('public.equipe_papeis') IS NULL THEN
    RAISE EXCEPTION 'Dependências acadêmicas ou de RBAC ausentes'; END IF;
END $preflight$;

CREATE TABLE public.educart_solicitacoes_vinculo_dev (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  email_declarado text not null check(length(email_declarado) between 5 and 320),
  nome_declarado text not null check(length(btrim(nome_declarado)) between 3 and 150),
  situacao text not null default 'pendente' check(situacao in ('pendente','aprovado','recusado')),
  pessoa_id uuid references public.pessoas(id) on delete restrict,
  solicitado_em timestamptz not null default now(),
  analisado_por uuid references auth.users(id) on delete restrict,
  analisado_em timestamptz,
  referencia_conferencia text,
  constraint educart_vinculo_estado_coerente check (
    (situacao='pendente' and pessoa_id is null and analisado_por is null and analisado_em is null and referencia_conferencia is null)
    or (situacao='aprovado' and pessoa_id is not null and analisado_por is not null
      and analisado_em is not null and length(btrim(referencia_conferencia)) between 8 and 200)
    or (situacao='recusado' and pessoa_id is null and analisado_por is not null
      and analisado_em is not null and length(btrim(referencia_conferencia)) between 8 and 200)
  )
);
CREATE INDEX educart_vinculo_situacao_idx ON public.educart_solicitacoes_vinculo_dev(situacao,solicitado_em);
ALTER TABLE public.educart_solicitacoes_vinculo_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_solicitacoes_vinculo_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_solicitacoes_vinculo_dev TO authenticated;
GRANT INSERT(auth_user_id,email_declarado,nome_declarado) ON public.educart_solicitacoes_vinculo_dev TO authenticated;
GRANT UPDATE(situacao,pessoa_id,analisado_por,analisado_em,referencia_conferencia)
  ON public.educart_solicitacoes_vinculo_dev TO authenticated;

CREATE POLICY educart_vinculo_ler_proprio_e_gestao ON public.educart_solicitacoes_vinculo_dev
FOR SELECT TO authenticated USING (
  auth_user_id=(select auth.uid())
  OR (exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
      and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid())
        and e.papel in ('secretaria','coordenacao')))
);
CREATE POLICY educart_vinculo_solicitar_proprio ON public.educart_solicitacoes_vinculo_dev
FOR INSERT TO authenticated WITH CHECK (
 auth_user_id=(select auth.uid())
 AND lower(btrim(email_declarado))=lower(btrim(coalesce((auth.jwt()->>'email'),'')))
 AND situacao='pendente' AND pessoa_id is null AND analisado_por is null
 AND analisado_em is null AND referencia_conferencia is null
);
CREATE POLICY educart_vinculo_avaliar_coordenacao ON public.educart_solicitacoes_vinculo_dev
FOR UPDATE TO authenticated USING (
 situacao='pendente'
 AND exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 AND exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid()) and e.papel='coordenacao')
) WITH CHECK (
 situacao in ('aprovado','recusado') AND analisado_por=(select auth.uid()) AND analisado_em is not null
 AND length(btrim(referencia_conferencia)) between 8 and 200
 AND exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 AND exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid()) and e.papel='coordenacao')
);

CREATE FUNCTION public.educart_vinculo_transicao_dev()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF old.situacao<>'pendente' OR new.situacao NOT IN ('aprovado','recusado')
   OR (new.auth_user_id,new.email_declarado,new.nome_declarado,new.solicitado_em)
     IS DISTINCT FROM (old.auth_user_id,old.email_declarado,old.nome_declarado,old.solicitado_em)
   OR new.analisado_por IS DISTINCT FROM auth.uid()
 THEN RAISE EXCEPTION 'Análise de vínculo não autorizada' USING errcode='42501'; END IF;
 RETURN new;
END; $$;
REVOKE ALL ON FUNCTION public.educart_vinculo_transicao_dev() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER educart_vinculo_transicao
 BEFORE UPDATE ON public.educart_solicitacoes_vinculo_dev
 FOR EACH ROW EXECUTE FUNCTION public.educart_vinculo_transicao_dev();

CREATE FUNCTION public.educart_aprovar_vinculo_dev(
 p_usuario_id uuid,p_pessoa_id uuid,p_identidade_conferida boolean,p_referencia text
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_usuario uuid:=auth.uid(); v_pedido public.educart_solicitacoes_vinculo_dev%rowtype;
 v_pessoa public.pessoas%rowtype;
BEGIN
 IF v_usuario IS NULL
  OR NOT exists(select 1 from public.portal_admins a where a.user_id=v_usuario)
  OR NOT exists(select 1 from public.equipe_papeis e where e.user_id=v_usuario and e.papel='coordenacao')
 THEN RAISE EXCEPTION 'Apenas Coordenação pode vincular estudante' USING errcode='42501'; END IF;
 IF p_identidade_conferida IS DISTINCT FROM TRUE OR p_pessoa_id IS NULL
    OR length(btrim(coalesce(p_referencia,''))) NOT BETWEEN 8 AND 200
 THEN RAISE EXCEPTION 'Conferência de identidade e referência são obrigatórias' USING errcode='22023'; END IF;
 SELECT * INTO v_pedido FROM public.educart_solicitacoes_vinculo_dev
  WHERE auth_user_id=p_usuario_id FOR UPDATE;
 IF NOT FOUND OR v_pedido.situacao<>'pendente' THEN
  RAISE EXCEPTION 'Pedido ausente ou já analisado' USING errcode='22023'; END IF;
 SELECT * INTO v_pessoa FROM public.pessoas WHERE id=p_pessoa_id FOR UPDATE;
 IF NOT FOUND OR v_pessoa.auth_user_id IS NOT NULL THEN
  RAISE EXCEPTION 'Pessoa ausente ou já vinculada' USING errcode='22023'; END IF;
 IF v_pessoa.email IS NOT NULL AND btrim(v_pessoa.email) <> ''
    AND lower(btrim(v_pessoa.email))<>lower(btrim(v_pedido.email_declarado)) THEN
  RAISE EXCEPTION 'E-mail divergente: exigir revisão assistida, sem vincular automaticamente'
   USING errcode='22023'; END IF;
 UPDATE public.pessoas SET auth_user_id=p_usuario_id
  WHERE id=p_pessoa_id AND auth_user_id IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pessoa sofreu alteração concorrente'; END IF;
 UPDATE public.educart_solicitacoes_vinculo_dev
 SET situacao='aprovado',pessoa_id=p_pessoa_id,analisado_por=v_usuario,
     analisado_em=now(),referencia_conferencia=btrim(p_referencia)
 WHERE auth_user_id=p_usuario_id AND situacao='pendente';
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação sofreu alteração concorrente'; END IF;
 RETURN p_pessoa_id;
END; $$;
REVOKE ALL ON FUNCTION public.educart_aprovar_vinculo_dev(uuid,uuid,boolean,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.educart_aprovar_vinculo_dev(uuid,uuid,boolean,text) TO authenticated;

CREATE TABLE public.educart_fotos_consentimento_dev (
 pessoa_id uuid primary key references public.pessoas(id) on delete restrict,
 auth_user_id uuid not null references auth.users(id) on delete restrict,
 consentiu boolean not null default false,
 versao_termo text not null default 'educart-foto-1.1-v1'
    check(versao_termo='educart-foto-1.1-v1'),
 atualizado_em timestamptz not null default now()
);
ALTER TABLE public.educart_fotos_consentimento_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_fotos_consentimento_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE(consentiu,atualizado_em) ON public.educart_fotos_consentimento_dev TO authenticated;
CREATE POLICY educart_foto_consentimento_ler ON public.educart_fotos_consentimento_dev
FOR SELECT TO authenticated USING (
 (auth_user_id=(select auth.uid()) AND exists(
  select 1 from public.pessoas p where p.id=pessoa_id AND p.auth_user_id=(select auth.uid())))
 OR (exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
   and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid()) and e.papel='coordenacao'))
);
CREATE POLICY educart_foto_consentimento_inserir ON public.educart_fotos_consentimento_dev
FOR INSERT TO authenticated WITH CHECK (
 auth_user_id=(select auth.uid())
 AND exists(select 1 from public.pessoas p where p.id=pessoa_id AND p.auth_user_id=(select auth.uid()))
);
CREATE POLICY educart_foto_consentimento_atualizar ON public.educart_fotos_consentimento_dev
FOR UPDATE TO authenticated USING (
 auth_user_id=(select auth.uid())
 AND exists(select 1 from public.pessoas p where p.id=pessoa_id AND p.auth_user_id=(select auth.uid()))
) WITH CHECK (
 auth_user_id=(select auth.uid()) AND versao_termo='educart-foto-1.1-v1'
 AND exists(select 1 from public.pessoas p where p.id=pessoa_id AND p.auth_user_id=(select auth.uid()))
);
CREATE FUNCTION public.educart_consentimento_foto_data_dev()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF tg_op='UPDATE' AND
 (new.pessoa_id,new.auth_user_id,new.versao_termo)
 IS DISTINCT FROM (old.pessoa_id,old.auth_user_id,old.versao_termo) THEN
  RAISE EXCEPTION 'Titularidade do consentimento imutável' USING errcode='42501'; END IF;
 new.atualizado_em:=now(); RETURN new;
END; $$;
REVOKE ALL ON FUNCTION public.educart_consentimento_foto_data_dev() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER educart_consentimento_foto_data
 BEFORE INSERT OR UPDATE ON public.educart_fotos_consentimento_dev
 FOR EACH ROW EXECUTE FUNCTION public.educart_consentimento_foto_data_dev();

-- Bucket independente do legado educart-perfis-dev, que permite até 45 MB.
-- Padrão único de objeto: <auth.uid()>/foto — apenas uma fotografia.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('educart-foto-individual-dev','educart-foto-individual-dev',false,5242880,ARRAY['image/jpeg','image/webp']);
CREATE POLICY educart_foto_privada_ler_dev ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='educart-foto-individual-dev' AND name=((select auth.uid())::text || '/foto')
 AND exists(select 1 from public.educart_fotos_consentimento_dev c
   where c.auth_user_id=(select auth.uid()) and c.consentiu=true));
CREATE POLICY educart_foto_privada_inserir_dev ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='educart-foto-individual-dev' AND name=((select auth.uid())::text || '/foto')
 AND exists(select 1 from public.educart_fotos_consentimento_dev c
   where c.auth_user_id=(select auth.uid()) and c.consentiu=true));
CREATE POLICY educart_foto_privada_substituir_dev ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='educart-foto-individual-dev' AND name=((select auth.uid())::text || '/foto')
 AND exists(select 1 from public.educart_fotos_consentimento_dev c
   where c.auth_user_id=(select auth.uid()) and c.consentiu=true))
WITH CHECK (bucket_id='educart-foto-individual-dev' AND name=((select auth.uid())::text || '/foto')
 AND exists(select 1 from public.educart_fotos_consentimento_dev c
   where c.auth_user_id=(select auth.uid()) and c.consentiu=true));
CREATE POLICY educart_foto_privada_excluir_dev ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='educart-foto-individual-dev' AND name=((select auth.uid())::text || '/foto'));
CREATE POLICY educart_estudante_ler_mensalidades_proprias_dev ON public.mensalidades_formacao
FOR SELECT TO authenticated USING (EXISTS (
 SELECT 1 FROM public.matriculas m JOIN public.pessoas p ON p.id=m.pessoa_id
 WHERE m.id=mensalidades_formacao.matricula_id AND p.auth_user_id=(select auth.uid())
));

COMMENT ON TABLE public.educart_solicitacoes_vinculo_dev IS
 'EducART 1.1 DEV: pedidos individuais; vínculo com pessoa exige revisão humana pela Coordenação.';
COMMENT ON TABLE public.educart_fotos_consentimento_dev IS
 'EducART 1.1 DEV: uma foto privada por titular, até 5 MiB, consentimento revogável.';
