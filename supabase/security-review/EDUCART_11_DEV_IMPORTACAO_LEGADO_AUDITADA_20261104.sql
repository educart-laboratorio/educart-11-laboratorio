-- EducART 1.1 / camada 5: incorporação auditada de estudantes EXISTENTES no DEV.
-- Código de auditoria para database-dev, NUNCA para database-prod.
-- A operação é integralmente transacional: qualquer erro desfaz TODO o rol.
-- Não cria inscrição, mensalidade, dívida, Pix, foto, login nem matrícula ativa.
-- Pendente = vínculo acadêmico legado aguardando validação posterior.
-- Entrada DEV: somente linhas sintéticas; dados reais exigem autorização específica.

DO $preflight$
BEGIN
 IF to_regclass('public.educart_importacoes_legado_dev') IS NOT NULL THEN
   RAISE EXCEPTION 'Importação DEV já instalada; não reaplicar'; END IF;
 IF to_regclass('public.matriculas') IS NULL OR to_regclass('public.equipe_papeis') IS NULL
   OR to_regprocedure('public.educart_pre_matricular_dev(uuid,uuid,uuid)') IS NULL THEN
   RAISE EXCEPTION 'Dependências EducART acadêmicas ainda ausentes'; END IF;
END $preflight$;

CREATE TABLE public.educart_importacoes_legado_dev (
 id uuid primary key default gen_random_uuid(),
 turma_id uuid not null references public.turmas(id) on delete restrict,
 pessoa_id uuid not null unique references public.pessoas(id) on delete restrict,
 matricula_id uuid not null unique references public.matriculas(id) on delete restrict,
 referencia_linha text not null check(length(btrim(referencia_linha)) between 3 and 80),
 referencia_rol text not null check(length(btrim(referencia_rol)) between 8 and 150),
 conferido_por uuid not null references auth.users(id) on delete restrict,
 incorporado_em timestamptz not null default now(),
 UNIQUE(turma_id,referencia_rol,referencia_linha)
);
CREATE INDEX educart_importacoes_rol_por_turma_idx
 ON public.educart_importacoes_legado_dev(turma_id,incorporado_em);
ALTER TABLE public.educart_importacoes_legado_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_importacoes_legado_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.educart_importacoes_legado_dev TO authenticated;
CREATE POLICY educart_legado_equipe_ler_dev ON public.educart_importacoes_legado_dev
FOR SELECT TO authenticated USING (
 EXISTS(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 AND EXISTS(select 1 from public.equipe_papeis e
   where e.user_id=(select auth.uid()) and e.papel in ('secretaria','coordenacao'))
);
CREATE POLICY educart_legado_coord_inserir_dev ON public.educart_importacoes_legado_dev
FOR INSERT TO authenticated WITH CHECK (
 conferido_por=(select auth.uid())
 AND EXISTS(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 AND EXISTS(select 1 from public.equipe_papeis e
  where e.user_id=(select auth.uid()) and e.papel='coordenacao')
);

CREATE FUNCTION public.educart_importar_rol_dev(
 p_turma_id uuid, p_registros jsonb, p_referencia_rol text, p_confirmei_auditoria boolean
) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_uid uuid:=auth.uid(); v_item jsonb; v_nome text; v_email text; v_telefone text;
 v_nascimento date; v_data text; v_referencia text; v_pessoa_id uuid; v_matricula_id uuid;
 v_n integer:=0;
BEGIN
 IF v_uid IS NULL
  OR NOT exists(select 1 from public.portal_admins a where a.user_id=v_uid)
  OR NOT exists(select 1 from public.equipe_papeis e where e.user_id=v_uid and e.papel='coordenacao')
 THEN RAISE EXCEPTION 'Importação restrita à Coordenação' USING errcode='42501'; END IF;
 IF p_confirmei_auditoria IS DISTINCT FROM TRUE
  OR length(btrim(coalesce(p_referencia_rol,''))) NOT BETWEEN 8 AND 150
  OR p_registros IS NULL OR jsonb_typeof(p_registros)<>'array'
  OR jsonb_array_length(p_registros) NOT BETWEEN 1 AND 40
 THEN RAISE EXCEPTION 'Confirme revisão e fonte do rol (1 a 40 linhas)' USING errcode='22023'; END IF;
 -- Não interferir com outras matrículas: trava apenas uma turma por operação.
 PERFORM 1 FROM public.turmas WHERE id=p_turma_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Turma não localizada' USING errcode='P0002'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('educart-dev-reconciliacao-pessoas',0));

 FOR v_item IN SELECT value FROM jsonb_array_elements(p_registros) LOOP
  IF jsonb_typeof(v_item)<>'object' THEN
   RAISE EXCEPTION 'Formato de linha inválido' USING errcode='22023'; END IF;
  v_nome:=btrim(coalesce(v_item->>'nome_completo',''));
  v_email:=lower(btrim(coalesce(v_item->>'email','')));
  v_telefone:=regexp_replace(coalesce(v_item->>'telefone',''),'[^0-9]','','g');
  v_referencia:=btrim(coalesce(v_item->>'referencia',''));
  v_data:=nullif(btrim(coalesce(v_item->>'data_nascimento','')),'');
  IF v_nome !~ '^[^[:cntrl:]]{3,150}$'
   OR length(v_email)>320 OR (v_email<>'' AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
   OR (v_telefone<>'' AND length(v_telefone) NOT BETWEEN 10 AND 13)
   OR (v_email='' AND v_telefone='')
   OR length(v_referencia) NOT BETWEEN 3 AND 80
  THEN RAISE EXCEPTION 'Linha do rol com nome, contato ou referência inválidos' USING errcode='22023'; END IF;
  IF v_data IS NULL THEN v_nascimento:=NULL;
  ELSIF v_data !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
   RAISE EXCEPTION 'Nascimento deve estar em AAAA-MM-DD' USING errcode='22023';
  ELSE
   v_nascimento:=v_data::date;
   IF v_nascimento>current_date THEN RAISE EXCEPTION 'Nascimento futuro é inválido' USING errcode='22023'; END IF;
  END IF;

  -- Bloqueia coincidências para revisão individual; não funde identidades.
  IF EXISTS (SELECT 1 FROM public.pessoas p
    WHERE (v_email<>'' AND lower(btrim(coalesce(p.email,'')))=v_email)
       OR (v_telefone<>'' AND regexp_replace(coalesce(p.telefone,''),'[^0-9]','','g')=v_telefone))
  THEN RAISE EXCEPTION 'Identidade possivelmente existente: interromper e reconciliar manualmente' USING errcode='23505'; END IF;
  IF EXISTS (SELECT 1 FROM public.educart_importacoes_legado_dev i
    WHERE i.turma_id=p_turma_id AND i.referencia_rol=btrim(p_referencia_rol)
      AND i.referencia_linha=v_referencia)
  THEN RAISE EXCEPTION 'Linha já importada para turma e rol' USING errcode='23505'; END IF;
  INSERT INTO public.pessoas(nome_completo,email,telefone,data_nascimento)
   VALUES(v_nome,nullif(v_email,''),nullif(v_telefone,''),v_nascimento)
   RETURNING id INTO v_pessoa_id;
  INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao)
   VALUES(v_pessoa_id,p_turma_id,'legado','pendente')
   RETURNING id INTO v_matricula_id;
  INSERT INTO public.educart_importacoes_legado_dev(
   turma_id,pessoa_id,matricula_id,referencia_linha,referencia_rol,conferido_por
  ) VALUES(p_turma_id,v_pessoa_id,v_matricula_id,v_referencia,btrim(p_referencia_rol),v_uid);
  v_n:=v_n+1;
 END LOOP;
 RETURN v_n;
END; $$;
REVOKE ALL ON FUNCTION public.educart_importar_rol_dev(uuid,jsonb,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.educart_importar_rol_dev(uuid,jsonb,text,boolean) TO authenticated;
COMMENT ON TABLE public.educart_importacoes_legado_dev IS
 'EducART 1.1 DEV: rastreabilidade da incorporação de rol; apenas pendente, jamais gera dívida presumida.';
