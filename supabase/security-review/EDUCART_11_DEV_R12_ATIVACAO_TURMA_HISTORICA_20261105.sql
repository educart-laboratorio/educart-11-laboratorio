-- R12.2 — reconhecer turma histórica em andamento, com auditoria e confirmação.
-- Não importa pessoas, não cria parcelas, não abre inscrições e não publica formação.
CREATE TABLE public.educart_ativacoes_turmas_historicas_r12_dev(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT UNIQUE,
 situacao_anterior text NOT NULL CHECK(situacao_anterior IN ('planejada','aberta')),
 inicio_declarado date NOT NULL,
 referencia_conferencia text NOT NULL CHECK(length(btrim(referencia_conferencia)) BETWEEN 12 AND 180),
 registrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 registrado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.educart_ativacoes_turmas_historicas_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_ativacoes_turmas_historicas_r12_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_ativacoes_turmas_historicas_r12_dev TO authenticated;
CREATE POLICY educart_r12_turma_historica_coord_ler
 ON public.educart_ativacoes_turmas_historicas_r12_dev FOR SELECT TO authenticated
 USING(
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
);
CREATE FUNCTION educart_interno_dev.educart_r12_ativar_turma_historica_dev(
 p_turma_id uuid,p_inicio_declarado date,p_referencia text,p_confirmei_documentos boolean
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$
DECLARE v_uid uuid:=auth.uid();v_turma public.turmas%rowtype;v_id uuid;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.portal_admins WHERE user_id=v_uid)
 OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis WHERE user_id=v_uid AND papel='coordenacao')
 THEN RAISE EXCEPTION 'Somente Coordenação autorizada' USING ERRCODE='42501';END IF;
 IF p_confirmei_documentos IS DISTINCT FROM TRUE OR p_inicio_declarado IS NULL
 OR p_inicio_declarado>(now() AT TIME ZONE 'America/Bahia')::date
 OR length(btrim(coalesce(p_referencia,''))) NOT BETWEEN 12 AND 180
 THEN RAISE EXCEPTION 'Documentação, início e referência são obrigatórios' USING ERRCODE='22023';END IF;
 SELECT * INTO v_turma FROM public.turmas WHERE id=p_turma_id FOR UPDATE;
 IF NOT FOUND OR v_turma.situacao NOT IN ('planejada','aberta')
 OR (v_turma.termina_em IS NOT NULL AND v_turma.termina_em<(now() AT TIME ZONE 'America/Bahia')::date)
 THEN RAISE EXCEPTION 'Turma não elegível para reconhecimento em andamento' USING ERRCODE='22023';END IF;
 IF v_turma.inicio_em IS NOT NULL AND v_turma.inicio_em<>p_inicio_declarado
 THEN RAISE EXCEPTION 'Início informado difere do cadastro; revise a turma antes de continuar' USING ERRCODE='22023';END IF;
 UPDATE public.turmas SET situacao='em_andamento',
 inicio_em=coalesce(inicio_em,p_inicio_declarado)
 WHERE id=p_turma_id AND situacao IN ('planejada','aberta');
 INSERT INTO public.educart_ativacoes_turmas_historicas_r12_dev(
 turma_id,situacao_anterior,inicio_declarado,referencia_conferencia,registrado_por)
 VALUES(p_turma_id,v_turma.situacao,p_inicio_declarado,btrim(p_referencia),v_uid)
 RETURNING id INTO v_id;
 RETURN v_id;
END;$$;
CREATE FUNCTION public.educart_r12_ativar_turma_historica_dev(
 p_turma_id uuid,p_inicio_declarado date,p_referencia text,p_confirmei_documentos boolean
) RETURNS uuid LANGUAGE sql SECURITY INVOKER
SET search_path TO 'pg_catalog','public','pg_temp'
AS $$SELECT educart_interno_dev.educart_r12_ativar_turma_historica_dev($1,$2,$3,$4);$$;
REVOKE ALL ON FUNCTION educart_interno_dev.educart_r12_ativar_turma_historica_dev(uuid,date,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.educart_r12_ativar_turma_historica_dev(uuid,date,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_dev.educart_r12_ativar_turma_historica_dev(uuid,date,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r12_ativar_turma_historica_dev(uuid,date,text,boolean) TO authenticated;
