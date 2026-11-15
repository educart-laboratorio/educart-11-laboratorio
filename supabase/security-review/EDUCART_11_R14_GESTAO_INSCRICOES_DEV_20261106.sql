-- EducART R14 — SOMENTE SUPABASE DEV. Não aplicar em produção sem autorização distinta.
-- Contrato transacional de gestão: sem DELETE, sem cobrança, sem envio.
BEGIN;

CREATE TABLE IF NOT EXISTS public.educart_inscricoes_estado_r14_dev (
  inscricao_id uuid PRIMARY KEY REFERENCES public.inscricoes_oficina(id) ON DELETE RESTRICT,
  arquivada boolean NOT NULL DEFAULT false,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.educart_inscricoes_eventos_r14_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id uuid NOT NULL REFERENCES public.inscricoes_oficina(id) ON DELETE RESTRICT,
  acao text NOT NULL CHECK (acao IN ('cancelar','arquivar','desarquivar','editar')),
  motivo text NOT NULL CHECK (char_length(btrim(motivo)) BETWEEN 8 AND 500),
  antes jsonb NOT NULL DEFAULT '{}'::jsonb,
  depois jsonb NOT NULL DEFAULT '{}'::jsonb,
  registrado_por uuid NOT NULL REFERENCES auth.users(id),
  registrado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS educart_eventos_r14_inscricao_data
  ON public.educart_inscricoes_eventos_r14_dev (inscricao_id,registrado_em DESC);

ALTER TABLE public.educart_inscricoes_estado_r14_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educart_inscricoes_eventos_r14_dev ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.educart_inscricoes_estado_r14_dev FROM PUBLIC,anon,authenticated;
REVOKE ALL ON public.educart_inscricoes_eventos_r14_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.educart_inscricoes_estado_r14_dev TO authenticated;
GRANT SELECT ON public.educart_inscricoes_eventos_r14_dev TO authenticated;

DROP POLICY IF EXISTS educart_r14_estado_equipe_ler ON public.educart_inscricoes_estado_r14_dev;
CREATE POLICY educart_r14_estado_equipe_ler ON public.educart_inscricoes_estado_r14_dev
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e
    WHERE e.user_id=(SELECT auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
);
DROP POLICY IF EXISTS educart_r14_eventos_equipe_ler ON public.educart_inscricoes_eventos_r14_dev;
CREATE POLICY educart_r14_eventos_equipe_ler ON public.educart_inscricoes_eventos_r14_dev
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e
    WHERE e.user_id=(SELECT auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
);

-- Uma operação é atômica: se qualquer integrante do lote falhar, NADA é aplicado.
-- SECURITY DEFINER restrito: checa JWT, membership e papel na função,
-- recebe apenas operações enumeradas, usa SQL estático e não autoriza DELETE.
CREATE OR REPLACE FUNCTION public.educart_r14_gerir_inscricoes_dev(
  p_ids uuid[], p_operacao text, p_motivo text,
  p_edicao jsonb DEFAULT '{}'::jsonb,
  p_antes jsonb DEFAULT '{}'::jsonb,
  p_esperados jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_reg public.inscricoes_oficina%ROWTYPE;
  v_id uuid;
  v_key text;
  v_valor text;
  v_anterior text;
  v_antes jsonb;
  v_depois jsonb;
  v_arquivada boolean;
  v_nova_arquivada boolean;
  v_total integer := 0;
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
     OR NOT EXISTS (SELECT 1 FROM public.equipe_papeis e
                    WHERE e.user_id=v_uid AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Operação exclusiva da Coordenação autorizada' USING ERRCODE='42501';
  END IF;
  IF p_operacao IS NULL OR p_operacao NOT IN ('cancelar','arquivar','desarquivar','editar')
     OR p_motivo IS NULL OR char_length(btrim(p_motivo)) NOT BETWEEN 8 AND 500 THEN
    RAISE EXCEPTION 'Operação ou justificativa inválida' USING ERRCODE='22023';
  END IF;
  IF p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 25
     OR EXISTS (SELECT 1 FROM unnest(p_ids) AS x(id) WHERE x.id IS NULL)
     OR (SELECT count(DISTINCT x.id) FROM unnest(p_ids) AS x(id))<>cardinality(p_ids) THEN
    RAISE EXCEPTION 'Seleção inválida ou acima de 25 inscrições' USING ERRCODE='22023';
  END IF;
  IF p_esperados IS NULL OR jsonb_typeof(p_esperados)<>'object' THEN
    RAISE EXCEPTION 'Versões esperadas ausentes' USING ERRCODE='22023';
  END IF;
  IF p_operacao='editar' THEN
    IF cardinality(p_ids)<>1 OR p_edicao IS NULL OR jsonb_typeof(p_edicao)<>'object'
      OR p_antes IS NULL OR jsonb_typeof(p_antes)<>'object'
      OR p_edicao='{}'::jsonb THEN
      RAISE EXCEPTION 'Edite uma única ficha com valores anteriores' USING ERRCODE='22023';
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_edicao) AS f(chave)
       WHERE f.chave NOT IN ('nome_completo','email','telefone_whatsapp',
           'endereco_bairro','cidade_estado','objetivo','como_conheceu')) THEN
      RAISE EXCEPTION 'Campo não permitido nesta operação' USING ERRCODE='22023';
    END IF;
  ELSIF coalesce(p_edicao,'{}'::jsonb)<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Dados de edição não admitidos na operação' USING ERRCODE='22023';
  END IF;

  FOR v_reg IN SELECT * FROM public.inscricoes_oficina i
    WHERE i.id=ANY(p_ids) ORDER BY i.id FOR UPDATE
  LOOP
    v_total:=v_total+1;
    v_id:=v_reg.id;
    IF p_esperados->>(v_id::text) IS DISTINCT FROM v_reg.status THEN
      RAISE EXCEPTION 'Ficha alterada desde a leitura; recarregue' USING ERRCODE='40001';
    END IF;

    IF p_operacao='cancelar' THEN
      IF v_reg.status NOT IN ('pendente_confirmacao','confirmado')
         OR EXISTS (SELECT 1 FROM public.matriculas m WHERE m.candidatura_id=v_id)
         OR EXISTS (SELECT 1 FROM public.educart_ingressos_dev g WHERE g.candidatura_id=v_id) THEN
        RAISE EXCEPTION 'Matrícula, ingresso ou situação não permite cancelamento' USING ERRCODE='23514';
      END IF;
      UPDATE public.inscricoes_oficina SET status='cancelado' WHERE id=v_id;
      INSERT INTO public.educart_inscricoes_eventos_r14_dev
        (inscricao_id,acao,motivo,antes,depois,registrado_por)
      VALUES (v_id,'cancelar',btrim(p_motivo),jsonb_build_object('status',v_reg.status),
        '{"status":"cancelado"}'::jsonb,v_uid);

    ELSIF p_operacao IN ('arquivar','desarquivar') THEN
      SELECT e.arquivada INTO v_arquivada
        FROM public.educart_inscricoes_estado_r14_dev e WHERE e.inscricao_id=v_id FOR UPDATE;
      v_arquivada:=coalesce(v_arquivada,false);
      v_nova_arquivada:=(p_operacao='arquivar');
      IF v_arquivada=v_nova_arquivada THEN
        RAISE EXCEPTION 'A inscrição já está neste estado de arquivo' USING ERRCODE='23514';
      END IF;
      INSERT INTO public.educart_inscricoes_estado_r14_dev
        (inscricao_id,arquivada,atualizado_por)
      VALUES (v_id,v_nova_arquivada,v_uid)
      ON CONFLICT (inscricao_id) DO UPDATE
        SET arquivada=EXCLUDED.arquivada, atualizado_por=EXCLUDED.atualizado_por,
            atualizado_em=now();
      INSERT INTO public.educart_inscricoes_eventos_r14_dev
        (inscricao_id,acao,motivo,antes,depois,registrado_por)
      VALUES (v_id,p_operacao,btrim(p_motivo),
        jsonb_build_object('arquivada',v_arquivada),
        jsonb_build_object('arquivada',v_nova_arquivada),v_uid);

    ELSE
      IF v_reg.status='matriculado'
         OR EXISTS (SELECT 1 FROM public.matriculas m WHERE m.candidatura_id=v_id)
         OR EXISTS (SELECT 1 FROM public.educart_ingressos_dev g WHERE g.candidatura_id=v_id) THEN
        RAISE EXCEPTION 'Ficha ligada à matrícula/ingresso exige procedimento próprio' USING ERRCODE='23514';
      END IF;
      v_antes:='{}'::jsonb; v_depois:='{}'::jsonb;
      FOR v_key IN SELECT jsonb_object_keys(p_edicao) LOOP
        v_valor:=btrim(p_edicao->>v_key);
        v_anterior:=to_jsonb(v_reg)->>v_key;
        IF NOT (p_antes ? v_key)
           OR (p_antes->>v_key) IS DISTINCT FROM v_anterior THEN
          RAISE EXCEPTION 'Ficha alterada desde a leitura; recarregue' USING ERRCODE='40001';
        END IF;
        IF v_valor IS NULL OR char_length(v_valor)<2 OR char_length(v_valor)>250 THEN
          RAISE EXCEPTION 'Dados inválidos para %',v_key USING ERRCODE='22023';
        END IF;
        IF v_key='email' AND (char_length(v_valor)>254 OR v_valor !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
          RAISE EXCEPTION 'E-mail inválido' USING ERRCODE='22023';
        END IF;
        IF v_key='telefone_whatsapp'
          AND (char_length(regexp_replace(v_valor,'[^0-9]','','g')) NOT BETWEEN 10 AND 13) THEN
          RAISE EXCEPTION 'Telefone inválido' USING ERRCODE='22023';
        END IF;
        IF v_valor IS DISTINCT FROM v_anterior THEN
          v_antes:=v_antes||jsonb_build_object(v_key,v_anterior);
          v_depois:=v_depois||jsonb_build_object(v_key,v_valor);
        END IF;
      END LOOP;
      IF v_depois='{}'::jsonb THEN
        RAISE EXCEPTION 'Nenhuma alteração realizada' USING ERRCODE='22023';
      END IF;
      UPDATE public.inscricoes_oficina SET
        nome_completo=coalesce(v_depois->>'nome_completo',nome_completo),
        email=coalesce(v_depois->>'email',email),
        telefone_whatsapp=coalesce(v_depois->>'telefone_whatsapp',telefone_whatsapp),
        endereco_bairro=coalesce(v_depois->>'endereco_bairro',endereco_bairro),
        cidade_estado=coalesce(v_depois->>'cidade_estado',cidade_estado),
        objetivo=coalesce(v_depois->>'objetivo',objetivo),
        como_conheceu=coalesce(v_depois->>'como_conheceu',como_conheceu)
      WHERE id=v_id;
      INSERT INTO public.educart_inscricoes_eventos_r14_dev
        (inscricao_id,acao,motivo,antes,depois,registrado_por)
      VALUES (v_id,'editar',btrim(p_motivo),v_antes,v_depois,v_uid);
    END IF;
  END LOOP;
  IF v_total<>cardinality(p_ids) THEN
    RAISE EXCEPTION 'Seleção incompleta: operação integralmente cancelada' USING ERRCODE='P0002';
  END IF;
  RETURN jsonb_build_object('alteradas',v_total,'acao',p_operacao);
END
$$;

REVOKE ALL ON FUNCTION public.educart_r14_gerir_inscricoes_dev(uuid[],text,text,jsonb,jsonb,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r14_gerir_inscricoes_dev(uuid[],text,text,jsonb,jsonb,jsonb)
  TO authenticated;

-- Análise somente leitura: NUNCA exclui, NUNCA indica autorização automática.
CREATE OR REPLACE FUNCTION public.educart_r14_analisar_exclusao_dev(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid:=auth.uid();
  v_status text;
  v_matriculas bigint;
  v_ingressos bigint;
  v_atendimentos bigint;
  v_eventos bigint;
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
     OR NOT EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Análise reservada à Coordenação' USING ERRCODE='42501';
  END IF;
  SELECT i.status INTO v_status FROM public.inscricoes_oficina i WHERE i.id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inscrição não encontrada' USING ERRCODE='P0002'; END IF;
  SELECT count(*) INTO v_matriculas FROM public.matriculas WHERE candidatura_id=p_id;
  SELECT count(*) INTO v_ingressos FROM public.educart_ingressos_dev WHERE candidatura_id=p_id;
  SELECT count(*) INTO v_atendimentos FROM public.educart_atendimentos_r12_dev WHERE inscricao_id=p_id;
  SELECT count(*) INTO v_eventos FROM public.educart_inscricoes_eventos_r14_dev WHERE inscricao_id=p_id;
  RETURN jsonb_build_object(
    'status',v_status,
    'matriculas',v_matriculas,'ingressos',v_ingressos,
    'atendimentos',v_atendimentos,'auditorias',v_eventos,
    'sem_vinculos_conhecidos',v_matriculas+v_ingressos+v_atendimentos+v_eventos=0 AND v_status<>'matriculado',
    'exclusao_habilitada',false,
    'aviso','Análise preliminar de vínculos: não autoriza exclusão. Exige avaliação jurídica, retenção e aprovação expressa.'
  );
END
$$;
REVOKE ALL ON FUNCTION public.educart_r14_analisar_exclusao_dev(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r14_analisar_exclusao_dev(uuid) TO authenticated;

COMMIT;
