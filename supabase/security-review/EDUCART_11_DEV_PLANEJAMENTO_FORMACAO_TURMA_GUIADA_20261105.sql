-- EducART 1.1 LAB | Formação + primeira turma guiadas, com horários por turma
-- Aplicar somente no Supabase DEV esjrjzyvyhtzwgihcbsc; não publicar em PROD.
-- Base existente: public.formacoes e public.turmas, com RLS institucional.
ALTER TABLE public.formacoes
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS publico_alvo text,
  ADD COLUMN IF NOT EXISTS idade_minima integer,
  ADD COLUMN IF NOT EXISTS exige_experiencia boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duracao_meses integer,
  ADD COLUMN IF NOT EXISTS carga_horaria_horas integer,
  ADD COLUMN IF NOT EXISTS ementa text,
  ADD COLUMN IF NOT EXISTS modulos_planejados text,
  ADD COLUMN IF NOT EXISTS avaliacao text,
  ADD COLUMN IF NOT EXISTS criterios_conclusao text;

ALTER TABLE public.turmas
  ADD COLUMN IF NOT EXISTS responsavel_nome text,
  ADD COLUMN IF NOT EXISTS local_nome text,
  ADD COLUMN IF NOT EXISTS local_endereco text,
  ADD COLUMN IF NOT EXISTS inscricoes_abrem_em date,
  ADD COLUMN IF NOT EXISTS inscricoes_encerram_em date,
  ADD COLUMN IF NOT EXISTS horarios_semanais jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.formacoes
  ADD CONSTRAINT educart_formacao_idade_minima_dev_ck CHECK (idade_minima IS NULL OR idade_minima BETWEEN 14 AND 120),
  ADD CONSTRAINT educart_formacao_duracao_dev_ck CHECK (duracao_meses IS NULL OR duracao_meses BETWEEN 1 AND 240),
  ADD CONSTRAINT educart_formacao_carga_dev_ck CHECK (carga_horaria_horas IS NULL OR carga_horaria_horas BETWEEN 1 AND 10000);

ALTER TABLE public.turmas
  ADD CONSTRAINT educart_turma_horarios_array_dev_ck CHECK (jsonb_typeof(horarios_semanais)='array' AND jsonb_array_length(horarios_semanais)<=7),
  ADD CONSTRAINT educart_turma_inscricoes_datas_dev_ck CHECK (
    inscricoes_abrem_em IS NULL OR inscricoes_encerram_em IS NULL OR inscricoes_abrem_em<=inscricoes_encerram_em
  );

COMMENT ON COLUMN public.formacoes.modulos_planejados IS 'Resumo editorial dos módulos; não substitui a tabela relacional modulos.';
COMMENT ON COLUMN public.turmas.horarios_semanais IS 'Grade semanal exclusiva desta turma [{dia:0..6,inicio:HH:MM,fim:HH:MM}]. Não deriva horário da formação.';

CREATE OR REPLACE FUNCTION public.educart_criar_formacao_turma_guiada_dev(
  p_formacao_existente uuid,
  p_formacao jsonb,
  p_turma jsonb
) RETURNS TABLE(formacao_id uuid, turma_id uuid)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
DECLARE
  v_formacao_id uuid;
  v_turma_id uuid;
  v_nome text := trim(coalesce(p_formacao->>'nome',''));
  v_tipo text := coalesce(p_formacao->>'tipo','curso');
  v_codigo text := upper(trim(coalesce(p_turma->>'codigo','')));
  v_horarios jsonb := coalesce(p_turma->'horarios_semanais','[]'::jsonb);
  v_item jsonb;
  v_dia integer;
  v_dias integer[] := ARRAY[]::integer[];
  v_inicio text;
  v_fim text;
  v_inicio_turma date;
  v_fim_turma date;
  v_abertura date;
  v_encerramento date;
  v_capacidade integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
     OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                   WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Somente Coordenação autorizada pode concluir o planejamento' USING ERRCODE='42501';
  END IF;
  IF p_turma IS NULL OR jsonb_typeof(p_turma)<>'object' THEN
    RAISE EXCEPTION 'Ficha de turma inválida';
  END IF;
  IF v_codigo !~ '^[A-Z0-9][A-Z0-9._-]{2,39}$' THEN
    RAISE EXCEPTION 'Código de turma inválido (3 a 40 caracteres)';
  END IF;
  IF NULLIF(p_turma->>'capacidade','') IS NOT NULL THEN
    v_capacidade := (p_turma->>'capacidade')::integer;
    IF v_capacidade NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Capacidade fora do limite'; END IF;
  END IF;
  IF NULLIF(p_turma->>'inicio_em','') IS NOT NULL THEN v_inicio_turma := (p_turma->>'inicio_em')::date; END IF;
  IF NULLIF(p_turma->>'termina_em','') IS NOT NULL THEN v_fim_turma := (p_turma->>'termina_em')::date; END IF;
  IF v_inicio_turma IS NOT NULL AND v_fim_turma IS NOT NULL AND v_fim_turma<v_inicio_turma THEN
    RAISE EXCEPTION 'Término anterior ao início';
  END IF;
  IF NULLIF(p_turma->>'inscricoes_abrem_em','') IS NOT NULL THEN
    v_abertura := (p_turma->>'inscricoes_abrem_em')::date;
  END IF;
  IF NULLIF(p_turma->>'inscricoes_encerram_em','') IS NOT NULL THEN
    v_encerramento := (p_turma->>'inscricoes_encerram_em')::date;
  END IF;
  IF v_abertura IS NOT NULL AND v_encerramento IS NOT NULL AND v_encerramento<v_abertura THEN
    RAISE EXCEPTION 'Encerramento de inscrições anterior à abertura';
  END IF;
  IF jsonb_typeof(v_horarios) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_horarios) NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Informe de um a sete horários semanais para a turma';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_horarios) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR (v_item->>'dia') NOT IN ('0','1','2','3','4','5','6') THEN
      RAISE EXCEPTION 'Dia da semana inválido';
    END IF;
    v_dia := (v_item->>'dia')::integer;
    IF v_dia=ANY(v_dias) THEN RAISE EXCEPTION 'Dia da semana repetido na turma'; END IF;
    v_dias := array_append(v_dias,v_dia);
    v_inicio := v_item->>'inicio';
    v_fim := v_item->>'fim';
    IF v_inicio IS NULL OR v_fim IS NULL
      OR v_inicio !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR v_fim !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR v_inicio >= v_fim THEN
      RAISE EXCEPTION 'Horário inválido: início deve ser anterior ao fim';
    END IF;
  END LOOP;

  IF p_formacao_existente IS NOT NULL THEN
    SELECT f.id INTO v_formacao_id FROM public.formacoes f WHERE f.id=p_formacao_existente;
    IF v_formacao_id IS NULL THEN RAISE EXCEPTION 'Formação existente não encontrada'; END IF;
  ELSE
    IF jsonb_typeof(p_formacao) IS DISTINCT FROM 'object'
      OR length(v_nome) NOT BETWEEN 3 AND 120 OR v_tipo NOT IN ('curso','oficina') THEN
      RAISE EXCEPTION 'Nome ou tipo da formação inválido';
    END IF;
    IF EXISTS (SELECT 1 FROM public.formacoes f WHERE lower(trim(f.nome))=lower(v_nome)) THEN
      RAISE EXCEPTION 'Já existe uma formação com esse nome: escolha a existente';
    END IF;
    IF NULLIF(p_formacao->>'idade_minima','') IS NOT NULL
      AND (p_formacao->>'idade_minima')::integer NOT BETWEEN 14 AND 120 THEN
      RAISE EXCEPTION 'Idade mínima inválida';
    END IF;
    INSERT INTO public.formacoes(
      nome,tipo,publicada,descricao,publico_alvo,idade_minima,exige_experiencia,
      duracao_meses,carga_horaria_horas,ementa,modulos_planejados,avaliacao,criterios_conclusao
    ) VALUES (
      v_nome,v_tipo,false,nullif(trim(p_formacao->>'descricao'),''),
      nullif(trim(p_formacao->>'publico_alvo'),''),
      nullif(p_formacao->>'idade_minima','')::integer,
      coalesce((p_formacao->>'exige_experiencia')::boolean,false),
      nullif(p_formacao->>'duracao_meses','')::integer,
      nullif(p_formacao->>'carga_horaria_horas','')::integer,
      nullif(trim(p_formacao->>'ementa'),''),
      nullif(trim(p_formacao->>'modulos_planejados'),''),
      nullif(trim(p_formacao->>'avaliacao'),''),
      nullif(trim(p_formacao->>'criterios_conclusao'),'')
    ) RETURNING id INTO v_formacao_id;
  END IF;

  INSERT INTO public.turmas(
    formacao_id,codigo,inicio_em,termina_em,capacidade,situacao,
    responsavel_nome,local_nome,local_endereco,inscricoes_abrem_em,
    inscricoes_encerram_em,horarios_semanais
  ) VALUES (
    v_formacao_id,v_codigo,v_inicio_turma,v_fim_turma,v_capacidade,'planejada',
    nullif(trim(p_turma->>'responsavel_nome'),''),
    nullif(trim(p_turma->>'local_nome'),''),
    nullif(trim(p_turma->>'local_endereco'),''),
    v_abertura,v_encerramento,v_horarios
  ) RETURNING id INTO v_turma_id;

  RETURN QUERY SELECT v_formacao_id,v_turma_id;
END
$$;

REVOKE ALL ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) TO authenticated;
COMMENT ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb)
  IS 'Operação atômica apenas Coordenação: formação opcional + turma planejada com horários exclusivos por turma. Usa RLS das tabelas existentes.';
