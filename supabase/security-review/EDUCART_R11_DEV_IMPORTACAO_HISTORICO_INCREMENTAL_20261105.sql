-- EducART R11.2a — completar importação histórica depois de ativar o plano individual.
-- A migração não insere pagamentos nem inventa datas, modalidades ou valores anteriores.
create or replace function educart_interno_dev.educart_r11_importar_historico_dev(
 p_matricula_id uuid,p_parcelas_historicas integer[],
 p_fonte_historica text,p_confirmei_documentos boolean)
returns integer language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid();v_n integer;v_p public.educart_parcelas_financeiras_r11_dev%rowtype;
 v_origem text; v_adicionados integer:=0;
begin
 if v_uid is null or not exists(select 1 from public.portal_admins where user_id=v_uid)
    or not exists(select 1 from public.equipe_papeis where user_id=v_uid and papel='coordenacao')
 then raise exception 'Operador não autorizado' using errcode='42501'; end if;
 if p_confirmei_documentos is distinct from true
   or length(btrim(coalesce(p_fonte_historica,''))) not between 8 and 200
   or coalesce(cardinality(p_parcelas_historicas),0) not between 1 and 24
   or exists(select 1 from unnest(p_parcelas_historicas) x where x not between 1 and 24)
   or (select count(*) from unnest(p_parcelas_historicas) x)
      <> (select count(distinct x) from unnest(p_parcelas_historicas) x)
 then raise exception 'Importação exige parcelas únicas e referência documental' using errcode='22023'; end if;
 if not exists(select 1 from public.educart_planos_financeiros_r11_dev
   where matricula_id=p_matricula_id and situacao='ativo')
 then raise exception 'Plano financeiro ainda não está ativo' using errcode='22023'; end if;
 for v_n in select unnest(p_parcelas_historicas) order by 1 loop
   select * into v_p from public.educart_parcelas_financeiras_r11_dev
     where matricula_id=p_matricula_id and numero=v_n for update;
   if not found then raise exception 'Parcela não encontrada' using errcode='22023'; end if;
   if v_p.situacao='paga' then
     select origem into v_origem from public.educart_baixas_financeiras_r11_dev
       where parcela_id=v_p.id;
     if v_origem='historico_conferido' then continue; end if;
     raise exception 'Parcela com recebimento atual não pode ser reimportada' using errcode='23505';
   end if;
   insert into public.educart_baixas_financeiras_r11_dev
     (parcela_id,origem,referencia,registrado_por)
   values(v_p.id,'historico_conferido',btrim(p_fonte_historica),v_uid);
   update public.educart_parcelas_financeiras_r11_dev
     set situacao='paga',confirmado_por=v_uid,confirmado_em=now()
     where id=v_p.id and situacao='pendente';
   v_adicionados:=v_adicionados+1;
 end loop;
 return v_adicionados;
end;$$;
create or replace function public.educart_r11_importar_historico_dev(
 p_matricula_id uuid,p_parcelas_historicas integer[],
 p_fonte_historica text,p_confirmei_documentos boolean)
returns integer language sql security invoker
set search_path to 'pg_catalog','public','pg_temp' as $$
 select educart_interno_dev.educart_r11_importar_historico_dev($1,$2,$3,$4);$$;
revoke all on function educart_interno_dev.educart_r11_importar_historico_dev(uuid,integer[],text,boolean)
 from public,anon,authenticated;
grant execute on function educart_interno_dev.educart_r11_importar_historico_dev(uuid,integer[],text,boolean)
 to authenticated;
revoke all on function public.educart_r11_importar_historico_dev(uuid,integer[],text,boolean)
 from public,anon,authenticated;
grant execute on function public.educart_r11_importar_historico_dev(uuid,integer[],text,boolean)
 to authenticated;
