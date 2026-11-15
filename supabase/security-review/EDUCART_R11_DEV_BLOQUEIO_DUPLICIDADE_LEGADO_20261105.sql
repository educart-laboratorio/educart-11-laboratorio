-- EducART R11.4b: bloqueio transacional contra duplicação de competências legadas.
-- Guard conservador em DEV; sem modificações nem migração de dados históricos.
create or replace function educart_interno_dev.educart_r11_ativar_plano_dev(
  p_matricula_id uuid,p_parcelas_historicas integer[],
  p_fonte_historica text,p_confirmo_plano boolean)
returns uuid language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid();v_plano public.educart_planos_financeiros_r11_dev%rowtype;
 v_n integer;v_primeiro date;v_venc date;v_parcela_id uuid;
begin
 if v_uid is null or
  not exists(select 1 from public.portal_admins where user_id=v_uid) or
  not exists(select 1 from public.equipe_papeis where user_id=v_uid and papel='coordenacao')
 then raise exception 'Operador não autorizado' using errcode='42501'; end if;
 if p_confirmo_plano is distinct from true then
   raise exception 'Confirme a revisão do acordo e do histórico' using errcode='22023'; end if;
 select * into v_plano from public.educart_planos_financeiros_r11_dev
   where matricula_id=p_matricula_id for update;
 if not found or v_plano.situacao<>'rascunho' then
   raise exception 'Plano inexistente ou já ativo' using errcode='22023'; end if;
 if not exists (select 1 from public.matriculas m
   where m.id=p_matricula_id and m.situacao in ('ativa','concluida','trancada')) then
   raise exception 'Ativação exige matrícula acadêmica efetiva' using errcode='22023'; end if;
 -- As competências antigas não podem coexistir com uma segunda linha de 24
 -- cobranças R11. Reconcilie o histórico legado individual antes da ativação.
 if exists (
   select 1 from public.mensalidades_formacao ml
   where ml.matricula_id=p_matricula_id
     and ml.competencia>=v_plano.competencia_inicial
     and ml.competencia<(v_plano.competencia_inicial + interval '24 months')::date
 ) then
   raise exception 'Mensalidades legadas detectadas: reconcilie o histórico antes de criar 24 novas parcelas'
     using errcode='23505';
 end if;
 if coalesce(cardinality(p_parcelas_historicas),0)>24
   or exists(select 1 from unnest(coalesce(p_parcelas_historicas,'{}'::integer[])) x
     where x not between 1 and 24)
   or (select count(*) from unnest(coalesce(p_parcelas_historicas,'{}'::integer[])) x)
     <> (select count(distinct x) from unnest(coalesce(p_parcelas_historicas,'{}'::integer[])) x)
 then raise exception 'Números de parcelas históricas inválidos' using errcode='22023'; end if;
 if coalesce(cardinality(p_parcelas_historicas),0)>0
    and length(btrim(coalesce(p_fonte_historica,''))) not between 8 and 200
 then raise exception 'Histórico quitado exige referência documental conferida' using errcode='22023'; end if;
 for v_n in 1..24 loop
   v_primeiro:=(v_plano.competencia_inicial + make_interval(months=>v_n-1))::date;
   v_venc:=v_primeiro+(v_plano.dia_vencimento-1);
   insert into public.educart_parcelas_financeiras_r11_dev(
     matricula_id,numero,competencia,vencimento_em,valor_centavos
   ) values(p_matricula_id,v_n,v_primeiro,v_venc,v_plano.valor_parcela_centavos)
   returning id into v_parcela_id;
   if v_n=any(coalesce(p_parcelas_historicas,'{}'::integer[])) then
     insert into public.educart_baixas_financeiras_r11_dev(
       parcela_id,origem,referencia,registrado_por)
     values(v_parcela_id,'historico_conferido',btrim(p_fonte_historica),v_uid);
     update public.educart_parcelas_financeiras_r11_dev
       set situacao='paga',confirmado_por=v_uid,confirmado_em=now()
       where id=v_parcela_id;
   end if;
 end loop;
 update public.educart_planos_financeiros_r11_dev
   set situacao='ativo',ativado_em=now() where matricula_id=p_matricula_id;
 return p_matricula_id;
end;$$;
