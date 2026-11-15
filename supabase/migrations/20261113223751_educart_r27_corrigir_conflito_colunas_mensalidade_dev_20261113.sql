CREATE OR REPLACE FUNCTION public.educart_matricular_simples_dev(p_inscricao_id uuid, p_turma_id uuid, p_valor_base_centavos integer, p_bolsa text, p_valor_outro_centavos integer DEFAULT NULL::integer, p_pessoa_existente_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(matricula_id uuid, pessoa_id uuid, primeira_competencia date, valor_devido_centavos integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_id uuid;
 v_pessoa uuid;
 v_competencia date := date_trunc('month',(now() AT TIME ZONE 'America/Bahia')::date::timestamp)::date;
 v_devido integer;
 v_turma public.turmas%ROWTYPE;
BEGIN
 IF v_uid IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
 OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao') THEN
   RAISE EXCEPTION 'Somente a Coordenacao autorizada pode matricular' USING errcode='42501';
 END IF;
 IF p_valor_base_centavos IS NULL OR p_valor_base_centavos NOT IN (28000,30000,32000)
 OR p_bolsa IS NULL OR p_bolsa NOT IN ('nenhuma','integral','meia','outra') THEN
   RAISE EXCEPTION 'Selecione mensalidade e bolsa validas' USING errcode='22023';
 END IF;
 v_devido := CASE p_bolsa
   WHEN 'nenhuma' THEN p_valor_base_centavos
   WHEN 'integral' THEN 0
   WHEN 'meia' THEN p_valor_base_centavos/2
   ELSE p_valor_outro_centavos END;
 IF v_devido IS NULL OR v_devido < 0
 OR (p_bolsa='outra' AND (v_devido<=0 OR v_devido>=p_valor_base_centavos)) THEN
   RAISE EXCEPTION 'Na bolsa Outro, informe valor mensal entre zero e valor cheio' USING errcode='22023';
 END IF;
 SELECT * INTO v_turma FROM public.turmas WHERE id=p_turma_id;
 IF NOT FOUND OR v_turma.docente_id IS NULL OR nullif(btrim(v_turma.local_nome),'') IS NULL THEN
   RAISE EXCEPTION 'A turma precisa de professor e local cadastrados' USING errcode='22023';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.educart_docentes_dev d WHERE d.id=v_turma.docente_id AND d.situacao='ativo') THEN
   RAISE EXCEPTION 'A turma precisa de professor ativo' USING errcode='22023';
 END IF;

 -- Reutiliza a reconciliacao segura de identidade, vagas e candidatura existente.
 v_id := public.educart_pre_matricular_dev(p_inscricao_id,p_turma_id,p_pessoa_existente_id);
 SELECT m.pessoa_id INTO v_pessoa FROM public.matriculas m WHERE m.id=v_id;
 PERFORM pg_catalog.set_config('educart.ingresso_simples_rpc','true',true);
 UPDATE public.matriculas SET situacao='ativa',
    ingresso_em=(now() AT TIME ZONE 'America/Bahia')::date
 WHERE id=v_id AND situacao='pendente';
 IF NOT FOUND THEN RAISE EXCEPTION 'Matricula nao ativada'; END IF;
 UPDATE public.inscricoes_oficina SET status='matriculado'
 WHERE id=p_inscricao_id AND status IS DISTINCT FROM 'matriculado';
 INSERT INTO public.educart_condicoes_mensalidade_dev
  (matricula_id,valor_base_centavos,bolsa,valor_devido_centavos,primeira_competencia,registrado_por)
 VALUES (v_id,p_valor_base_centavos,p_bolsa,v_devido,v_competencia,v_uid);
 IF v_devido>0 THEN
   INSERT INTO public.mensalidades_formacao
    (matricula_id,competencia,vencimento_em,valor_centavos,status,origem)
   VALUES (v_id,v_competencia,v_competencia+9,v_devido,'pendente','manual')
   ON CONFLICT ON CONSTRAINT mensalidades_formacao_matricula_id_competencia_key DO NOTHING;
 END IF;
 RETURN QUERY SELECT v_id,v_pessoa,v_competencia,v_devido;
END;
$function$
