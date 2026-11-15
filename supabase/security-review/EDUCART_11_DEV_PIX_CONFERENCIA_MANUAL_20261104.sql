-- EducART 1.1 — APLICADA APENAS EM DATABASE-DEV, EM 04/11/2026.
-- Migration confirmada: 20261104212724 educart_11_pix_manual_conferencia_atomica_dev_20261104.
-- NÃO REAPLICAR no DEV e NÃO aplicar em database-prod ou migrations genéricas.
-- Cópia normativa para auditoria; testes E2E autenticados ainda PENDENTES.
-- Ambiente de desenvolvimento: usar apenas dados sintéticos.
-- Registar Pix != conferir no extrato. "conferido" significa decisão HUMANA registrada.
-- No Pix de matrícula, confirmar ativa matrícula + inscrição na MESMA TRANSAÇÃO.
-- No Pix de mensalidade, confirmar dá baixa apenas em cobrança manual pré-existente.
-- Pix nunca envia WhatsApp automaticamente, não concede perfil artístico.
-- Funções SECURITY INVOKER; RLS de pessoas, inscrições e matrículas continua vigente.

do $preflight$
begin
  if to_regprocedure('public.educart_pre_matricular_dev(uuid,uuid,uuid)') is null then
    raise exception 'A pré-matrícula DEV deve existir antes do fluxo financeiro';
  end if;
  if to_regclass('public.educart_pix_manuais') is not null then
    raise exception 'Tabela Pix já existe: não reaplicar migração';
  end if;
end $preflight$;

create table public.educart_pix_manuais (
 id uuid primary key default gen_random_uuid(),
 matricula_id uuid not null references public.matriculas(id) on delete restrict,
 mensalidade_id uuid references public.mensalidades_formacao(id) on delete restrict,
 finalidade text not null check (finalidade in ('matricula','mensalidade')),
 valor_centavos integer not null check (valor_centavos > 0 and valor_centavos <= 100000000),
 identificador_pix text not null unique check (length(btrim(identificador_pix)) between 8 and 100),
 ocorrido_em timestamptz not null,
 descricao text check (descricao is null or length(descricao)<=300),
 situacao text not null default 'registrado' check (situacao in ('registrado','conferido')),
 registrado_por uuid not null references auth.users(id) on delete restrict,
 registrado_em timestamptz not null default now(),
 conferido_por uuid references auth.users(id) on delete restrict,
 conferido_em timestamptz,
 referencia_conferencia text check (referencia_conferencia is null or length(referencia_conferencia)<=200),
 constraint pix_destino_coerente check (
  (finalidade='matricula' and mensalidade_id is null)
  or (finalidade='mensalidade' and mensalidade_id is not null)
 ),
 constraint pix_conferencia_coerente check (
  (situacao='registrado' and conferido_por is null and conferido_em is null and referencia_conferencia is null)
  or (situacao='conferido' and conferido_por is not null and conferido_em is not null
      and length(btrim(referencia_conferencia)) >= 8)
 )
);

create unique index educart_pix_uma_matricula_conferida
 on public.educart_pix_manuais(matricula_id)
 where finalidade='matricula' and situacao='conferido';
create unique index educart_pix_uma_mensalidade_conferida
 on public.educart_pix_manuais(mensalidade_id)
 where finalidade='mensalidade' and situacao='conferido';

alter table public.educart_pix_manuais enable row level security;
revoke all on public.educart_pix_manuais from public, anon, authenticated;
grant select,insert,update on public.educart_pix_manuais to authenticated;

create policy "educart_pix_ler_equipe"
on public.educart_pix_manuais for select to authenticated
using (
 exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid())
    and e.papel in ('coordenacao','secretaria'))
);

create policy "educart_pix_registrar_coordenacao"
on public.educart_pix_manuais for insert to authenticated
with check (
 exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid())
    and e.papel='coordenacao')
 and registrado_por=(select auth.uid())
 and situacao='registrado'
 and conferido_por is null and conferido_em is null and referencia_conferencia is null
);

create policy "educart_pix_conferir_coordenacao"
on public.educart_pix_manuais for update to authenticated
using (
 exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid())
    and e.papel='coordenacao')
)
with check (
 exists(select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
 and exists(select 1 from public.equipe_papeis e where e.user_id=(select auth.uid())
    and e.papel='coordenacao')
 and situacao='conferido' and conferido_por=(select auth.uid())
);

-- Registro original é imutável. Permitimos somente a passagem única para
-- "conferido" e nunca edição posterior, exclusão ou alteração de referência.
create function public.educart_pix_imutavel_dev()
returns trigger language plpgsql security invoker set search_path=public,pg_temp
as $$
begin
 -- Somente o fluxo transacional da RPC pode concluir a transição.
 if current_setting('educart.pix_conferencia_rpc',true) is distinct from 'true' then
   raise exception 'Conferência somente pela operação transacional da Coordenação' using errcode='42501';
 end if;
 if old.situacao <> 'registrado' or new.situacao <> 'conferido' then
   raise exception 'Pix somente pode passar de registrado a conferido uma vez' using errcode='23514';
 end if;
 if (new.id,new.matricula_id,new.mensalidade_id,new.finalidade,new.valor_centavos,
     new.identificador_pix,new.ocorrido_em,new.descricao,new.registrado_por,new.registrado_em)
    is distinct from
    (old.id,old.matricula_id,old.mensalidade_id,old.finalidade,old.valor_centavos,
     old.identificador_pix,old.ocorrido_em,old.descricao,old.registrado_por,old.registrado_em) then
   raise exception 'Dados originais do Pix são imutáveis' using errcode='23514';
 end if;
 if new.conferido_por is distinct from auth.uid()
   or new.conferido_em is null
   or length(btrim(coalesce(new.referencia_conferencia,''))) < 8 then
   raise exception 'Conferência humana deve ter autor, momento e referência' using errcode='23514';
 end if;
 return new;
end;
$$;
revoke all on function public.educart_pix_imutavel_dev() from public,anon,authenticated;
create trigger educart_pix_transicao_conferencia
 before update on public.educart_pix_manuais
 for each row execute function public.educart_pix_imutavel_dev();

-- Invariantes antes de inserir: destino mensalidade deve pertencer à matrícula;
-- não aceita Pix em matrícula cancelada, nem referência reaproveitada.
create function public.educart_pix_validar_registro_dev()
returns trigger language plpgsql security invoker set search_path=public,pg_temp
as $$
declare v_status text;
declare v_matricula_id uuid;
begin
 if new.identificador_pix <> btrim(new.identificador_pix) then
   raise exception 'Identificador deve estar sem espaços nas pontas' using errcode='22023';
 end if;
 if new.ocorrido_em > now() + interval '5 minutes' then
   raise exception 'Data do Pix não pode estar no futuro' using errcode='22023';
 end if;
 select situacao into v_status from public.matriculas where id=new.matricula_id;
 if not found or v_status in ('cancelada','trancada','concluida') then
   raise exception 'Matrícula não elegível para lançamento Pix' using errcode='22023';
 end if;
 if new.finalidade='mensalidade' then
   select matricula_id into v_matricula_id
     from public.mensalidades_formacao where id=new.mensalidade_id;
   if not found or v_matricula_id <> new.matricula_id then
     raise exception 'Mensalidade não pertence à matrícula' using errcode='22023';
   end if;
 end if;
 return new;
end;
$$;
revoke all on function public.educart_pix_validar_registro_dev() from public,anon,authenticated;
create trigger educart_pix_validar_registro
 before insert on public.educart_pix_manuais
 for each row execute function public.educart_pix_validar_registro_dev();

-- A operação abaixo NÃO busca no banco: ela exige que o operador tenha
-- conferido o extrato fora da EducART. Cada ação gera autoria e data.
-- O status "pago" representa atestado manual; NÃO integração bancária.
create function public.educart_conferir_pix_dev(
 p_pix_id uuid,
 p_referencia_conferencia text,
 p_conferi_extrato boolean
)
returns uuid language plpgsql security invoker set search_path=public,pg_temp
as $$
declare
 v_uid uuid;
 v_pix public.educart_pix_manuais%rowtype;
 v_matricula public.matriculas%rowtype;
 v_mensalidade public.mensalidades_formacao%rowtype;
 v_candidatura_status text;
begin
 v_uid := auth.uid();
 if v_uid is null
   or not exists (select 1 from public.portal_admins a where a.user_id=v_uid)
   or not exists (select 1 from public.equipe_papeis e
     where e.user_id=v_uid and e.papel='coordenacao')
 then
   raise exception 'Apenas Coordenação autorizada confirma Pix' using errcode='42501';
 end if;
 if p_conferi_extrato is distinct from true
   or length(btrim(coalesce(p_referencia_conferencia,''))) < 8
   or length(btrim(p_referencia_conferencia)) > 200
 then
   raise exception 'Confirme o extrato e identifique a referência da conferência'
     using errcode='22023';
 end if;

 select * into v_pix from public.educart_pix_manuais
   where id=p_pix_id for update;
 if not found or v_pix.situacao<>'registrado' then
   raise exception 'Pix inexistente ou já conferido' using errcode='22023';
 end if;
 select * into v_matricula from public.matriculas
   where id=v_pix.matricula_id for update;
 if not found then
   raise exception 'Matrícula não localizada' using errcode='22023';
 end if;

 -- A transação autorizada também é exigida por triggers de matrícula,
 -- inscrição e mensalidade. A flag local não persiste fora desta RPC.
 perform set_config('educart.pix_conferencia_rpc','true',true);

 if v_pix.finalidade='matricula' then
   if v_matricula.situacao <> 'pendente' then
     raise exception 'A matrícula não está pendente' using errcode='22023';
   end if;
   if exists(select 1 from public.educart_pix_manuais p
      where p.matricula_id=v_matricula.id and p.finalidade='matricula' and p.situacao='conferido') then
     raise exception 'Matrícula já possui Pix conferido' using errcode='23505';
   end if;
   -- A operação é indivisível: matrícula só vira ativa junto da conferência.
   update public.matriculas
     set situacao='ativa', ingresso_em=coalesce(ingresso_em, (now() at time zone 'America/Bahia')::date)
     where id=v_matricula.id and situacao='pendente';
   if not found then raise exception 'Matrícula mudou durante a conferência'; end if;
   if v_matricula.candidatura_id is not null then
     select status into v_candidatura_status from public.inscricoes_oficina
        where id=v_matricula.candidatura_id for update;
     if not found or v_candidatura_status='cancelado' then
       raise exception 'Candidatura cancelada ou inexistente' using errcode='22023';
     end if;
     update public.inscricoes_oficina
       set status='matriculado'
       where id=v_matricula.candidatura_id;
     if not found then raise exception 'Falha ao atualizar inscrição'; end if;
   end if;
 else
   select * into v_mensalidade from public.mensalidades_formacao
     where id=v_pix.mensalidade_id for update;
   if not found or v_mensalidade.matricula_id<>v_pix.matricula_id
      or v_mensalidade.status<>'pendente'
      or v_mensalidade.valor_centavos<>v_pix.valor_centavos then
      raise exception 'Mensalidade não elegível ou valor divergente' using errcode='22023';
   end if;
   update public.mensalidades_formacao set
     status='pago', pago_em=v_pix.ocorrido_em,
     confirmado_por=v_uid, confirmado_em=now()
     where id=v_mensalidade.id and status='pendente';
   if not found then raise exception 'Falha ao dar baixa na mensalidade'; end if;
 end if;

 update public.educart_pix_manuais set
   situacao='conferido',
   conferido_por=v_uid, conferido_em=now(),
   referencia_conferencia=btrim(p_referencia_conferencia)
   where id=v_pix.id and situacao='registrado';
 if not found then raise exception 'Falha ao registrar conferência'; end if;
 return v_pix.id;
end;
$$;
revoke all on function public.educart_conferir_pix_dev(uuid,text,boolean) from public,anon;
grant execute on function public.educart_conferir_pix_dev(uuid,text,boolean) to authenticated;

comment on table public.educart_pix_manuais is
 'EducART DEV 1.1: registros manuais de Pix, imutáveis após conferência; dados sintéticos.';
comment on function public.educart_conferir_pix_dev(uuid,text,boolean) is
 'DEV: conferência HUMANA explícita do extrato; matrícula e mensalidade alteradas de forma atômica.';


-- Defesas contra inconsistências criadas por edição direta de status em outras
-- tabelas do DEV. Não interfere em alterações de endereço, contato ou em
-- status administrativos não financeiros. Nenhuma delas existe em produção.
create function public.educart_bloquear_status_financeiro_direto_dev()
returns trigger language plpgsql security invoker set search_path=public,pg_temp
as $$
declare
 v_trocou_financeiro boolean := false;
begin
 if tg_table_name='matriculas' then
   v_trocou_financeiro :=
     (old.situacao='ativa' and new.situacao is distinct from 'ativa')
     or (new.situacao='ativa' and old.situacao is distinct from 'ativa');
 elsif tg_table_name='inscricoes_oficina' then
   v_trocou_financeiro :=
     (old.status='matriculado' and new.status is distinct from 'matriculado')
     or (new.status='matriculado' and old.status is distinct from 'matriculado');
 elsif tg_table_name='mensalidades_formacao' then
   v_trocou_financeiro :=
     (old.status='pago' and new.status is distinct from 'pago')
     or (new.status='pago' and old.status is distinct from 'pago');
 end if;
 if v_trocou_financeiro
   and current_setting('educart.pix_conferencia_rpc',true) is distinct from 'true'
 then
   raise exception 'Status financeiro só muda pela conferência transacional de Pix'
     using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function public.educart_bloquear_status_financeiro_direto_dev()
  from public,anon,authenticated;

create trigger educart_matricula_ativa_por_pix
 before update on public.matriculas for each row
 execute function public.educart_bloquear_status_financeiro_direto_dev();
create trigger educart_inscricao_matriculada_por_pix
 before update on public.inscricoes_oficina for each row
 execute function public.educart_bloquear_status_financeiro_direto_dev();
create trigger educart_mensalidade_paga_por_pix
 before update on public.mensalidades_formacao for each row
 execute function public.educart_bloquear_status_financeiro_direto_dev();
