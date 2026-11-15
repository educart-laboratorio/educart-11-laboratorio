-- DEV-ONLY correção de PL/pgSQL após implantação da guarda efetiva.
-- A primeira guarda referenciou NEW.status de mensalidade mesmo em INSERT
-- de matriculas, provocando ERROR 42703 em INSERT válido. Corrigir em nova
-- migração (não reescrever o histórico).
CREATE OR REPLACE FUNCTION public.educart_guarda_efetiva_financeira_dev()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE v_sensitive boolean:=false;
BEGIN
 IF tg_op='INSERT' THEN
   IF tg_table_name='matriculas' THEN
     IF new.situacao='ativa' THEN
       RAISE EXCEPTION 'Matrícula ativa exige conferência transacional'
         USING errcode='42501';
     END IF;
   ELSIF tg_table_name='mensalidades_formacao' THEN
     IF new.status='pago' THEN
       RAISE EXCEPTION 'Mensalidade paga exige conferência transacional'
         USING errcode='42501';
     END IF;
   END IF;
   RETURN new;
 END IF;

 IF tg_table_name='educart_pix_manuais' THEN
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
