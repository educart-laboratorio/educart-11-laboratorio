
-- EducART DEV: fluxo enxuto inscricao -> matricula -> mensalidade paga/pendente.
-- Mantem contratos e rotas financeiros legados; nenhuma operacao de Pix neste novo fluxo.
CREATE TABLE IF NOT EXISTS public.educart_condicoes_mensalidade_dev (
  matricula_id uuid PRIMARY KEY REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  valor_base_centavos integer NOT NULL CHECK (valor_base_centavos IN (28000,30000,32000)),
  bolsa text NOT NULL CHECK (bolsa IN ('nenhuma','integral','meia','outra')),
  valor_devido_centavos integer NOT NULL CHECK (valor_devido_centavos >= 0),
  primeira_competencia date NOT NULL CHECK (primeira_competencia = date_trunc('month', primeira_competencia::timestamp)::date),
  dia_vencimento smallint NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 28),
  registrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educart_bolsa_valor_coerente_dev CHECK (
    (bolsa = 'nenhuma' AND valor_devido_centavos = valor_base_centavos)
    OR (bolsa = 'integral' AND valor_devido_centavos = 0)
    OR (bolsa = 'meia' AND valor_devido_centavos * 2 = valor_base_centavos)
    OR (bolsa = 'outra' AND valor_devido_centavos > 0 AND valor_devido_centavos < valor_base_centavos)
  )
);
ALTER TABLE public.educart_condicoes_mensalidade_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_condicoes_mensalidade_dev FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.educart_condicoes_mensalidade_dev TO authenticated;
DROP POLICY IF EXISTS educart_condicoes_mensalidade_select_coordenacao_dev ON public.educart_condicoes_mensalidade_dev;
CREATE POLICY educart_condicoes_mensalidade_select_coordenacao_dev ON public.educart_condicoes_mensalidade_dev
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id = (SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id = (SELECT auth.uid()) AND e.papel = 'coordenacao')
);

-- A portaria legada para Pix permanece funcionando, mas esta RPC pode alterar
-- estados via uma autorizacao distinta, apenas sob SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.educart_bloquear_status_financeiro_direto_dev()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp'
AS $$
DECLARE v_trocou_financeiro boolean := false;
BEGIN
  IF tg_table_name='matriculas' THEN
    v_trocou_financeiro := (old.situacao='ativa' and new.situacao is distinct from 'ativa')
      or (new.situacao='ativa' and old.situacao is distinct from 'ativa');
  ELSIF tg_table_name='inscricoes_oficina' THEN
    v_trocou_financeiro := (old.status='matriculado' and new.status is distinct from 'matriculado')
      or (new.status='matriculado' and old.status is distinct from 'matriculado');
  ELSIF tg_table_name='mensalidades_formacao' THEN
    v_trocou_financeiro := (old.status='pago' and new.status is distinct from 'pago')
      or (new.status='pago' and old.status is distinct from 'pago');
  END IF;
  IF v_trocou_financeiro
    AND current_setting('educart.pix_conferencia_rpc',true) IS DISTINCT FROM 'true'
    AND current_setting('educart.ingresso_simples_rpc',true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Estado financeiro protegido: use a operacao de gestao autorizada'
    USING errcode='42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.educart_bloquear_status_financeiro_direto_dev() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.educart_matricular_simples_dev(
 p_inscricao_id uuid,
 p_turma_id uuid,
 p_valor_base_centavos integer,
 p_bolsa text,
 p_valor_outro_centavos integer DEFAULT NULL,
 p_pessoa_existente_id uuid DEFAULT NULL
) RETURNS TABLE(matricula_id uuid,pessoa_id uuid,primeira_competencia date,valor_devido_centavos integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
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
   ON CONFLICT (matricula_id,competencia) DO NOTHING;
 END IF;
 RETURN QUERY SELECT v_id,v_pessoa,v_competencia,v_devido;
END;
$$;
REVOKE ALL ON FUNCTION public.educart_matricular_simples_dev(uuid,uuid,integer,text,integer,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.educart_matricular_simples_dev(uuid,uuid,integer,text,integer,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.educart_sincronizar_mensalidades_simples_dev()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_quantidade integer;
BEGIN
 IF v_uid IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
 OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao') THEN
   RAISE EXCEPTION 'Somente Coordenacao autorizada' USING errcode='42501';
 END IF;
 -- Gera ate o mes corrente, idempotente: nenhum prazo fixo de 12/24 meses foi inventado.
 -- Nao cria mensalidade para bolsa integral nem para matricula encerrada.
 INSERT INTO public.mensalidades_formacao
 (matricula_id,competencia,vencimento_em,valor_centavos,status,origem)
 SELECT c.matricula_id,g.competencia::date,
        (g.competencia::date+c.dia_vencimento-1),c.valor_devido_centavos,'pendente','manual'
 FROM public.educart_condicoes_mensalidade_dev c
 JOIN public.matriculas m ON m.id=c.matricula_id AND m.situacao='ativa'
 CROSS JOIN LATERAL pg_catalog.generate_series(
   c.primeira_competencia::timestamp,
   date_trunc('month',(now() AT TIME ZONE 'America/Bahia'))::timestamp,
   INTERVAL '1 month'
 ) AS g(competencia)
 WHERE c.valor_devido_centavos>0
 ON CONFLICT (matricula_id,competencia) DO NOTHING;
 GET DIAGNOSTICS v_quantidade = ROW_COUNT;
 RETURN v_quantidade;
END;
$$;
REVOKE ALL ON FUNCTION public.educart_sincronizar_mensalidades_simples_dev() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.educart_sincronizar_mensalidades_simples_dev() TO authenticated;

CREATE OR REPLACE FUNCTION public.educart_definir_pagamento_simples_dev(
 p_matricula_id uuid, p_competencia date, p_pago boolean
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
 v_uid uuid := auth.uid();
 v_status text;
BEGIN
 IF v_uid IS NULL
 OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
 OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao') THEN
   RAISE EXCEPTION 'Somente Coordenacao autorizada' USING errcode='42501';
 END IF;
 IF p_pago IS NULL OR p_competencia IS NULL OR
 p_competencia IS DISTINCT FROM date_trunc('month',p_competencia::timestamp)::date THEN
   RAISE EXCEPTION 'Informe competencia mensal e estado de pagamento' USING errcode='22023';
 END IF;
 IF NOT EXISTS(
   SELECT 1 FROM public.educart_condicoes_mensalidade_dev c
   JOIN public.matriculas m ON m.id=c.matricula_id
   WHERE c.matricula_id=p_matricula_id AND m.situacao='ativa' AND c.valor_devido_centavos>0
 ) THEN
   RAISE EXCEPTION 'Matricula ou mensalidade indisponivel para alterar' USING errcode='22023';
 END IF;
 PERFORM pg_catalog.set_config('educart.ingresso_simples_rpc','true',true);
 UPDATE public.mensalidades_formacao
 SET status=CASE WHEN p_pago THEN 'pago' ELSE 'pendente' END,
     pago_em=CASE WHEN p_pago THEN now() ELSE NULL END,
     confirmado_por=CASE WHEN p_pago THEN v_uid ELSE NULL END,
     confirmado_em=CASE WHEN p_pago THEN now() ELSE NULL END
 WHERE matricula_id=p_matricula_id AND competencia=p_competencia
   AND status IN ('pendente','pago')
 RETURNING status INTO v_status;
 IF NOT FOUND THEN RAISE EXCEPTION 'Mensalidade nao encontrada' USING errcode='P0002'; END IF;
 RETURN v_status;
END;
$$;
REVOKE ALL ON FUNCTION public.educart_definir_pagamento_simples_dev(uuid,date,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.educart_definir_pagamento_simples_dev(uuid,date,boolean) TO authenticated;
