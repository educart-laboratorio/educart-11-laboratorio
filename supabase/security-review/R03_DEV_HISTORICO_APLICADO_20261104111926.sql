-- R03 / EducART 1.1: CÓPIA DE RASTREABILIDADE — APENAS database-dev.
-- Aplicado no projeto Supabase database-dev (esjrjzyvyhtzwgihcbsc).
-- Migração registrada: 20261104111926_r03_dev_inscricoes_publicas_status_pendente_privilegios_minimos_20261104.
-- Validado por consulta read-only: anon não possui TRUNCATE/DELETE/SELECT,
-- INSERT público exige 14+ e status pendente, UPDATE apenas na coluna status,
-- RLS admin preservado. Nenhum usuário/inscrição permanente criado.
--
-- ALERTA: arquivo de histórico e NÃO migração a ser executada.
-- NÃO MOVER para supabase/migrations sem aprovação explícita de produção.
-- O SQL aplicado incluía um bloco pré-condicional de verificação de
-- ambiente vazio e políticas administrativas, antes deste corpo transacional.
-- NÃO EXECUTAR EM PRODUÇÃO. NÃO REAPLICAR AUTOMATICAMENTE EM DEV.
--
alter table public.inscricoes_oficina enable row level security;

-- Nome histórico real nas duas bases auditadas.
drop policy if exists "Permitir envio publico de fichas de inscricao"
  on public.inscricoes_oficina;

-- Reaplicação defensiva para ambientes de teste que já tenham a política.
drop policy if exists "educart_public_submit_pending_14"
  on public.inscricoes_oficina;

-- Somente 14+; a aplicação 1.0 deixa status a cargo do default existente.
create policy "educart_public_submit_pending_14"
on public.inscricoes_oficina
for insert to anon, authenticated
with check (
  status = 'pendente_confirmacao'
  and data_nascimento <= (
    ((now() at time zone 'America/Bahia')::date - interval '14 years')::date
  )
);

-- Remover inclusive TRUNCATE/DELETE/UPDATE herdados do database-dev.
-- Row Level Security NÃO impede TRUNCATE, portanto REVOKE é obrigatório.
revoke all on table public.inscricoes_oficina from anon, authenticated;

-- Preservar inscrição pública sem permitir leitura dos dados cadastrados.
grant insert on table public.inscricoes_oficina to anon, authenticated;

-- Acesso somente com as policies de membership em portal_admins já existentes.
grant select on table public.inscricoes_oficina to authenticated;

-- Somente campo de andamento da inscrição, não PII da ficha.
-- RLS administrativo existente ainda decide QUEM pode atualizá-lo.
grant update(status) on table public.inscricoes_oficina to authenticated;
