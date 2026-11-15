-- EducART 1.2 | R12 aditivo — NOVO INGRESSO PENDENTE, somente Supabase DEV.
-- Mantém a MESMA assinatura/grants da RPC pública e da função interna R12.
-- "novo_pendente" é um tipo de operação transitório: matrícula orig='novo', situacao='pendente'.
-- "vinculo_pendente" e "legado_ativo" mantêm semântica histórica e orig='recadastramento'.
-- A auditoria existente registra tipo='vinculo_pendente' para novos ingressos; a origem
-- verdadeira fica em public.matriculas. Nenhuma tabela, cobrança, convite ou dado é alterado.

CREATE OR REPLACE FUNCTION educart_interno_dev.educart_r12_vincular_estudante_turma_dev(
  p_turma_id uuid,
  p_pessoa_existente_id uuid,
  p_nome_completo text,
  p_email text,
  p_telefone text,
  p_nascimento date,
  p_tipo_vinculo text,
  p_ingresso_em date,
  p_referencia_conferencia text,
  p_confirmei_identidade boolean,
  p_confirmei_documentos boolean
) RETURNS TABLE (matricula_id uuid, pessoa_id uuid, situacao text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_turma public.turmas%rowtype;
  v_pessoa uuid;
  v_nome text:=btrim(coalesce(p_nome_completo,''));
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_telefone text:=regexp_replace(coalesce(p_telefone,''),'[^0-9]','','g');
  v_situacao text;
  v_matricula uuid;
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
     OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                   WHERE e.user_id=v_uid AND e.papel='coordenacao')
  THEN RAISE EXCEPTION 'Operador administrativo sem permissão' USING ERRCODE='42501'; END IF;
  IF p_confirmei_identidade IS DISTINCT FROM TRUE
    OR p_tipo_vinculo NOT IN ('legado_ativo','vinculo_pendente','novo_pendente')
    OR length(btrim(coalesce(p_referencia_conferencia,''))) NOT BETWEEN 12 AND 180
    OR p_ingresso_em>current_date OR p_nascimento>current_date
  THEN RAISE EXCEPTION 'Vínculo exige conferência e referência válida' USING ERRCODE='22023'; END IF;
  IF p_tipo_vinculo='legado_ativo' AND
       (p_confirmei_documentos IS DISTINCT FROM TRUE OR p_ingresso_em IS NULL)
  THEN RAISE EXCEPTION 'Reconhecer estudante ativo exige documento conferido e ingresso conhecido'
       USING ERRCODE='22023'; END IF;

  -- Ingresso novo é sempre acadêmico PENDENTE; nunca uma ativação histórica.
  IF p_tipo_vinculo='novo_pendente' AND
       (p_ingresso_em IS NOT NULL OR p_confirmei_documentos IS TRUE)
  THEN RAISE EXCEPTION 'Novo ingresso pendente não admite data histórica nem ativação documental'
       USING ERRCODE='22023'; END IF;

  SELECT * INTO v_turma FROM public.turmas WHERE id=p_turma_id FOR UPDATE;
  IF NOT FOUND OR v_turma.situacao IN ('cancelada','encerrada') THEN
    RAISE EXCEPTION 'Turma inexistente, encerrada ou cancelada' USING ERRCODE='22023'; END IF;
  IF p_tipo_vinculo='legado_ativo' AND v_turma.situacao<>'em_andamento' THEN
    RAISE EXCEPTION 'Vínculo ativo histórico exige turma em andamento' USING ERRCODE='22023'; END IF;
  IF v_turma.capacidade IS NOT NULL AND
      (SELECT count(*) FROM public.matriculas m
       WHERE m.turma_id=p_turma_id AND m.situacao IN ('ativa','pendente'))>=v_turma.capacidade
  THEN RAISE EXCEPTION 'Turma sem vagas disponíveis' USING ERRCODE='23514'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('educart-dev-reconciliacao-pessoas',0));
  IF p_pessoa_existente_id IS NOT NULL THEN
    SELECT id INTO v_pessoa FROM public.pessoas WHERE id=p_pessoa_existente_id FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pessoa selecionada não existe' USING ERRCODE='22023'; END IF;
    IF v_nome<>'' OR v_email<>'' OR v_telefone<>'' OR p_nascimento IS NOT NULL THEN
      RAISE EXCEPTION 'Pessoa existente não pode ser alterada implicitamente' USING ERRCODE='22023'; END IF;
  ELSE
    IF v_nome !~ '^[^[:cntrl:]]{3,150}$'
      OR (v_email='' AND v_telefone='')
      OR length(v_email)>320
      OR (v_email<>'' AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
      OR (v_telefone<>'' AND length(v_telefone) NOT BETWEEN 10 AND 13)
    THEN RAISE EXCEPTION 'Novo cadastro requer nome e contato válidos' USING ERRCODE='22023'; END IF;
    IF EXISTS(
       SELECT 1 FROM public.pessoas p
       WHERE (v_email<>'' AND lower(btrim(coalesce(p.email,'')))=v_email)
          OR (v_telefone<>'' AND regexp_replace(coalesce(p.telefone,''),'[^0-9]','','g')=v_telefone)
    ) THEN RAISE EXCEPTION 'Possível cadastro duplicado; selecione a pessoa existente'
           USING ERRCODE='23505'; END IF;
    INSERT INTO public.pessoas(nome_completo,email,telefone,data_nascimento)
    VALUES(v_nome,nullif(v_email,''),nullif(v_telefone,''),p_nascimento)
    RETURNING id INTO v_pessoa;
  END IF;

  IF EXISTS(SELECT 1 FROM public.matriculas m
            WHERE m.pessoa_id=v_pessoa AND m.turma_id=p_turma_id)
  THEN RAISE EXCEPTION 'Estudante já possui vínculo com esta turma' USING ERRCODE='23505'; END IF;
  v_situacao:=CASE WHEN p_tipo_vinculo='legado_ativo' THEN 'ativa' ELSE 'pendente' END;
  INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao,ingresso_em)
  VALUES(v_pessoa,p_turma_id,
         CASE WHEN p_tipo_vinculo='novo_pendente' THEN 'novo' ELSE 'recadastramento' END,
         v_situacao,p_ingresso_em)
  RETURNING id INTO v_matricula;
  INSERT INTO public.educart_vinculos_manuais_r12_dev(
   matricula_id,pessoa_id,turma_id,tipo_vinculo,referencia_conferencia,
   ingresso_declarado_em,registrado_por)
  VALUES(v_matricula,v_pessoa,p_turma_id,
         CASE WHEN p_tipo_vinculo='novo_pendente' THEN 'vinculo_pendente' ELSE p_tipo_vinculo END,
         btrim(p_referencia_conferencia),p_ingresso_em,v_uid);
  RETURN QUERY SELECT v_matricula,v_pessoa,v_situacao;
END;
$function$;

COMMENT ON TABLE public.educart_vinculos_manuais_r12_dev IS
 'Auditoria DEV: vínculos manuais de novos ingressos pendentes e recadastros históricos, sem cobrança nem convite.';
