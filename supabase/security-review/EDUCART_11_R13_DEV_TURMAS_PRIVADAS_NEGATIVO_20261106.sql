-- R13-D | Duas identidades sintéticas SEM matrícula não devem ler turmas.
-- Somente leitura no DEV. Execute após aplicar a proteção de RLS.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '12000';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000131',true);
DO $negativo_a$
BEGIN
  IF (SELECT count(*) FROM public.turmas)<>0 THEN
    RAISE EXCEPTION 'R13-D A: conta sem matrícula leu turmas';
  END IF;
END $negativo_a$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000132',true);
DO $negativo_b$
BEGIN
  IF (SELECT count(*) FROM public.turmas)<>0 THEN
    RAISE EXCEPTION 'R13-D B: conta sem matrícula leu turmas';
  END IF;
END $negativo_b$;
ROLLBACK;
SELECT 'R13-D NEGATIVO PASS: ambas identidades sem matrícula não leem turmas' AS resultado;
