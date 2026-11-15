-- EducART 1.2 | blindagem de RPC Pix legada, SOMENTE Supabase DEV.
-- Mantém a assinatura e as verificações de Coordenação para compatibilidade
-- com a prévia 1.1, mas move SECURITY DEFINER para schema não exposto.
-- Versão de referência: 05/11/2026. NÃO APLICAR EM PROD.
BEGIN;
DO $preflight$
BEGIN
 IF to_regprocedure('public.educart_conferir_pix_dev(uuid,text,boolean)') IS NULL
   OR to_regnamespace('educart_interno_dev') IS NULL
   OR to_regprocedure('educart_interno_dev.educart_conferir_pix_dev(uuid,text,boolean)') IS NOT NULL
 THEN RAISE EXCEPTION 'Preflight DEV: estado incompatível/rotina já migrada';
 END IF;
 IF (SELECT p.prosecdef FROM pg_proc p
       WHERE p.oid=to_regprocedure('public.educart_conferir_pix_dev(uuid,text,boolean)'))
    IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Preflight DEV: rotina não é SECURITY DEFINER como esperado';
 END IF;
END $preflight$;

ALTER FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean)
 SET SCHEMA educart_interno_dev;
-- Schema privado preserva as checagens originais: portal_admins, coordenacao,
-- Pix registrado + extrato, lock de matrícula, status, histórico e mensalidade.
ALTER FUNCTION educart_interno_dev.educart_conferir_pix_dev(uuid,text,boolean)
 SET search_path TO pg_catalog, public, pg_temp;
REVOKE ALL ON FUNCTION educart_interno_dev.educart_conferir_pix_dev(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA educart_interno_dev TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION educart_interno_dev.educart_conferir_pix_dev(uuid,text,boolean)
 TO authenticated,service_role;

CREATE FUNCTION public.educart_conferir_pix_dev(
 p_pix_id uuid,p_referencia_conferencia text,p_conferi_extrato boolean
) RETURNS uuid LANGUAGE sql SECURITY INVOKER
SET search_path=pg_catalog,public,pg_temp AS $$
 SELECT educart_interno_dev.educart_conferir_pix_dev(
  p_pix_id,p_referencia_conferencia,p_conferi_extrato);
$$;
REVOKE ALL ON FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean)
 FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean)
 TO authenticated,service_role;
COMMENT ON FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean) IS
 'EducART DEV: RPC invoker compatível com a 1.1. Validação privilegiada em schema privado, exige Coordenação e conferência real de extrato.';
COMMIT;
