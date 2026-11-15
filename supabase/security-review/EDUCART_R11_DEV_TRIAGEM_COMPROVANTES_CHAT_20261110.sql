-- EducART 1.1 / DEV - triagem de comprovantes recebidos no atendimento.
-- Nao cria matricula, Pix, parcela, baixa ou quitação. Sem CPF nem bytes do print.
-- Apenas a integracao privilegiada e auditada pode registrar evidencias;
-- operadores autenticados da Secretaria/Coordenacao podem CONSULTAR.
create table public.educart_comprovantes_triagem_chat_dev (
  id uuid primary key default gen_random_uuid(),
  identificador_pix text not null check (char_length(btrim(identificador_pix)) between 8 and 150),
  pagador_nome text not null check (char_length(btrim(pagador_nome)) between 2 and 160),
  valor_centavos integer not null check (valor_centavos > 0 and valor_centavos <= 100000000),
  ocorrido_em timestamptz,
  matricula_id uuid references public.matriculas(id) on delete restrict,
  baixa_r11_id uuid unique references public.educart_baixas_financeiras_r11_dev(id) on delete restrict,
  situacao text not null default 'pendente_conferencia'
    check (situacao in ('pendente_conferencia','conciliado','descartado')),
  origem text not null default 'conversa_autodev'
    check (origem = 'conversa_autodev'),
  registrado_em timestamptz not null default now(),
  conferido_em timestamptz,
  conferido_por uuid references auth.users(id) on delete restrict,
  constraint educart_triagem_chat_conciliacao_coerente check (
    (situacao = 'conciliado' and matricula_id is not null
      and baixa_r11_id is not null and conferido_em is not null and conferido_por is not null)
    or
    (situacao <> 'conciliado' and baixa_r11_id is null
      and conferido_em is null and conferido_por is null)
  )
);
create unique index educart_triagem_chat_pix_unico
  on public.educart_comprovantes_triagem_chat_dev (lower(btrim(identificador_pix)));
create index educart_triagem_chat_registro_idx
  on public.educart_comprovantes_triagem_chat_dev (registrado_em desc);
alter table public.educart_comprovantes_triagem_chat_dev enable row level security;
revoke all on public.educart_comprovantes_triagem_chat_dev from public, anon, authenticated;
grant select on public.educart_comprovantes_triagem_chat_dev to authenticated;
grant select, insert, update, delete on public.educart_comprovantes_triagem_chat_dev to service_role;
create policy educart_triagem_chat_leitura_equipe
  on public.educart_comprovantes_triagem_chat_dev
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and exists (select 1 from public.portal_admins a where a.user_id=(select auth.uid()))
    and exists (select 1 from public.equipe_papeis p
      where p.user_id=(select auth.uid()) and p.papel in ('secretaria','coordenacao'))
  );
comment on table public.educart_comprovantes_triagem_chat_dev is
  'DEV: evidencias de comprovantes trazidos ao ChatGPT; jamais prova de liquidação. A baixa depende de conferencia real e RPC R11.';
