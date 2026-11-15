-- R03 EducART DEV: prova de RLS REAL, identidade efêmera, somente BEGIN/ROLLBACK.
-- NÃO APLICAR EM PRODUÇÃO. NÃO REMOVER O ROLLBACK DO FINAL.
-- Não representa autenticação HTTP/SSR nem confirmação de pagamento real.
BEGIN;
CREATE TEMP TABLE r03_audit(cenario text, resultado text) ON COMMIT DROP;
DO $audit$
DECLARE
 co uuid:=gen_random_uuid(); se uuid:=gen_random_uuid(); no uuid:=gen_random_uuid(); uid_dual uuid:=gen_random_uuid();
 formid uuid:=gen_random_uuid(); turma_id uuid:=gen_random_uuid(); pessoa_id uuid:=gen_random_uuid();
 matricula_id uuid:=gen_random_uuid(); mensalidade_id uuid:=gen_random_uuid();
 count_rows integer; changed integer;
BEGIN
 IF (select count(*) from public.portal_admins)<>0 THEN RAISE EXCEPTION 'Dados administrativos reais encontrados'; END IF;
 INSERT INTO auth.users(id,instance_id,aud,role,email,is_anonymous,created_at,updated_at) VALUES
 (co,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','co-r03@example.invalid',false,now(),now()),
 (se,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','se-r03@example.invalid',false,now(),now()),
 (no,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','no-r03@example.invalid',false,now(),now()),
 (uid_dual,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','both-r03@example.invalid',false,now(),now());
 INSERT INTO public.portal_admins(user_id) VALUES(co),(se),(uid_dual);
 INSERT INTO public.equipe_papeis(user_id,papel) VALUES(co,'coordenacao'),(se,'secretaria'),(uid_dual,'secretaria'),(uid_dual,'coordenacao');

 INSERT INTO public.formacoes(id,nome,tipo) VALUES(formid,'Oficina Fictícia R03','oficina');
 INSERT INTO public.turmas(id,formacao_id,codigo) VALUES(turma_id,formid,'R03-TEMP');
 INSERT INTO public.pessoas(id,nome_completo) VALUES(pessoa_id,'Pessoa Sintética R03');
 INSERT INTO public.matriculas(id,pessoa_id,turma_id,origem) VALUES(matricula_id,pessoa_id,turma_id,'novo');
 INSERT INTO public.mensalidades_formacao(id,matricula_id,competencia,vencimento_em,valor_centavos)
 VALUES(mensalidade_id,matricula_id,date_trunc('month',current_date)::date,current_date,32000);

 PERFORM set_config('request.jwt.claim.sub',no::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT count(*) FROM public.pessoas' INTO count_rows;
 IF count_rows<>0 THEN RAISE EXCEPTION 'Pessoa não-admin leu dados pessoais'; END IF;
 EXECUTE 'SELECT count(*) FROM public.matriculas' INTO count_rows;
 IF count_rows<>0 THEN RAISE EXCEPTION 'Pessoa não-admin leu matrículas'; END IF;
 EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao' INTO count_rows;
 IF count_rows<>0 THEN RAISE EXCEPTION 'Pessoa não-admin leu mensalidades'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO pg_temp.r03_audit VALUES('Não-admin: acesso sensível negado','PASS');

 PERFORM set_config('request.jwt.claim.sub',se::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT count(*) FROM public.pessoas' INTO count_rows;
 IF count_rows<>1 THEN RAISE EXCEPTION 'Secretaria não consultou pessoas'; END IF;
 EXECUTE 'SELECT count(*) FROM public.matriculas' INTO count_rows;
 IF count_rows<>1 THEN RAISE EXCEPTION 'Secretaria não consultou matrículas'; END IF;
 EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao' INTO count_rows;
 IF count_rows<>1 THEN RAISE EXCEPTION 'Secretaria não consultou pendências'; END IF;
 EXECUTE 'UPDATE public.pessoas SET nome_completo=''ALTERADO'' WHERE id=$1' USING pessoa_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Secretaria editou PII'; END IF;
 EXECUTE 'UPDATE public.matriculas SET situacao=''ativa'' WHERE id=$1' USING matricula_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Secretaria alterou matrícula'; END IF;
 EXECUTE 'UPDATE public.mensalidades_formacao SET status=''pago'',pago_em=now(),confirmado_em=now(),confirmado_por=$1 WHERE id=$2' USING se,mensalidade_id;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 THEN RAISE EXCEPTION 'Secretaria confirmou mensalidade'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO pg_temp.r03_audit VALUES('Secretaria: lê sem alterar pessoa/matrícula/mensalidade','PASS');

 PERFORM set_config('request.jwt.claim.sub',co::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'UPDATE public.pessoas SET nome_completo=''NOME SINTÉTICO'' WHERE id=$1' USING pessoa_id;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Coordenação não atualizou pessoa'; END IF;
 EXECUTE 'UPDATE public.matriculas SET situacao=''ativa'' WHERE id=$1' USING matricula_id;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Coordenação não atualizou matrícula'; END IF;
 EXECUTE 'UPDATE public.mensalidades_formacao SET status=''pago'',pago_em=now(),confirmado_em=now(),confirmado_por=$1 WHERE id=$2' USING co,mensalidade_id;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Coordenação não atualizou mensalidade'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO pg_temp.r03_audit VALUES('Coordenação: escrita sintética autorizada','PASS');

 PERFORM set_config('request.jwt.claim.sub',uid_dual::text,true); EXECUTE 'SET LOCAL ROLE authenticated';
 EXECUTE 'SELECT count(*) FROM public.mensalidades_formacao' INTO count_rows;
 IF count_rows<>1 THEN RAISE EXCEPTION 'Duplo papel sem leitura'; END IF;
 EXECUTE 'UPDATE public.matriculas SET situacao=''pendente'' WHERE id=$1' USING matricula_id;
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Duplo papel sem escrita'; END IF;
 EXECUTE 'RESET ROLE';
 INSERT INTO pg_temp.r03_audit VALUES('Duplo papel: acesso cumulativo verificado','PASS');
END $audit$;
SELECT cenario,resultado FROM pg_temp.r03_audit ORDER BY cenario;
ROLLBACK;