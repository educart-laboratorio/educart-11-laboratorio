-- R13-E: duas identidades distintas sem matrícula não podem ler planos financeiros.
-- SQL somente leitura; não demonstra autenticação de duas contas reais.
BEGIN READ ONLY;
SET LOCAL statement_timeout='12000';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000135',true);
DO $audit_a$
BEGIN
 IF (SELECT count(*) FROM public.educart_planos_financeiros_r11_dev)<>0
 THEN RAISE EXCEPTION 'R13-E A: plano alheio visível'; END IF;
END $audit_a$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000136',true);
DO $audit_b$
BEGIN
 IF (SELECT count(*) FROM public.educart_planos_financeiros_r11_dev)<>0
 THEN RAISE EXCEPTION 'R13-E B: plano alheio visível'; END IF;
END $audit_b$;
ROLLBACK;
SELECT 'R13-E NEGATIVO PASS: identidades sem matrícula não leem planos' AS resultado;
