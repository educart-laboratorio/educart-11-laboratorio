-- EducART R11.2 — Banco DEV isolado, sem alterações nas tabelas financeiras legadas.
-- Nunca executar em PROD antes da reconciliação das migrações e homologação.
-- O modelo é individual por matrícula; não sincroniza parcelas pela turma.
create table public.educart_planos_financeiros_r11_dev (
  matricula_id uuid primary key references public.matriculas(id) on delete restrict,
  competencia_inicial date not null,
  dia_vencimento smallint not null check (dia_vencimento between 1 and 28),
  valor_parcela_centavos integer not null check (valor_parcela_centavos > 0 and valor_parcela_centavos <= 100000000),
  numero_parcelas smallint not null default 24 check (numero_parcelas = 24),
  situacao text not null default 'rascunho' check (situacao in ('rascunho','ativo')),
  referencia_acordo text not null check (length(btrim(referencia_acordo)) between 8 and 200),
  registrado_por uuid not null references auth.users(id) on delete restrict,
  registrado_em timestamptz not null default now(),
  ativado_em timestamptz,
  constraint educart_r11_competencia_primeiro_dia
    check (competencia_inicial = date_trunc('month',competencia_inicial::timestamp)::date),
  constraint educart_r11_ativacao_coerente
    check ((situacao='rascunho' and ativado_em is null) or (situacao='ativo' and ativado_em is not null))
);
create table public.educart_parcelas_financeiras_r11_dev (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.educart_planos_financeiros_r11_dev(matricula_id) on delete restrict,
  numero smallint not null check (numero between 1 and 24),
  competencia date not null,
  vencimento_em date not null,
  valor_centavos integer not null check (valor_centavos > 0 and valor_centavos <= 100000000),
  situacao text not null default 'pendente' check (situacao in ('pendente','paga')),
  confirmado_em timestamptz,
  confirmado_por uuid references auth.users(id) on delete restrict,
  criado_em timestamptz not null default now(),
  unique(matricula_id,numero),
  unique(matricula_id,competencia),
  constraint educart_r11_parcela_competencia check (competencia=date_trunc('month',competencia::timestamp)::date),
  constraint educart_r11_parcela_baixa check (
    (situacao='pendente' and confirmado_em is null and confirmado_por is null)
    or (situacao='paga' and confirmado_em is not null and confirmado_por is not null)
  )
);
create table public.educart_baixas_financeiras_r11_dev (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null unique references public.educart_parcelas_financeiras_r11_dev(id) on delete restrict,
  origem text not null check (origem in ('historico_conferido','recebimento')),
  modalidade text check (modalidade in ('dinheiro','debito','credito','pix')),
  valor_pago_centavos integer check (valor_pago_centavos > 0 and valor_pago_centavos <= 100000000),
  pago_em timestamptz,
  pagador_nome text,
  recebedor_nome text,
  referencia text,
  idempotencia uuid unique,
  registrado_por uuid not null references auth.users(id) on delete restrict,
  registrado_em timestamptz not null default now(),
  constraint educart_r11_baixa_modo check (
    (origem='historico_conferido' and modalidade is null and valor_pago_centavos is null
      and pago_em is null and idempotencia is null and
      length(btrim(coalesce(referencia,''))) between 8 and 200)
    or (origem='recebimento' and modalidade is not null and valor_pago_centavos is not null
      and pago_em is not null and idempotencia is not null
      and length(btrim(coalesce(pagador_nome,''))) between 2 and 160
      and length(btrim(coalesce(recebedor_nome,''))) between 2 and 160
      and (referencia is null or length(btrim(referencia)) between 8 and 200))
  )
);
create index educart_r11_parcelas_vencimento_idx
  on public.educart_parcelas_financeiras_r11_dev(vencimento_em,situacao);
create index educart_r11_baixas_data_idx
  on public.educart_baixas_financeiras_r11_dev(registrado_em);
create unique index educart_r11_referencia_modalidade_unica
  on public.educart_baixas_financeiras_r11_dev(modalidade,lower(btrim(referencia)))
  where origem='recebimento' and modalidade <> 'dinheiro' and referencia is not null;

alter table public.educart_planos_financeiros_r11_dev enable row level security;
alter table public.educart_parcelas_financeiras_r11_dev enable row level security;
alter table public.educart_baixas_financeiras_r11_dev enable row level security;
revoke all on public.educart_planos_financeiros_r11_dev,
  public.educart_parcelas_financeiras_r11_dev,public.educart_baixas_financeiras_r11_dev
  from public,anon,authenticated;
grant select on public.educart_planos_financeiros_r11_dev,
  public.educart_parcelas_financeiras_r11_dev,public.educart_baixas_financeiras_r11_dev to authenticated;

create policy educart_r11_planos_admin_select on public.educart_planos_financeiros_r11_dev
  for select to authenticated using (
    exists (select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
    and exists (select 1 from public.equipe_papeis e
      where e.user_id=(select auth.uid()) and e.papel='coordenacao')
  );
create policy educart_r11_parcelas_admin_ou_titular on public.educart_parcelas_financeiras_r11_dev
  for select to authenticated using (
    (exists (select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
     and exists (select 1 from public.equipe_papeis e
       where e.user_id=(select auth.uid()) and e.papel='coordenacao'))
    or exists (select 1 from public.matriculas m join public.pessoas p on p.id=m.pessoa_id
       where m.id=matricula_id and p.auth_user_id=(select auth.uid()))
  );
create policy educart_r11_baixas_admin_select on public.educart_baixas_financeiras_r11_dev
  for select to authenticated using (
    exists (select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
    and exists (select 1 from public.equipe_papeis e
      where e.user_id=(select auth.uid()) and e.papel='coordenacao')
  );

-- Em cada função: exigir Auth + membership, nunca confiar em claims/editáveis do browser.
create or replace function educart_interno_dev.educart_r11_salvar_rascunho_dev(
  p_matricula_id uuid,p_competencia_inicial date,p_dia_vencimento integer,
  p_valor_centavos integer,p_referencia_acordo text)
returns uuid language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid(); v_situacao text;
begin
  if v_uid is null
    or not exists(select 1 from public.portal_admins where user_id=v_uid)
    or not exists(select 1 from public.equipe_papeis where user_id=v_uid and papel='coordenacao')
  then raise exception 'Operador administrativo não autorizado' using errcode='42501'; end if;
  if p_competencia_inicial is null
    or p_competencia_inicial<>date_trunc('month',p_competencia_inicial::timestamp)::date
    or p_dia_vencimento not between 1 and 28
    or p_valor_centavos not between 1 and 100000000
    or length(btrim(coalesce(p_referencia_acordo,''))) not between 8 and 200
  then raise exception 'Plano individual inválido' using errcode='22023'; end if;
  select situacao into v_situacao from public.matriculas
    where id=p_matricula_id for share;
  if not found or v_situacao in ('cancelada') then
    raise exception 'Matrícula não elegível' using errcode='22023'; end if;
  insert into public.educart_planos_financeiros_r11_dev(
    matricula_id,competencia_inicial,dia_vencimento,valor_parcela_centavos,
    referencia_acordo,registrado_por
  ) values (
    p_matricula_id,p_competencia_inicial,p_dia_vencimento,
    p_valor_centavos,btrim(p_referencia_acordo),v_uid
  )
  on conflict(matricula_id) do update set
    competencia_inicial=excluded.competencia_inicial,
    dia_vencimento=excluded.dia_vencimento,
    valor_parcela_centavos=excluded.valor_parcela_centavos,
    referencia_acordo=excluded.referencia_acordo,
    registrado_por=v_uid,registrado_em=now()
  where public.educart_planos_financeiros_r11_dev.situacao='rascunho';
  if not found then raise exception 'Plano ativo não pode ser reescrito' using errcode='23514'; end if;
  return p_matricula_id;
end;$$;

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

create or replace function educart_interno_dev.educart_r11_registrar_recebimento_dev(
 p_parcela_id uuid,p_idempotencia uuid,p_modalidade text,
 p_pagador_nome text,p_recebedor_nome text,p_pago_em timestamptz,
 p_referencia text,p_confirmei_recebimento boolean)
returns uuid language plpgsql security definer
set search_path to 'pg_catalog','public','pg_temp' as $$
declare v_uid uuid:=auth.uid();v_p public.educart_parcelas_financeiras_r11_dev%rowtype;
 v_exist public.educart_baixas_financeiras_r11_dev%rowtype;v_id uuid;
begin
 if v_uid is null or
  not exists(select 1 from public.portal_admins where user_id=v_uid) or
  not exists(select 1 from public.equipe_papeis where user_id=v_uid and papel='coordenacao')
 then raise exception 'Operador não autorizado' using errcode='42501'; end if;
 if p_confirmei_recebimento is distinct from true
   or p_idempotencia is null
   or p_modalidade not in ('dinheiro','debito','credito','pix')
   or p_pago_em is null or p_pago_em>now()+interval '5 minutes'
   or length(btrim(coalesce(p_pagador_nome,''))) not between 2 and 160
   or length(btrim(coalesce(p_recebedor_nome,''))) not between 2 and 160
   or (p_modalidade<>'dinheiro' and length(btrim(coalesce(p_referencia,''))) not between 8 and 200)
   or (p_referencia is not null and length(btrim(p_referencia)) not between 8 and 200)
 then raise exception 'Pagamento exige comprovacao e dados válidos' using errcode='22023'; end if;
 select * into v_exist from public.educart_baixas_financeiras_r11_dev
   where idempotencia=p_idempotencia;
 if found then
  if v_exist.parcela_id=p_parcela_id and v_exist.modalidade=p_modalidade
    and v_exist.pago_em=p_pago_em and v_exist.pagador_nome=btrim(p_pagador_nome)
    and v_exist.recebedor_nome=btrim(p_recebedor_nome)
    and v_exist.referencia is not distinct from nullif(btrim(p_referencia),'')
  then return v_exist.id; end if;
  raise exception 'Chave idempotente reutilizada com dados divergentes' using errcode='23505';
 end if;
 select * into v_p from public.educart_parcelas_financeiras_r11_dev
   where id=p_parcela_id for update;
 if not found or v_p.situacao<>'pendente' or
   not exists(select 1 from public.educart_planos_financeiros_r11_dev
     where matricula_id=v_p.matricula_id and situacao='ativo')
 then raise exception 'Parcela não elegível ou já quitada' using errcode='22023'; end if;
 insert into public.educart_baixas_financeiras_r11_dev(
   parcela_id,origem,modalidade,valor_pago_centavos,pago_em,
   pagador_nome,recebedor_nome,referencia,idempotencia,registrado_por)
 values(v_p.id,'recebimento',p_modalidade,v_p.valor_centavos,
   p_pago_em,btrim(p_pagador_nome),btrim(p_recebedor_nome),
   nullif(btrim(p_referencia),''),p_idempotencia,v_uid) returning id into v_id;
 update public.educart_parcelas_financeiras_r11_dev
   set situacao='paga',confirmado_por=v_uid,confirmado_em=now() where id=v_p.id;
 return v_id;
end;$$;

create or replace function public.educart_r11_salvar_rascunho_dev(
  p_matricula_id uuid,p_competencia_inicial date,p_dia_vencimento integer,
  p_valor_centavos integer,p_referencia_acordo text)
returns uuid language sql security invoker
set search_path to 'pg_catalog','public','pg_temp' as $$
 select educart_interno_dev.educart_r11_salvar_rascunho_dev($1,$2,$3,$4,$5);$$;
create or replace function public.educart_r11_ativar_plano_dev(
 p_matricula_id uuid,p_parcelas_historicas integer[],p_fonte_historica text,p_confirmo_plano boolean)
returns uuid language sql security invoker
set search_path to 'pg_catalog','public','pg_temp' as $$
 select educart_interno_dev.educart_r11_ativar_plano_dev($1,$2,$3,$4);$$;
create or replace function public.educart_r11_registrar_recebimento_dev(
 p_parcela_id uuid,p_idempotencia uuid,p_modalidade text,
 p_pagador_nome text,p_recebedor_nome text,p_pago_em timestamptz,
 p_referencia text,p_confirmei_recebimento boolean)
returns uuid language sql security invoker
set search_path to 'pg_catalog','public','pg_temp' as $$
 select educart_interno_dev.educart_r11_registrar_recebimento_dev($1,$2,$3,$4,$5,$6,$7,$8);$$;
grant usage on schema educart_interno_dev to authenticated;
revoke all on function educart_interno_dev.educart_r11_salvar_rascunho_dev(uuid,date,integer,integer,text),
 educart_interno_dev.educart_r11_ativar_plano_dev(uuid,integer[],text,boolean),
 educart_interno_dev.educart_r11_registrar_recebimento_dev(uuid,uuid,text,text,text,timestamptz,text,boolean)
 from public,anon,authenticated;
grant execute on function educart_interno_dev.educart_r11_salvar_rascunho_dev(uuid,date,integer,integer,text),
 educart_interno_dev.educart_r11_ativar_plano_dev(uuid,integer[],text,boolean),
 educart_interno_dev.educart_r11_registrar_recebimento_dev(uuid,uuid,text,text,text,timestamptz,text,boolean)
 to authenticated;
revoke all on function public.educart_r11_salvar_rascunho_dev(uuid,date,integer,integer,text),
 public.educart_r11_ativar_plano_dev(uuid,integer[],text,boolean),
 public.educart_r11_registrar_recebimento_dev(uuid,uuid,text,text,text,timestamptz,text,boolean)
 from public,anon,authenticated;
grant execute on function public.educart_r11_salvar_rascunho_dev(uuid,date,integer,integer,text),
 public.educart_r11_ativar_plano_dev(uuid,integer[],text,boolean),
 public.educart_r11_registrar_recebimento_dev(uuid,uuid,text,text,text,timestamptz,text,boolean)
 to authenticated;

comment on table public.educart_baixas_financeiras_r11_dev is
 'Financeiro R11 DEV: recibos atuais e baixas historicas conferidas (sem valor/data ficticios).';
