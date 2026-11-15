-- ==============================================================================
-- MIGRATION: Tabela de Inscrições com Restrição Única e Políticas RLS Completas
-- Portal EducART (portaleducart.pro)
-- ==============================================================================

create table if not exists public.inscricoes_oficina (
  id uuid primary key default gen_random_uuid(),
  nome_completo text not null,
  data_nascimento date not null,
  telefone_whatsapp text not null,
  email text not null,
  endereco_bairro text not null,
  cidade_estado text not null,
  objetivo text not null,
  experiencia_previa boolean default false,
  quais_experiencias text,
  como_conheceu text not null,
  turma_campanha text default 'Turma de Outubro / 2026',
  origem text default 'Portal EducART (portaleducart.pro)',
  status text default 'pendente_confirmacao', -- pendente_confirmacao, confirmado, matriculado
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Evita inscrições duplicadas para o mesmo e-mail na mesma campanha/turma
  constraint unq_email_turma unique (email, turma_campanha)
);

-- Ativar Row Level Security (Segurança a nível de linha)
alter table public.inscricoes_oficina enable row level security;

-- 1. Permitir envio público de inscrições (somente escrita anônima e autenticada)
create policy "Permitir envio publico de fichas de inscricao"
  on public.inscricoes_oficina
  for insert
  to anon, authenticated
  with check (true);

-- 2. Permitir leitura apenas para usuários logados da equipe/administração
create policy "Permitir leitura apenas para usuarios autenticados"
  on public.inscricoes_oficina
  for select
  to authenticated
  using (true);

-- 3. Permitir atualização de status (ex: de pendente para confirmado) pela administração
create policy "Permitir atualizacao apenas para usuarios autenticados"
  on public.inscricoes_oficina
  for update
  to authenticated
  using (true);
