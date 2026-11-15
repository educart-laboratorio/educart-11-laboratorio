-- EducART 1.1 — ensaio de isolamento de estudantes: database-dev SOMENTE.
-- cria duas contas SINTÉTICAS em auth.users, 2 pessoas e matrículas na MESMA turma,
-- verifica isolamento RLS de chamadas e leitura privada, reverte tudo com ROLLBACK.
-- Nunca executar em PROD, nunca associar a contas ou pagamentos reais.
BEGIN;
DO $contas$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
BEGIN
 INSERT INTO auth.users(id,aud,role,email) VALUES
  (a,'authenticated','authenticated','aluna-1-rollback@example.invalid'),
  (b,'authenticated','authenticated','aluna-2-rollback@example.invalid');
 PERFORM set_config('educart.teste_aluna_a',a::text,true);
 PERFORM set_config('educart.teste_aluna_b',b::text,true);
END $contas$;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.portal_admins ORDER BY user_id LIMIT 1),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $teste$
DECLARE coord uuid:=auth.uid(); aluna_a uuid:=current_setting('educart.teste_aluna_a')::uuid;
 aluna_b uuid:=current_setting('educart.teste_aluna_b')::uuid;
 f uuid;t uuid;p1 uuid;p2 uuid;m1 uuid;m2 uuid;x1 uuid;x2 uuid;a uuid;
BEGIN
 INSERT INTO public.formacoes(nome,tipo) VALUES('Formacao teste privacy','curso') RETURNING id INTO f;
 INSERT INTO public.turmas(formacao_id,codigo,situacao) VALUES(f,'ROL-PRIVACIDADE-ROLLBACK','aberta') RETURNING id INTO t;
 INSERT INTO public.pessoas(nome_completo,email,auth_user_id) VALUES('Aluna A sintetica','aluna-1-rollback@example.invalid',aluna_a) RETURNING id INTO p1;
 INSERT INTO public.pessoas(nome_completo,email,auth_user_id) VALUES('Aluna B sintetica','aluna-2-rollback@example.invalid',aluna_b) RETURNING id INTO p2;
 INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao) VALUES(p1,t,'novo','pendente') RETURNING id INTO m1;
 INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao) VALUES(p2,t,'novo','pendente') RETURNING id INTO m2;
 INSERT INTO public.educart_pix_manuais(matricula_id,finalidade,valor_centavos,identificador_pix,ocorrido_em,registrado_por)
 VALUES(m1,'matricula',5000,'TESTE-PRIV-A-'||gen_random_uuid()::text,now()-interval '1 min',coord) RETURNING id INTO x1;
 INSERT INTO public.educart_pix_manuais(matricula_id,finalidade,valor_centavos,identificador_pix,ocorrido_em,registrado_por)
 VALUES(m2,'matricula',5000,'TESTE-PRIV-B-'||gen_random_uuid()::text,now()-interval '1 min',coord) RETURNING id INTO x2;
 PERFORM public.educart_conferir_pix_dev(x1,'SINTETICA CONFERENCIA A',true);
 PERFORM public.educart_conferir_pix_dev(x2,'SINTETICA CONFERENCIA B',true);
 INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao)
 VALUES(t,current_date,'15:00','17:00','Aula do teste de privacidade','realizada') RETURNING id INTO a;
 INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
 VALUES(a,m1,'presente',coord,coord);
 INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
 VALUES(a,m2,'ausente',coord,coord);
 PERFORM set_config('request.jwt.claim.sub',aluna_a::text,true);
 IF (SELECT count(*) FROM public.educart_chamadas_dev)<>1 THEN RAISE EXCEPTION 'Aluna A consegue ver chamada alheia';END IF;
 IF (SELECT count(*) FROM public.educart_aulas_dev)<>1 THEN RAISE EXCEPTION 'Aluna A nao ve propria aula';END IF;
 IF (SELECT count(*) FROM public.educart_chamadas_historico_dev)<>0 THEN RAISE EXCEPTION 'Aluna A ve log da equipe';END IF;
 PERFORM set_config('request.jwt.claim.sub',aluna_b::text,true);
 IF (SELECT count(*) FROM public.educart_chamadas_dev)<>1 THEN RAISE EXCEPTION 'Aluna B consegue ver chamada alheia';END IF;
 IF (SELECT situacao FROM public.educart_chamadas_dev LIMIT 1)<>'ausente' THEN RAISE EXCEPTION 'Aluna B ve frequencia errada';END IF;
 PERFORM set_config('request.jwt.claim.sub',coord::text,true);
END $teste$;
SELECT 'PASS: 2 estudantes isolados na mesma turma com RLS' AS resultado;
ROLLBACK;
