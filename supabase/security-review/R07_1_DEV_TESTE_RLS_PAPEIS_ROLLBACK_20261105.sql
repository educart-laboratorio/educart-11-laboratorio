-- EducART R07.1: roteiro de homologacao de permissao REAL no banco
-- SOMENTE DATABASE-DEV esjrjzyvyhtzwgihcbsc.
-- USA IDENTIDADES DE EQUIPE EXISTENTES, MAS SOMENTE CRIA REGISTROS SINTETICOS
-- NA MESMA TRANSACAO, QUE TERMINA SEMPRE EM ROLLBACK.
-- NAO EXECUTAR EM PRODUCAO; SEM COMPROVANTE/PAGAMENTO REAL.
BEGIN;
DO $r071$
DECLARE
  v_felipe uuid; v_aline uuid; v_master uuid;
  v_estudante uuid:=gen_random_uuid(); v_form uuid:=gen_random_uuid();
  v_turma uuid:=gen_random_uuid(); v_pessoa uuid:=gen_random_uuid();
  v_matricula uuid:=gen_random_uuid(); v_mensalidade uuid:=gen_random_uuid();
  v_planejada uuid:=gen_random_uuid(); n integer; alteradas integer;
BEGIN
  SELECT id INTO STRICT v_felipe FROM auth.users WHERE lower(email)='felipe.jdtc@gmail.com';
  SELECT id INTO STRICT v_aline FROM auth.users WHERE lower(email)='alinenepomuceno85@gmail.com';
  SELECT id INTO STRICT v_master FROM auth.users WHERE lower(email)='educartsuporte@gmail.com';

  INSERT INTO auth.users(id,instance_id,aud,role,email,is_anonymous,created_at,updated_at)
  VALUES(v_estudante,'00000000-0000-0000-0000-000000000000',
      'authenticated','authenticated','estudante-r071-rollback@example.invalid',false,now(),now());
  INSERT INTO public.formacoes(id,nome,tipo)
    VALUES(v_form,'Oficina Ficticia R071','oficina');
  INSERT INTO public.turmas(id,formacao_id,codigo)
    VALUES(v_turma,v_form,'R071-ROLLBACK');
  INSERT INTO public.pessoas(id,nome_completo,auth_user_id)
    VALUES(v_pessoa,'Estudante Ficticio R071',v_estudante);
  INSERT INTO public.matriculas(id,pessoa_id,turma_id,origem)
    VALUES(v_matricula,v_pessoa,v_turma,'novo');
  INSERT INTO public.mensalidades_formacao(id,matricula_id,competencia,vencimento_em,valor_centavos)
    VALUES(v_mensalidade,v_matricula,'2026-11-01','2026-11-15',32000);

  -- Felipe (Secretaria): atende e acompanha pessoas/matriculas; nao le nem altera mensalidades.
  PERFORM set_config('request.jwt.claim.sub',v_felipe::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao WHERE id=$1' INTO n USING v_mensalidade;
  IF n<>0 THEN RAISE EXCEPTION 'FALHA: Secretaria le mensalidade'; END IF;
  EXECUTE 'SELECT count(*) FROM public.pessoas WHERE id=$1' INTO n USING v_pessoa;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: Secretaria perdeu pessoas'; END IF;
  EXECUTE 'SELECT count(*) FROM public.matriculas WHERE id=$1' INTO n USING v_matricula;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: Secretaria perdeu matriculas'; END IF;
  EXECUTE 'INSERT INTO public.turmas(id,formacao_id,codigo,situacao) VALUES($1,$2,$3,$4)'
    USING v_planejada,v_form,'R071-PLANEJADA-ROLLBACK','planejada';
  EXECUTE 'SELECT count(*) FROM public.turmas WHERE id=$1 AND criada_por=$2'
    INTO n USING v_planejada,v_felipe;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: autoria de turma planejada'; END IF;
  EXECUTE 'UPDATE public.mensalidades_formacao SET status=$1 WHERE id=$2'
    USING 'pago',v_mensalidade;
  GET DIAGNOSTICS alteradas=ROW_COUNT;
  IF alteradas<>0 THEN RAISE EXCEPTION 'FALHA: Secretaria alterou pagamento'; END IF;
  EXECUTE 'RESET ROLE';

  -- Aline (Coordenação): leitura autorizada.
  PERFORM set_config('request.jwt.claim.sub',v_aline::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao WHERE id=$1' INTO n USING v_mensalidade;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: Coordenacao nao le mensalidade'; END IF;
  EXECUTE 'RESET ROLE';

  -- Master com papeis de Secretaria e Coordenacao.
  PERFORM set_config('request.jwt.claim.sub',v_master::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao WHERE id=$1' INTO n USING v_mensalidade;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: Master perdeu autorizacao'; END IF;
  EXECUTE 'RESET ROLE';

  -- Estudante nao-admin: pode ler SOMENTE a propria parcela.
  PERFORM set_config('request.jwt.claim.sub',v_estudante::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao WHERE id=$1' INTO n USING v_mensalidade;
  IF n<>1 THEN RAISE EXCEPTION 'FALHA: estudante nao le sua parcela'; END IF;
  EXECUTE 'RESET ROLE';

  -- Conta autenticada aleatoria sem papel e sem vinculo.
  PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao WHERE id=$1' INTO n USING v_mensalidade;
  IF n<>0 THEN RAISE EXCEPTION 'FALHA: usuario sem vinculo le mensalidade'; END IF;
  EXECUTE 'RESET ROLE';
END $r071$;
ROLLBACK;
