-- EducART R37 - convite individual, uso único; grava SOMENTE proposta para conferência.
create table if not exists public.educart_convites_atualizacao_r37 (
 id uuid primary key default gen_random_uuid(),
 pessoa_id uuid not null references public.pessoas(id),
 hash_convite text not null unique,
 criado_por uuid not null,
 criado_em timestamptz not null default now(),
 expira_em timestamptz not null default (now()+interval '7 days'),
 usado_em timestamptz,
 check (expira_em>criado_em)
);
create table if not exists public.educart_atualizacoes_cadastrais_r37 (
 id uuid primary key default gen_random_uuid(),
 pessoa_id uuid not null references public.pessoas(id),
 convite_id uuid not null unique references public.educart_convites_atualizacao_r37(id),
 dados jsonb not null,
 recebido_em timestamptz not null default now(),
 situacao text not null default 'pendente_conferencia' check(situacao='pendente_conferencia'),
 check(jsonb_typeof(dados)='object' and length(dados::text)<10000)
);
alter table public.educart_convites_atualizacao_r37 enable row level security;
alter table public.educart_atualizacoes_cadastrais_r37 enable row level security;
revoke all on public.educart_convites_atualizacao_r37 from public,anon,authenticated;
revoke all on public.educart_atualizacoes_cadastrais_r37 from public,anon,authenticated;
grant select on public.educart_atualizacoes_cadastrais_r37 to authenticated;
create policy r37_coord_ler_propostas on public.educart_atualizacoes_cadastrais_r37 for select to authenticated
 using ((select auth.uid()) is not null
 and exists (select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 and exists (select 1 from public.equipe_papeis e where e.user_id=(select auth.uid()) and e.papel in ('secretaria','coordenacao')));
create or replace function public.educart_r37_criar_convite(p_pessoa_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_token text;
begin
 if auth.uid() is null
  or not exists(select 1 from public.portal_admins a where a.user_id=auth.uid())
  or not exists(select 1 from public.equipe_papeis e where e.user_id=auth.uid() and e.papel in ('secretaria','coordenacao'))
 then raise exception 'acesso negado'; end if;
 if not exists(select 1 from public.pessoas where id=p_pessoa_id) then raise exception 'cadastro inexistente'; end if;
 v_token:=gen_random_uuid()::text||'-'||gen_random_uuid()::text;
 insert into public.educart_convites_atualizacao_r37(pessoa_id,hash_convite,criado_por)
 values (p_pessoa_id,encode(digest(v_token,'sha256'),'hex'),auth.uid());
 return v_token;
end;$$;
create or replace function public.educart_r37_enviar_atualizacao(p_convite text,p_dados jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_convite public.educart_convites_atualizacao_r37%rowtype;
begin
 if p_convite is null or length(p_convite)>150 or length(p_convite)<70 then return false;end if;
 if p_dados is null or jsonb_typeof(p_dados)<>'object' or length(p_dados::text)>9000 then return false;end if;
 if length(btrim(coalesce(p_dados->>'nome_completo',''))) not between 3 and 150 then return false;end if;
 if length(btrim(coalesce(p_dados->>'telefone',''))) not between 10 and 30 then return false;end if;
 if length(btrim(coalesce(p_dados->>'email','')))>254 then return false;end if;
 select * into v_convite from public.educart_convites_atualizacao_r37
 where hash_convite=encode(digest(p_convite,'sha256'),'hex') for update;
 if not found or v_convite.usado_em is not null or v_convite.expira_em<=now() then return false;end if;
 insert into public.educart_atualizacoes_cadastrais_r37(pessoa_id,convite_id,dados)
 values (v_convite.pessoa_id,v_convite.id,p_dados);
 update public.educart_convites_atualizacao_r37 set usado_em=now() where id=v_convite.id;
 return true;
end;$$;
revoke all on function public.educart_r37_criar_convite(uuid) from public,anon,authenticated;
grant execute on function public.educart_r37_criar_convite(uuid) to authenticated;
revoke all on function public.educart_r37_enviar_atualizacao(text,jsonb) from public,anon,authenticated;
grant execute on function public.educart_r37_enviar_atualizacao(text,jsonb) to anon;
