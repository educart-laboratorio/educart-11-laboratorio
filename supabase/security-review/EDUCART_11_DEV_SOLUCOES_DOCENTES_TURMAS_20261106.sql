-- AutoDEV LIPE · EducART 1.1 | Núcleo comercial: solução -> professor -> turma -> matrícula
-- Adição compatível no DEV, não abre catálogo, não altera produção, não cria dívidas.
-- A versão anterior da RPC continua com MESMA assinatura, para preservar o cliente existente.
CREATE TABLE IF NOT EXISTS public.educart_docentes_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL CHECK (char_length(trim(nome_completo)) BETWEEN 3 AND 150),
  nome_artistico text,
  email text,
  whatsapp text,
  instagram text,
  formacao_profissional text,
  areas_atuacao text,
  experiencia_profissional text,
  minibiografia text,
  disponibilidade text,
  autorizou_divulgacao boolean NOT NULL DEFAULT false,
  situacao text NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo','inativo')),
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educart_docentes_email_valido_ck CHECK (email IS NULL OR (char_length(email)<=254 AND position('@' in email)>1)),
  CONSTRAINT educart_docentes_whatsapp_valido_ck CHECK (whatsapp IS NULL OR char_length(whatsapp)<=30),
  CONSTRAINT educart_docentes_bio_limite_ck CHECK (minibiografia IS NULL OR char_length(minibiografia)<=4000)
);
ALTER TABLE public.educart_docentes_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_docentes_dev FROM PUBLIC, anon;
GRANT SELECT,INSERT,UPDATE ON public.educart_docentes_dev TO authenticated;
CREATE POLICY educart_docentes_coordenacao_dev ON public.educart_docentes_dev
  FOR ALL TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND criado_por=(SELECT auth.uid())
    AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
  );
COMMENT ON TABLE public.educart_docentes_dev IS 'Cadastro privado de professores vinculáveis a várias turmas; não cria login, não publica perfil, não integra PII de estudantes.';

ALTER TABLE public.formacoes
  ADD COLUMN IF NOT EXISTS chamada_curta text,
  ADD COLUMN IF NOT EXISTS formato text NOT NULL DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS objetivos text,
  ADD COLUMN IF NOT EXISTS disciplinas text,
  ADD COLUMN IF NOT EXISTS metodologia text,
  ADD COLUMN IF NOT EXISTS competencias text,
  ADD COLUMN IF NOT EXISTS atividades_praticas text,
  ADD COLUMN IF NOT EXISTS certificacao text,
  ADD COLUMN IF NOT EXISTS projeto_final text,
  ADD COLUMN IF NOT EXISTS materiais_inclusos text,
  ADD COLUMN IF NOT EXISTS perguntas_frequentes text,
  ADD COLUMN IF NOT EXISTS valor_matricula_referencia_centavos integer,
  ADD COLUMN IF NOT EXISTS valor_mensalidade_referencia_centavos integer,
  ADD COLUMN IF NOT EXISTS quantidade_mensalidades_referencia integer;
-- A idade de 14 anos é da turma adulta 1.0, NÃO um limite universal de todas as soluções.
-- Cursos futuros para crianças ficam sujeitos à legislação, autorização e triagem próprias.
ALTER TABLE public.formacoes DROP CONSTRAINT IF EXISTS educart_formacao_idade_minima_dev_ck;
ALTER TABLE public.formacoes ADD CONSTRAINT educart_formacao_idade_minima_dev_ck
  CHECK (idade_minima IS NULL OR idade_minima BETWEEN 0 AND 120);

ALTER TABLE public.formacoes
  ADD CONSTRAINT educart_solucao_formato_dev_ck CHECK (formato IN ('presencial','online','hibrido')),
  ADD CONSTRAINT educart_solucao_chamada_dev_ck CHECK (chamada_curta IS NULL OR char_length(chamada_curta)<=180),
  ADD CONSTRAINT educart_solucao_matricula_dev_ck CHECK (valor_matricula_referencia_centavos IS NULL OR valor_matricula_referencia_centavos BETWEEN 0 AND 10000000),
  ADD CONSTRAINT educart_solucao_mensal_dev_ck CHECK (valor_mensalidade_referencia_centavos IS NULL OR valor_mensalidade_referencia_centavos BETWEEN 0 AND 10000000),
  ADD CONSTRAINT educart_solucao_quantidade_dev_ck CHECK (quantidade_mensalidades_referencia IS NULL OR quantidade_mensalidades_referencia BETWEEN 1 AND 120);
COMMENT ON COLUMN public.formacoes.disciplinas IS 'Linhas do conteúdo programático; não substitui tabela modulos. Inspiração: 8 áreas da Formação de Atores 1.0.';
COMMENT ON COLUMN public.formacoes.valor_mensalidade_referencia_centavos IS 'Valor editorial da oferta; não confirma preço individual nem cria parcelas R11 ou pagamentos.';
COMMENT ON COLUMN public.formacoes.quantidade_mensalidades_referencia IS 'Quantidade informativa de mensalidades; plano financeiro individual R11 é operação distinta.';

ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS docente_id uuid
  REFERENCES public.educart_docentes_dev(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS educart_turmas_docente_id_dev_idx ON public.turmas(docente_id);
COMMENT ON COLUMN public.turmas.docente_id IS 'Professor principal vinculado à turma. Turmas históricas sem professor mantêm NULL para conferência posterior.';

-- Impedir turmas novas sem docente; registros históricos não são reescritos.
CREATE OR REPLACE FUNCTION public.educart_exigir_docente_turma_dev()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
  IF NEW.docente_id IS NULL THEN
    RAISE EXCEPTION 'Cadastre e selecione um professor antes de criar uma turma';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.educart_docentes_dev d
    WHERE d.id=NEW.docente_id AND d.situacao='ativo'
  ) THEN
    RAISE EXCEPTION 'Professor inativo ou sem cadastro válido';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS educart_turmas_professor_obrigatorio_dev ON public.turmas;
CREATE TRIGGER educart_turmas_professor_obrigatorio_dev
BEFORE INSERT ON public.turmas FOR EACH ROW
EXECUTE FUNCTION public.educart_exigir_docente_turma_dev();

-- Os novos dados comerciais em rascunho não podem ser lidos por qualquer conta Auth.
-- Antes: formacoes_ler_autenticados USING (true). Agora: equipe ou vínculo acadêmico.
DROP POLICY IF EXISTS formacoes_ler_autenticados ON public.formacoes;
CREATE POLICY educart_formacoes_equipe_e_titular_r14_dev ON public.formacoes
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) IS NOT NULL AND (
      (
        EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
        AND EXISTS (
          SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid())
          AND ep.papel IN ('coordenacao','secretaria')
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.turmas t
        JOIN public.matriculas m ON m.turma_id=t.id
        JOIN public.pessoas p ON p.id=m.pessoa_id
        WHERE t.formacao_id=formacoes.id AND p.auth_user_id=(SELECT auth.uid())
      )
    )
  );

-- Manter o único RPC transacional existente, acrescentando cadastro comercial e docente.
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
  v_docente_id uuid;
  v_docente_nome text;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
     OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                   WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Somente Coordenação autorizada pode concluir o planejamento' USING ERRCODE='42501';
  END IF;
  IF (p_turma->>'docente_id') IS NULL OR (p_turma->>'docente_id') = '' THEN
    RAISE EXCEPTION 'Selecione um professor previamente cadastrado para a turma';
  END IF;
  BEGIN
    v_docente_id := (p_turma->>'docente_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Identificador do professor inválido';
  END;
  SELECT d.nome_completo INTO v_docente_nome
    FROM public.educart_docentes_dev d
    WHERE d.id=v_docente_id AND d.situacao='ativo';
  IF v_docente_nome IS NULL THEN
    RAISE EXCEPTION 'Professor inexistente, inativo ou não autorizado';
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
      AND (p_formacao->>'idade_minima')::integer NOT BETWEEN 0 AND 120 THEN
      RAISE EXCEPTION 'Idade mínima inválida';
    END IF;
    INSERT INTO public.formacoes(
      nome,tipo,publicada,descricao,publico_alvo,idade_minima,exige_experiencia,
      duracao_meses,carga_horaria_horas,ementa,modulos_planejados,avaliacao,criterios_conclusao,
      chamada_curta,formato,objetivos,disciplinas,metodologia,competencias,atividades_praticas,
      certificacao,projeto_final,materiais_inclusos,perguntas_frequentes,
      valor_matricula_referencia_centavos,valor_mensalidade_referencia_centavos,quantidade_mensalidades_referencia
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
      nullif(trim(p_formacao->>'criterios_conclusao'),''),
      nullif(trim(p_formacao->>'chamada_curta'),''),
      coalesce(nullif(p_formacao->>'formato',''),'presencial'),
      nullif(trim(p_formacao->>'objetivos'),''),
      nullif(trim(p_formacao->>'disciplinas'),''),
      nullif(trim(p_formacao->>'metodologia'),''),
      nullif(trim(p_formacao->>'competencias'),''),
      nullif(trim(p_formacao->>'atividades_praticas'),''),
      nullif(trim(p_formacao->>'certificacao'),''),
      nullif(trim(p_formacao->>'projeto_final'),''),
      nullif(trim(p_formacao->>'materiais_inclusos'),''),
      nullif(trim(p_formacao->>'perguntas_frequentes'),''),
      nullif(p_formacao->>'valor_matricula_referencia_centavos','')::integer,
      nullif(p_formacao->>'valor_mensalidade_referencia_centavos','')::integer,
      nullif(p_formacao->>'quantidade_mensalidades_referencia','')::integer
    ) RETURNING id INTO v_formacao_id;
  END IF;

  INSERT INTO public.turmas(
    formacao_id,codigo,inicio_em,termina_em,capacidade,situacao,
    responsavel_nome,local_nome,local_endereco,inscricoes_abrem_em,
    inscricoes_encerram_em,horarios_semanais,docente_id
  ) VALUES (
    v_formacao_id,v_codigo,v_inicio_turma,v_fim_turma,v_capacidade,'planejada',
    v_docente_nome,
    nullif(trim(p_turma->>'local_nome'),''),
    nullif(trim(p_turma->>'local_endereco'),''),
    v_abertura,v_encerramento,v_horarios,v_docente_id
  ) RETURNING id INTO v_turma_id;

  RETURN QUERY SELECT v_formacao_id,v_turma_id;
END
$$;


REVOKE ALL ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) TO authenticated;
COMMENT ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb)
IS 'Coordenação: cria solução não publicada e sua primeira turma planejada com professor cadastrado e horários próprios, atomicamente.';
