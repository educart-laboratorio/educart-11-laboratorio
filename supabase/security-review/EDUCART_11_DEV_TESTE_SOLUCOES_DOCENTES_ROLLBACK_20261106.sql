-- EducART 1.1 R14 - teste transacional REAL contra DEV, inteiramente reversível.
-- Nunca rodar no Supabase produção. Os nomes SINT-R14 são dados sintéticos; ROLLBACK obrigatório.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (
  SELECT adm.user_id::text
  FROM public.portal_admins adm
  JOIN public.equipe_papeis e ON e.user_id=adm.user_id AND e.papel='coordenacao'
  LIMIT 1
),true);
SET LOCAL ROLE authenticated;
DO $do$
DECLARE
  docente uuid;
  formacao uuid;
  turma uuid;
  dados record;
  uid_coordenacao uuid := auth.uid();
  texto text := substr(md5(clock_timestamp()::text),1,9);
  falhou boolean;
BEGIN
  IF uid_coordenacao IS NULL THEN RAISE EXCEPTION 'R14: faltou contexto da Coordenação'; END IF;
  -- A solução pode existir como rascunho antes de contratar professor ou abrir turma.
  INSERT INTO public.formacoes(nome,tipo,publicada,chamada_curta,idade_minima,
    valor_matricula_referencia_centavos,valor_mensalidade_referencia_centavos)
  VALUES ('SINT-R14-So-Solucao-'||texto,'oficina',false,'Oficina fictícia independente',0,0,12000)
  RETURNING id INTO formacao;
  IF EXISTS(SELECT 1 FROM public.turmas t WHERE t.formacao_id=formacao) THEN
    RAISE EXCEPTION 'Solução independente criou turma indevida';
  END IF;

  INSERT INTO public.educart_docentes_dev(nome_completo,areas_atuacao,disponibilidade)
    VALUES ('SINT-R14-Professor-'||texto,'Teatro de teste','sábado 15h-17h')
    RETURNING id INTO docente;

  SELECT * INTO dados
  FROM public.educart_criar_formacao_turma_guiada_dev(
    NULL,
    jsonb_build_object(
      'nome','SINT-R14-Solução-'||texto,'tipo','curso','formato','presencial',
      'descricao','Solução fictícia para teste','idade_minima','0',
      'duracao_meses','24','carga_horaria_horas','120',
      'chamada_curta','Projeto fictício seguro','disciplinas','Teatro\nCanto',
      'certificacao','Certificado fictício','valor_matricula_referencia_centavos',5000,
      'valor_mensalidade_referencia_centavos',32000,'quantidade_mensalidades_referencia',24
    ),
    jsonb_build_object(
      'codigo','SINT-R14-'||upper(texto),'capacidade','20',
      'docente_id',docente,'local_nome','Laboratório',
      'horarios_semanais',jsonb_build_array(jsonb_build_object('dia',6,'inicio','15:00','fim','17:00'))
    )
  );
  formacao:=dados.formacao_id;turma:=dados.turma_id;
  IF formacao IS NULL OR turma IS NULL THEN RAISE EXCEPTION 'RPC não retornou IDs'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.turmas t
    WHERE t.id=turma AND t.docente_id=docente AND t.situacao='planejada'
      AND jsonb_array_length(t.horarios_semanais)=1
  ) THEN RAISE EXCEPTION 'Turma sem docente ou horário próprio'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.formacoes f
    WHERE f.id=formacao AND f.publicada=false AND f.valor_matricula_referencia_centavos=5000
      AND f.valor_mensalidade_referencia_centavos=32000
      AND f.quantidade_mensalidades_referencia=24 AND f.idade_minima=0
  ) THEN RAISE EXCEPTION 'Oferta comercial não gravada corretamente'; END IF;

  falhou:=false;
  BEGIN
    INSERT INTO public.turmas(formacao_id,codigo,situacao,capacidade)
    VALUES (formacao,'SINT-R14-SEM-DOCENTE-'||texto,'planejada',10);
  EXCEPTION WHEN OTHERS THEN falhou:=true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'Inserção de turma sem professor não foi bloqueada'; END IF;

  -- Simula autenticação não vinculada, com papel SQL autenticado e UID arbitrário.
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  IF EXISTS(SELECT 1 FROM public.educart_docentes_dev d WHERE d.id=docente) THEN
    RAISE EXCEPTION 'Professor privado exposto ao intruso';
  END IF;
  IF EXISTS(SELECT 1 FROM public.formacoes f WHERE f.id=formacao) THEN
    RAISE EXCEPTION 'Oferta em rascunho exposta ao intruso';
  END IF;
  IF EXISTS(SELECT 1 FROM public.turmas t WHERE t.id=turma) THEN
    RAISE EXCEPTION 'Turma privada exposta ao intruso';
  END IF;
  falhou:=false;
  BEGIN
    PERFORM * FROM public.educart_criar_formacao_turma_guiada_dev(
      formacao,'{}'::jsonb,
      jsonb_build_object('codigo','SINT-R14-INTRUSO-'||texto,'docente_id',docente,
        'horarios_semanais',jsonb_build_array(jsonb_build_object('dia',6,'inicio','15:00','fim','17:00')))
    );
  EXCEPTION WHEN OTHERS THEN falhou:=true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'Intruso criou turma'; END IF;
END $do$;
RESET ROLE;
ROLLBACK;
