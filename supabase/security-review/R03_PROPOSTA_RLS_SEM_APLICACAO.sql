-- ATUALIZAÇÃO (04/11/2026): o corpo deste candidato JÁ FOI APLICADO
-- SOMENTE AO SUPABASE database-dev, migração nº 20261104111926.
-- Este arquivo continua INATIVO NO GITHUB (não vai para produção).
-- Registrar evidência: R03_DEV_HISTORICO_APLICADO_20261104111926.sql.
-- NÃO EXECUTAR EM PRODUÇÃO. NÃO REAPLICAR EM DEV.
-- EducART 1.1 · R03 · candidato de migração de menor privilégio
-- STATUS: PROPOSTA INATIVA. NÃO ESTÁ EM supabase/migrations/
-- NÃO EXECUTAR EM PRODUÇÃO, DEV OU STAGING SEM ORDEM EXPRESSA.
--
-- Validação técnica: 04/11/2026, projeto database-dev, em transação
-- BEGIN ... ROLLBACK. NOVE verificações passaram no teste descartável;
-- rollback foi confirmado em consulta separada, sem alteração persistente.
-- Relatório: AUTODEV_EDUCART_1_1_R03_VALIDACAO_RLS_ISOLADA_2026-11-04.md
--
-- RISCO ENCONTRADO: GRANT TRUNCATE para anon no database-dev;
-- RLS NÃO controla TRUNCATE. O banco dev original permanece inalterado.
--
-- Nesta revisão, NÃO tocamos portal_admins, permissões de membros,
-- políticas administrativas SELECT/UPDATE existentes ou dados reais.
-- O objetivo é corrigir só INSERT público e grants excessivos da
-- tabela de inscrições; autorização administrativa segue no RLS atual.
--
-- PRÉ-REQUISITOS DA APLICAÇÃO DEFINITIVA:
-- 1. Ordem específica indicando ambiente de destino (dev ≠ produção).
-- 2. Revisão do diff e backup/rollback dos grants e policies originais.
-- 3. Teste de inscrição 14+, status inicial pendente, usuário sem
--    membership, membro admin e UPDATE(status), /admin/login, /admin,
--    módulo acadêmico, acessibilidade, WhatsApp e exportação CSV.
-- 4. Migração criada pelo CLI oficial e aprovação separada de rollout.

begin;

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

commit;

-- Não criar política USING(true) para dados pessoais.
-- Não conceder ALL, DELETE, TRUNCATE a anon/authenticated.
-- Não alterar status em fluxo público fora do default e WITH CHECK.
-- Não atribuir membership ou papel técnico por nome, e-mail ou UI.
-- RBAC Secretaria x Coordenação continuará em análise própria do R03.
