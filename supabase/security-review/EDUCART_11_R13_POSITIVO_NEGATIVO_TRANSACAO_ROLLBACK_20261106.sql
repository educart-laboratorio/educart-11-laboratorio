-- EducART R13 | ensaio transacional de RLS POSITIVA e CRUZADA para duas contas Auth DEV existentes.
-- APENAS projeto DEV esjrjzyvyhtzwgihcbsc. Nunca executar na produção.
-- IMPORTANTE: simula papel e claims de UIDs oficiais, NÃO realiza login por Supabase Auth SDK.
-- Gera dados *somente dentro desta transação* e ROLLBACK obrigatório.
-- Requisitos: operador DEV com permissão restrita para criar fixtures transacionais.
BEGIN;
SET LOCAL statement_timeout = '20000';

DO $seed$
DECLARE
  v_a uuid; v_b uuid; v_coord uuid;
  v_form uuid; v_ta uuid; v_tb uuid;
  v_pa uuid; v_pb uuid; v_ma uuid; v_mb uuid;
  v_aa uuid; v_ab uuid;
  v_inicio date := date_trunc('month',current_date)::date;
BEGIN
  SELECT id INTO STRICT v_a FROM auth.users
    WHERE email='r13-estudante-a@example.invalid' AND email_confirmed_at IS NOT NULL;
  SELECT id INTO STRICT v_b FROM auth.users
    WHERE email='r13-estudante-b@example.invalid' AND email_confirmed_at IS NOT NULL;
  IF v_a=v_b OR EXISTS (SELECT 1 FROM public.pessoas WHERE auth_user_id IN (v_a,v_b))
    THEN RAISE EXCEPTION 'Fixture recusada: identidade repetida ou já vinculada'; END IF;
  SELECT pa.user_id INTO STRICT v_coord FROM public.portal_admins pa
    JOIN public.equipe_papeis ep ON ep.user_id=pa.user_id
    WHERE ep.papel='coordenacao' LIMIT 1;

  INSERT INTO public.formacoes(nome,tipo,publicada)
    VALUES ('R13 transação reversível: turma sintética','oficina',false)
    RETURNING id INTO v_form;
  INSERT INTO public.turmas(formacao_id,codigo,situacao)
    VALUES (v_form,'R13-TEMP-A','encerrada') RETURNING id INTO v_ta;
  INSERT INTO public.turmas(formacao_id,codigo,situacao)
    VALUES (v_form,'R13-TEMP-B','encerrada') RETURNING id INTO v_tb;
  INSERT INTO public.pessoas(nome_completo,email,auth_user_id)
    VALUES ('R13 Estudante Sintético A','r13-estudante-a@example.invalid',v_a)
    RETURNING id INTO v_pa;
  INSERT INTO public.pessoas(nome_completo,email,auth_user_id)
    VALUES ('R13 Estudante Sintético B','r13-estudante-b@example.invalid',v_b)
    RETURNING id INTO v_pb;
  -- Situação concluída APENAS nesta fixture transacional; jamais cadastrar matrícula real assim.
  INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao)
    VALUES (v_pa,v_ta,'novo','concluida') RETURNING id INTO v_ma;
  INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao)
    VALUES (v_pb,v_tb,'novo','concluida') RETURNING id INTO v_mb;

  -- O trigger de aulas/chamadas usa identidade institucional. Somente dentro da sessão SQL.
  PERFORM set_config('request.jwt.claim.sub',v_coord::text,true);
  PERFORM set_config('request.jwt.claims',
    jsonb_build_object('sub',v_coord::text,'role','authenticated')::text,true);
  INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao,criada_por)
    VALUES (v_ta,current_date-1,'15:00','17:00','Ensaio R13 A','realizada',v_coord)
    RETURNING id INTO v_aa;
  INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao,criada_por)
    VALUES (v_tb,current_date-1,'15:00','17:00','Ensaio R13 B','realizada',v_coord)
    RETURNING id INTO v_ab;
  INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
    VALUES (v_aa,v_ma,'presente',v_coord,v_coord);
  INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
    VALUES (v_ab,v_mb,'presente',v_coord,v_coord);

  INSERT INTO public.educart_planos_financeiros_r11_dev
    (matricula_id,competencia_inicial,dia_vencimento,valor_parcela_centavos,numero_parcelas,
      situacao,referencia_acordo,registrado_por,ativado_em)
    VALUES
    (v_ma,v_inicio,10,10000,24,'ativo','R13 transação não permanente A',v_coord,now()),
    (v_mb,v_inicio,10,10000,24,'ativo','R13 transação não permanente B',v_coord,now());
  INSERT INTO public.educart_parcelas_financeiras_r11_dev
    (matricula_id,numero,competencia,vencimento_em,valor_centavos,situacao)
    SELECT id, n::smallint,(v_inicio+(n-1)*interval '1 month')::date,
      (v_inicio+(n-1)*interval '1 month'+interval '9 days')::date,10000,'pendente'
    FROM (VALUES(v_ma),(v_mb)) m(id) CROSS JOIN generate_series(1,24) n;
  INSERT INTO public.mensalidades_formacao(matricula_id,competencia,vencimento_em,valor_centavos,status)
    VALUES (v_ma,v_inicio,v_inicio+9,10000,'pendente'),
           (v_mb,v_inicio,v_inicio+9,10000,'pendente');
  INSERT INTO public.educart_fotos_consentimento_dev(pessoa_id,auth_user_id,consentiu)
    VALUES (v_pa,v_a,true),(v_pb,v_b,true);

  PERFORM set_config('educart.r13.uid_a',v_a::text,true);
  PERFORM set_config('educart.r13.uid_b',v_b::text,true);
  PERFORM set_config('educart.r13.pessoa_a',v_pa::text,true);
  PERFORM set_config('educart.r13.pessoa_b',v_pb::text,true);
  PERFORM set_config('educart.r13.matricula_a',v_ma::text,true);
  PERFORM set_config('educart.r13.matricula_b',v_mb::text,true);
  PERFORM set_config('educart.r13.turma_a',v_ta::text,true);
  PERFORM set_config('educart.r13.turma_b',v_tb::text,true);
  PERFORM set_config('educart.r13.aula_a',v_aa::text,true);
  PERFORM set_config('educart.r13.aula_b',v_ab::text,true);
END $seed$;

SET LOCAL ROLE authenticated;
DO $prova$
DECLARE
  v_uids uuid[] := ARRAY[current_setting('educart.r13.uid_a')::uuid,current_setting('educart.r13.uid_b')::uuid];
  v_pessoas uuid[] := ARRAY[current_setting('educart.r13.pessoa_a')::uuid,current_setting('educart.r13.pessoa_b')::uuid];
  v_matriculas uuid[] := ARRAY[current_setting('educart.r13.matricula_a')::uuid,current_setting('educart.r13.matricula_b')::uuid];
  v_turmas uuid[] := ARRAY[current_setting('educart.r13.turma_a')::uuid,current_setting('educart.r13.turma_b')::uuid];
  v_aulas uuid[] := ARRAY[current_setting('educart.r13.aula_a')::uuid,current_setting('educart.r13.aula_b')::uuid];
  v_i integer; v_j integer; v_n integer; v_contagem bigint;
  v_tabela text; v_campo text; v_proprio text; v_outro text; v_esperado integer;
  v_tabelas text[] := ARRAY[
    'pessoas','matriculas','turmas','educart_aulas_dev','educart_chamadas_dev',
    'educart_planos_financeiros_r11_dev','educart_parcelas_financeiras_r11_dev',
    'mensalidades_formacao','educart_fotos_consentimento_dev'
  ];
  v_campos text[] := ARRAY[
    'id','id','id','id','aula_id','matricula_id','matricula_id',
    'matricula_id','pessoa_id'
  ];
BEGIN
  FOR v_i IN 1..2 LOOP
    PERFORM set_config('request.jwt.claim.sub',v_uids[v_i]::text,true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('sub',v_uids[v_i]::text,'role','authenticated')::text,true);
    IF auth.uid() IS DISTINCT FROM v_uids[v_i]
      THEN RAISE EXCEPTION 'Auth UID A/B divergente'; END IF;
    v_j:=3-v_i;
    FOR v_n IN 1..array_length(v_tabelas,1) LOOP
      v_tabela:=v_tabelas[v_n]; v_campo:=v_campos[v_n];
      IF v_n IN (1,9) THEN
        v_proprio:=v_pessoas[v_i]::text; v_outro:=v_pessoas[v_j]::text;
      ELSIF v_n=3 THEN
        v_proprio:=v_turmas[v_i]::text; v_outro:=v_turmas[v_j]::text;
      ELSIF v_n=4 THEN
        v_proprio:=v_aulas[v_i]::text; v_outro:=v_aulas[v_j]::text;
      ELSIF v_n=5 THEN
        v_proprio:=v_aulas[v_i]::text; v_outro:=v_aulas[v_j]::text;
      ELSE
        v_proprio:=v_matriculas[v_i]::text; v_outro:=v_matriculas[v_j]::text;
      END IF;
      v_esperado:=CASE WHEN v_n=7 THEN 24 ELSE 1 END;
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1::uuid',v_tabela,v_campo)
        INTO v_contagem USING v_proprio::uuid;
      IF v_contagem<>v_esperado THEN
        RAISE EXCEPTION 'R13: próprio % visível incorretamente (% em vez de %)',v_tabela,v_contagem,v_esperado;
      END IF;
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I=$1::uuid',v_tabela,v_campo)
        INTO v_contagem USING v_outro::uuid;
      IF v_contagem<>0 THEN
        RAISE EXCEPTION 'R13: vazamento CRUZADO no escopo %',v_tabela;
      END IF;
    END LOOP;
  END LOOP;
END $prova$;

ROLLBACK;
SELECT 'R13 TESTE REVERSIVEL: aprovado somente se todos os assert passaram' AS resultado;