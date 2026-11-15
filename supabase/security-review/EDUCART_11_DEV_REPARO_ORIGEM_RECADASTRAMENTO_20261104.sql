-- EducART DEV: ajuste sem quebrar restrição da origem de matrícula herdada da 1.0.
-- A base aceita 'novo' ou 'recadastramento'; usar a categoria existente.
-- A tabela educart_importacoes_legado_dev rastreia o contexto do rol.
-- Não executar em produção nem reescrever a migração aplicada.
CREATE OR REPLACE FUNCTION public.educart_importar_rol_dev(
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
   VALUES(v_pessoa_id,p_turma_id,'recadastramento','pendente')
   RETURNING id INTO v_matricula_id;
  INSERT INTO public.educart_importacoes_legado_dev(
   turma_id,pessoa_id,matricula_id,referencia_linha,referencia_rol,conferido_por
  ) VALUES(p_turma_id,v_pessoa_id,v_matricula_id,v_referencia,btrim(p_referencia_rol),v_uid);
  v_n:=v_n+1;
 END LOOP;
 RETURN v_n;
END; $$;
