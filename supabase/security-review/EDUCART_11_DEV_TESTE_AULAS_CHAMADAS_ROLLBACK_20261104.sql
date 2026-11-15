-- EducART 1.1 — TESTE TRANSACIONAL DEV de integração aula/chamada.
-- Executar SOMENTE no database-dev, NUNCA em PROD. Dados sintéticos; BEGIN/ROLLBACK.
-- Usa membership de Coordenação já existente no banco DEV para simulação SQL.
-- A confirmação de extrato é SOMENTE uma simulação de decisão para testar o fluxo;
-- NÃO comprova pagamento, não cria dívida real e não contacta instituição financeira.
BEGIN;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM public.portal_admins ORDER BY user_id LIMIT 1),true);
SELECT set_config('request.jwt.claim.role','authenticated',true);
SET LOCAL ROLE authenticated;
DO $teste$
DECLARE vf uuid; vt uuid; vt2 uuid; vp uuid; vm uuid; vpix uuid; va uuid; va2 uuid; vc uuid;
    bloqueio_pendente boolean:=false;
    bloqueio_turma boolean:=false;
    bloqueio_correcao boolean:=false;
    v_autor uuid:=auth.uid();
BEGIN
 INSERT INTO public.formacoes(nome,tipo) VALUES('Formacao Ficticia Chamada ROLLBACK','curso') RETURNING id INTO vf;
 INSERT INTO public.turmas(formacao_id,codigo,situacao) VALUES(vf,'A-ROLLBACK','aberta') RETURNING id INTO vt;
 INSERT INTO public.turmas(formacao_id,codigo,situacao) VALUES(vf,'B-ROLLBACK','aberta') RETURNING id INTO vt2;
 INSERT INTO public.pessoas(nome_completo,email) VALUES('Pessoa Ficticia do Teste','chamada-rollback@example.invalid') RETURNING id INTO vp;
 INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao) VALUES(vp,vt,'novo','pendente') RETURNING id INTO vm;
 INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao)
 VALUES(vt,current_date,'15:00','17:00','Aula ficticia da turma A','realizada') RETURNING id INTO va;
 INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao)
 VALUES(vt2,current_date,'15:00','17:00','Aula ficticia da turma B','realizada') RETURNING id INTO va2;
 BEGIN
   INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
   VALUES(va,vm,'presente',v_autor,v_autor);
 EXCEPTION WHEN check_violation THEN bloqueio_pendente:=true;
 END;
 IF NOT bloqueio_pendente THEN RAISE EXCEPTION 'Falha: matrícula pendente aceitou chamada'; END IF;
 INSERT INTO public.educart_pix_manuais(matricula_id,finalidade,valor_centavos,identificador_pix,ocorrido_em,registrado_por)
 VALUES(vm,'matricula',5000,'TESTE-CHAMADA-'||gen_random_uuid()::text,now()-interval '1 min',v_autor)
 RETURNING id INTO vpix;
 PERFORM public.educart_conferir_pix_dev(vpix,'TESTE TRANSACIONAL SEM EXTRATO REAL',TRUE);
 IF (SELECT situacao FROM public.matriculas WHERE id=vm)<>'ativa' THEN
   RAISE EXCEPTION 'Falha: conferência não ativou matrícula';
 END IF;
 BEGIN
   INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
   VALUES(va2,vm,'presente',v_autor,v_autor);
 EXCEPTION WHEN check_violation THEN bloqueio_turma:=true;
 END;
 IF NOT bloqueio_turma THEN RAISE EXCEPTION 'Falha: matrícula de turma A entrou na turma B'; END IF;
 INSERT INTO public.educart_chamadas_dev(aula_id,matricula_id,situacao,registrado_por,atualizado_por)
 VALUES(va,vm,'ausente',v_autor,v_autor) RETURNING id INTO vc;
 BEGIN
   UPDATE public.educart_chamadas_dev SET situacao='presente' WHERE id=vc;
 EXCEPTION WHEN invalid_parameter_value THEN bloqueio_correcao:=true;
 END;
 IF NOT bloqueio_correcao THEN RAISE EXCEPTION 'Falha: correção sem motivo foi aceita'; END IF;
 UPDATE public.educart_chamadas_dev SET situacao='justificada',
   justificativa='Atestado sintetico da aluna de teste',
   motivo_ajuste='Avaliacao humana ficticia para teste de auditoria' WHERE id=vc;
 IF (SELECT count(*) FROM public.educart_chamadas_historico_dev WHERE chamada_id=vc)<>2 THEN
   RAISE EXCEPTION 'Falha: não gerou dois eventos de auditoria'; END IF;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 IF (SELECT count(*) FROM public.educart_aulas_dev)>0 OR
    (SELECT count(*) FROM public.educart_chamadas_dev)>0 OR
    (SELECT count(*) FROM public.educart_chamadas_historico_dev)>0 THEN
    RAISE EXCEPTION 'Falha: identidade não-administrativa leu registros';
 END IF;
 PERFORM set_config('request.jwt.claim.sub',v_autor::text,true);
END $teste$;
SELECT 'PASS: integração, bloqueios e auditoria' AS resultado;
ROLLBACK;
