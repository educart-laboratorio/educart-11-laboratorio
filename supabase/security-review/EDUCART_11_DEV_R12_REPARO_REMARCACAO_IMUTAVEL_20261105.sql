-- R12.1: remarcação conforme guarda de identidade imutável da aula.
ALTER TABLE public.educart_ajustes_aulas_r12_dev
 ADD COLUMN aula_substituta_id uuid REFERENCES public.educart_aulas_dev(id) ON DELETE RESTRICT;
CREATE OR REPLACE FUNCTION educart_interno_dev.educart_r12_ajustar_aula_dev(
 p_aula_id uuid,p_operacao text,p_data_nova date,p_inicio_novo time,
 p_fim_novo time,p_motivo text,p_confirmo boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp' AS $$
DECLARE
 v_uid uuid:=auth.uid();
 v_aula public.educart_aulas_dev%rowtype;
 v_hoje date:=(now() AT TIME ZONE 'America/Bahia')::date;
 v_substituta uuid;v_id uuid;
BEGIN
 IF v_uid IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
  OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao')
 THEN RAISE EXCEPTION 'Ajuste reservado à Coordenação' USING ERRCODE='42501'; END IF;
 IF p_confirmo IS DISTINCT FROM TRUE OR p_operacao NOT IN ('remarcar','cancelar')
   OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 8 AND 300
 THEN RAISE EXCEPTION 'Confirmação e motivo obrigatórios' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_aula FROM public.educart_aulas_dev WHERE id=p_aula_id FOR UPDATE;
 IF NOT FOUND OR v_aula.situacao<>'planejada'
 THEN RAISE EXCEPTION 'Somente aula planejada pode ser alterada' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.educart_chamadas_dev c WHERE c.aula_id=p_aula_id)
 THEN RAISE EXCEPTION 'Aula com chamada não pode ser alterada' USING ERRCODE='23514'; END IF;
 IF p_operacao='remarcar' THEN
   IF p_data_nova IS NULL OR p_data_nova<v_hoje
      OR p_inicio_novo IS NULL OR p_fim_novo IS NULL OR p_inicio_novo>=p_fim_novo
      OR (p_data_nova=v_aula.data_aula AND p_inicio_novo=v_aula.inicio AND p_fim_novo=v_aula.fim)
   THEN RAISE EXCEPTION 'Nova data e horário válidos obrigatórios' USING ERRCODE='22023'; END IF;
   -- O trigger proíbe UPDATE de data/horário. Nova aula recebe nova identidade.
   INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao,criada_por)
   VALUES(v_aula.turma_id,p_data_nova,p_inicio_novo,p_fim_novo,v_aula.tema,'planejada',v_uid)
   RETURNING id INTO v_substituta;
 ELSE
   IF p_data_nova IS NOT NULL OR p_inicio_novo IS NOT NULL OR p_fim_novo IS NOT NULL
   THEN RAISE EXCEPTION 'Cancelamento não aceita nova data' USING ERRCODE='22023'; END IF;
 END IF;
 UPDATE public.educart_aulas_dev SET situacao='cancelada' WHERE id=p_aula_id;
 INSERT INTO public.educart_ajustes_aulas_r12_dev(
  aula_id,operacao,data_anterior,inicio_anterior,fim_anterior,data_nova,
  inicio_novo,fim_novo,motivo,registrado_por,aula_substituta_id)
 VALUES(p_aula_id,p_operacao,v_aula.data_aula,v_aula.inicio,v_aula.fim,
   CASE WHEN p_operacao='remarcar' THEN p_data_nova END,
   CASE WHEN p_operacao='remarcar' THEN p_inicio_novo END,
   CASE WHEN p_operacao='remarcar' THEN p_fim_novo END,
   btrim(p_motivo),v_uid,v_substituta)
 RETURNING id INTO v_id;
 RETURN v_id;
END;$$;
COMMENT ON COLUMN public.educart_ajustes_aulas_r12_dev.aula_substituta_id
 IS 'Nova aula da remarcação. Origem permanece cancelada, auditada e imutável.';
