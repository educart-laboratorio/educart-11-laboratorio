-- EducART 1.1 — CORREÇÃO DE SEGURANÇA DEV, NÃO PARA PROD.
-- Evidência de falha: SET LOCAL ROLE authenticated, set_config('educart.pix_conferencia_rpc','true',true)
-- seguido de UPDATE de matriculas.situacao='ativa' passou sem Pix.
-- Revisão: checar o papel efetivo da execução, não apenas uma GUC mutável pelo usuário.
-- ATENÇÃO: o RPC passa a ser SECURITY DEFINER com autorização explícita no início;
-- os gatilhos mantêm o escopo do comando privilegiado limitado ao RPC auditado.
-- Aplicar somente database-dev; executar cenários de regressão com BEGIN/ROLLBACK.

DO $preflight$
BEGIN
 IF to_regprocedure('public.educart_conferir_pix_dev(uuid,text,boolean)') IS NULL
   OR to_regprocedure('public.educart_pix_imutavel_dev()') IS NULL
   OR to_regprocedure('public.educart_bloquear_status_financeiro_direto_dev()') IS NULL
 THEN RAISE EXCEPTION 'Fluxo financeiro DEV e gatilhos prévios ausentes'; END IF;
 IF (SELECT pg_get_userbyid(proowner) FROM pg_proc
    WHERE oid='public.educart_conferir_pix_dev(uuid,text,boolean)'::regprocedure)<>'postgres'
 THEN RAISE EXCEPTION 'Dono da função não é postgres: revisar segurança do invocador'; END IF;
 IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='educart_guarda_efetiva_matricula_dev')
 THEN RAISE EXCEPTION 'Guarda efetiva já instalada; não reaplicar'; END IF;
END $preflight$;

-- A função já exige portal_admins + equipe_papeis.coordenacao, p_conferi_extrato
-- e audita autor e referência. Como SECURITY DEFINER, não depende da GUC
-- para provar que a transição veio da própria RPC, mas deve ser auditada
-- cuidadosamente, pois operações dentro dela usam privilégios do owner.
ALTER FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean) SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.educart_conferir_pix_dev(uuid,text,boolean) TO authenticated;

CREATE FUNCTION public.educart_guarda_efetiva_financeira_dev()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_sensitive boolean:=false;
BEGIN
 IF tg_op='INSERT' THEN
   IF (tg_table_name='matriculas' AND new.situacao='ativa')
      OR (tg_table_name='mensalidades_formacao' AND new.status='pago') THEN
     RAISE EXCEPTION 'Registro financeiro liquidado não pode ser inserido diretamente'
       USING errcode='42501';
   END IF;
   RETURN new;
 END IF;

 IF tg_table_name='educart_pix_manuais' THEN
   -- A inserção de Pix registrado continua com RLS; a mudança precisa da RPC.
   v_sensitive:=true;
 ELSIF tg_table_name='matriculas' THEN
   v_sensitive:=(old.situacao='ativa' AND new.situacao IS DISTINCT FROM 'ativa')
        OR (new.situacao='ativa' AND old.situacao IS DISTINCT FROM 'ativa');
 ELSIF tg_table_name='inscricoes_oficina' THEN
   v_sensitive:=(old.status='matriculado' AND new.status IS DISTINCT FROM 'matriculado')
        OR (new.status='matriculado' AND old.status IS DISTINCT FROM 'matriculado');
 ELSIF tg_table_name='mensalidades_formacao' THEN
   v_sensitive:=(old.status='pago' AND new.status IS DISTINCT FROM 'pago')
        OR (new.status='pago' AND old.status IS DISTINCT FROM 'pago');
 END IF;
 IF v_sensitive AND current_user<>'postgres' THEN
   RAISE EXCEPTION 'Mudança financeira só é permitida na RPC de conferência autorizada'
     USING errcode='42501';
 END IF;
 RETURN new;
END; $$;
REVOKE ALL ON FUNCTION public.educart_guarda_efetiva_financeira_dev() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER educart_guarda_efetiva_matricula_dev
 BEFORE INSERT OR UPDATE ON public.matriculas FOR EACH ROW
 EXECUTE FUNCTION public.educart_guarda_efetiva_financeira_dev();
CREATE TRIGGER educart_guarda_efetiva_inscricao_dev
 BEFORE UPDATE ON public.inscricoes_oficina FOR EACH ROW
 EXECUTE FUNCTION public.educart_guarda_efetiva_financeira_dev();
CREATE TRIGGER educart_guarda_efetiva_mensalidade_dev
 BEFORE INSERT OR UPDATE ON public.mensalidades_formacao FOR EACH ROW
 EXECUTE FUNCTION public.educart_guarda_efetiva_financeira_dev();
CREATE TRIGGER educart_guarda_efetiva_pix_dev
 BEFORE UPDATE ON public.educart_pix_manuais FOR EACH ROW
 EXECUTE FUNCTION public.educart_guarda_efetiva_financeira_dev();

COMMENT ON FUNCTION public.educart_guarda_efetiva_financeira_dev() IS
 'EducART DEV: variável GUC não é autenticação; protege INSERT pago/ativo e UPDATE financeiro direto.';
