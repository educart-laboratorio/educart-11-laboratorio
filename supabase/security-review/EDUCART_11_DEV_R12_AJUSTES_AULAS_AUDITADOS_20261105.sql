-- EducART 1.1 / Q10 — Remarcação e cancelamento de aula planejada, com auditoria.
-- Somente DEV, sem envio de mensagens. Preserva id da aula e histórico de chamadas.
CREATE TABLE public.educart_ajustes_aulas_r12_dev (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 aula_id uuid NOT NULL REFERENCES public.educart_aulas_dev(id) ON DELETE RESTRICT,
 operacao text NOT NULL CHECK(operacao IN ('cancelar','remarcar')),
 data_anterior date NOT NULL,
 inicio_anterior time NOT NULL,
 fim_anterior time NOT NULL,
 data_nova date,
 inicio_novo time,
 fim_novo time,
 motivo text NOT NULL CHECK(length(btrim(motivo)) BETWEEN 8 AND 300),
 registrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 registrado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX educart_r12_ajuste_aulas_idx ON public.educart_ajustes_aulas_r12_dev(aula_id,registrado_em DESC);
ALTER TABLE public.educart_ajustes_aulas_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_ajustes_aulas_r12_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_ajustes_aulas_r12_dev TO authenticated;
CREATE POLICY educart_r12_ajuste_aulas_equipe_ler
 ON public.educart_ajustes_aulas_r12_dev FOR SELECT TO authenticated
 USING(
 EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid())
  AND e.papel IN ('secretaria','coordenacao'))
 );

CREATE FUNCTION educart_interno_dev.educart_r12_ajustar_aula_dev(
 p_aula_id uuid,p_operacao text,p_data_nova date,p_inicio_novo time,
 p_fim_novo time,p_motivo text,p_confirmo boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog','public','pg_temp' AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_aula public.educart_aulas_dev%rowtype;
 v_hoje date:=(now() AT TIME ZONE 'America/Bahia')::date;
 v_id uuid;
BEGIN
 IF v_uid IS NULL
    OR NOT EXISTS(SELECT 1 FROM public.portal_admins WHERE user_id=v_uid)
    OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis WHERE user_id=v_uid AND papel='coordenacao')
 THEN RAISE EXCEPTION 'Ajuste de agenda reservado à Coordenação' USING ERRCODE='42501'; END IF;
 IF p_confirmo IS DISTINCT FROM TRUE OR p_operacao NOT IN ('cancelar','remarcar')
    OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 8 AND 300
 THEN RAISE EXCEPTION 'Ajuste exige motivo e confirmação explícita' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_aula FROM public.educart_aulas_dev WHERE id=p_aula_id FOR UPDATE;
 IF NOT FOUND OR v_aula.situacao<>'planejada'
 THEN RAISE EXCEPTION 'Somente aula planejada pode ser remarcada ou cancelada' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.educart_chamadas_dev c WHERE c.aula_id=p_aula_id)
 THEN RAISE EXCEPTION 'Aula com chamada registrada não pode ser alterada' USING ERRCODE='23514'; END IF;
 IF p_operacao='remarcar' THEN
   IF p_data_nova IS NULL OR p_data_nova<v_hoje OR p_inicio_novo IS NULL OR
      p_fim_novo IS NULL OR p_inicio_novo>=p_fim_novo OR
      (p_data_nova=v_aula.data_aula AND p_inicio_novo=v_aula.inicio AND p_fim_novo=v_aula.fim)
   THEN RAISE EXCEPTION 'Novo dia e horários futuros válidos são obrigatórios' USING ERRCODE='22023'; END IF;
   UPDATE public.educart_aulas_dev
    SET data_aula=p_data_nova,inicio=p_inicio_novo,fim=p_fim_novo
    WHERE id=p_aula_id AND situacao='planejada';
 ELSE
   IF p_data_nova IS NOT NULL OR p_inicio_novo IS NOT NULL OR p_fim_novo IS NOT NULL
   THEN RAISE EXCEPTION 'Cancelamento não deve definir nova data' USING ERRCODE='22023'; END IF;
   UPDATE public.educart_aulas_dev SET situacao='cancelada'
    WHERE id=p_aula_id AND situacao='planejada';
 END IF;
 INSERT INTO public.educart_ajustes_aulas_r12_dev(
  aula_id,operacao,data_anterior,inicio_anterior,fim_anterior,
  data_nova,inicio_novo,fim_novo,motivo,registrado_por
 ) VALUES(p_aula_id,p_operacao,v_aula.data_aula,v_aula.inicio,v_aula.fim,
   CASE WHEN p_operacao='remarcar' THEN p_data_nova ELSE NULL END,
   CASE WHEN p_operacao='remarcar' THEN p_inicio_novo ELSE NULL END,
   CASE WHEN p_operacao='remarcar' THEN p_fim_novo ELSE NULL END,
   btrim(p_motivo),v_uid)
 RETURNING id INTO v_id;
 RETURN v_id;
END;
$function$;
CREATE FUNCTION public.educart_r12_ajustar_aula_dev(
 p_aula_id uuid,p_operacao text,p_data_nova date,p_inicio_novo time,
 p_fim_novo time,p_motivo text,p_confirmo boolean
) RETURNS uuid LANGUAGE sql SECURITY INVOKER
SET search_path TO 'pg_catalog','public','pg_temp' AS $function$
 SELECT educart_interno_dev.educart_r12_ajustar_aula_dev($1,$2,$3,$4,$5,$6,$7);
$function$;
REVOKE ALL ON FUNCTION educart_interno_dev.educart_r12_ajustar_aula_dev(uuid,text,date,time,time,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.educart_r12_ajustar_aula_dev(uuid,text,date,time,time,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_dev.educart_r12_ajustar_aula_dev(uuid,text,date,time,time,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r12_ajustar_aula_dev(uuid,text,date,time,time,text,boolean) TO authenticated;
