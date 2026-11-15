-- EducART R13-A | ensaio NEGATIVO de RLS com duas identidades sem vínculo
-- Apenas Supabase DEV esjrjzyvyhtzwgihcbsc; somente leitura; NÃO é login Auth real.
-- Executado com sucesso no DEV em 06/11/2026. Não cria pessoa nem usuário permanente.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '12000';
SELECT set_config('educart.r13.a',gen_random_uuid()::text,true);
SELECT set_config('educart.r13.b',gen_random_uuid()::text,true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',current_setting('educart.r13.a'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('educart.r13.a'),'role','authenticated')::text,true);
DO $audit_a$
DECLARE total integer;
BEGIN
 SELECT (SELECT count(*) FROM public.pessoas)
 + (SELECT count(*) FROM public.matriculas)
 + (SELECT count(*) FROM public.educart_aulas_dev)
 + (SELECT count(*) FROM public.educart_chamadas_dev)
 + (SELECT count(*) FROM public.educart_parcelas_financeiras_r11_dev)
 + (SELECT count(*) FROM public.educart_fotos_consentimento_dev)
 + (SELECT count(*) FROM storage.objects WHERE bucket_id='educart-foto-individual-dev')
 INTO total;
 IF total<>0 THEN RAISE EXCEPTION 'R13 A: conta não vinculada visualizou % registros privados',total; END IF;
END $audit_a$;
SELECT set_config('request.jwt.claim.sub',current_setting('educart.r13.b'),true);
SELECT set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('educart.r13.b'),'role','authenticated')::text,true);
DO $audit_b$
DECLARE total integer;
BEGIN
 SELECT (SELECT count(*) FROM public.pessoas)
 + (SELECT count(*) FROM public.matriculas)
 + (SELECT count(*) FROM public.educart_aulas_dev)
 + (SELECT count(*) FROM public.educart_chamadas_dev)
 + (SELECT count(*) FROM public.educart_parcelas_financeiras_r11_dev)
 + (SELECT count(*) FROM public.educart_fotos_consentimento_dev)
 + (SELECT count(*) FROM storage.objects WHERE bucket_id='educart-foto-individual-dev')
 INTO total;
 IF total<>0 THEN RAISE EXCEPTION 'R13 B: conta não vinculada visualizou % registros privados',total; END IF;
END $audit_b$;
ROLLBACK;
SELECT 'R13-NEGATIVO-PASS: duas identidades sem vínculo não conseguem ler dados privados; nenhuma gravação' AS resultado;
