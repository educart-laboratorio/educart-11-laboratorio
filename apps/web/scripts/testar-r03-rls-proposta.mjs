/**
 * R03 / LIPE — contrato da migração RLS candidata.
 * Static check: complementa, mas NÃO substitui o dry-run SQL real do
 * 04-11-2026 em database-dev (BEGIN ... ROLLBACK).
 * Validação do Painel Administrativo é OBRIGATÓRIA.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = p => readFileSync(p, 'utf8');
const original = read('../../supabase/security-review/R03_PROPOSTA_RLS_SEM_APLICACAO.sql');
const sql = original.replace(/--[^\n]*/g, '').replace(/\s+/g,' ').toLowerCase();
const admin = read('src/app/admin/page.tsx');
const login = read('src/app/admin/login/page.tsx');
const academy = read('src/components/AdminRotinaAcademicaLab.tsx');
const migrationSource = read('../../supabase/migrations/20261007_create_inscricoes_oficina.sql');

const includes = (expr,label) => assert(sql.includes(expr),label);
includes('begin;', 'Proposta deve ser transacional');
includes('commit;', 'Proposta deve ser transacional');
includes('alter table public.inscricoes_oficina enable row level security', 'RLS obrigatório');
includes('create policy "educart_public_submit_pending_14"', 'Política de envio 14+ ausente');
includes('for insert to anon, authenticated', 'Fluxo público da 1.0 preservado');
includes("status = 'pendente_confirmacao'", 'Status inicial não pode ser forjado');
includes("at time zone 'america/bahia'", 'Idade mínima usa data local da EducART');
includes("interval '14 years'", 'Idade mínima não pode ser reduzida');
includes('revoke all on table public.inscricoes_oficina from anon, authenticated', 'Grants antigos, inclusive TRUNCATE, devem ser revogados');
includes('grant insert on table public.inscricoes_oficina to anon, authenticated', 'Cadastro público deve continuar');
includes('grant select on table public.inscricoes_oficina to authenticated', 'RLS existente segue controlando leitura');
includes('grant update(status) on table public.inscricoes_oficina to authenticated', 'Somente status pode ser atualizado');
assert(migrationSource.includes("status text default 'pendente_confirmacao'"), 'Default da 1.0 precisa existir');
assert(sql.indexOf('revoke all') < sql.indexOf('grant insert'), 'Grants devem ser reconstruídos do zero');
assert(!/\bgrant\s+(all|delete|truncate|update\s+on\s+table)/i.test(sql), 'Privilégio amplo/inseguro reintroduzido');
assert(!/drop policy[^;]*educart_admin_(read|update)/.test(sql),'Não derrubar policies administrativas existentes');
assert(!/alter table public\.portal_admins/.test(sql),'Não modificar tabela de identidade administrativa nesta mudança');
assert(!/with check\s*\(\s*true\s*\)/.test(sql),'INSERT público sem proteção');
assert(!/\bsecurity definer\b/.test(sql),'Não criar bypass RLS');
assert(!/\bcreate table\b/.test(sql),'Não recriar dados históricos');
assert(!/insert into public\.portal_admins/.test(sql),'Não autoconceder permissões');
assert(!readdirSync('../../supabase/migrations').some(f=>/r03.*(rls|seguranca)|status_pendente/i.test(f)), 'A proposta NÃO pode aparecer como migração aplicada sem autorização específica');

assert(admin.includes('obterPapeisGestao(supabase, user.id)'),'Painel /admin precisa checar membership e cargo');
assert(admin.includes('if (isLoading || !acessoAutorizado)'),'Não renderizar dashboard antes de autorizar');
assert(admin.includes('.update({ status: newStatus })'),'Dashboard não deve atualizar ficha inteira');
assert(admin.includes('<AdminRotinaAcademicaLab />'),'NUNCA omitir Painel Administrativo das auditorias');
assert(login.includes('obterPapeisGestao(supabase, data.user.id)'),'Login não autoriza autenticado sem cargo');
assert(academy.includes('Nenhum acesso a Supabase, pagamentos ou inscrições reais é efetuado aqui.'),'Módulo acadêmico continua sintético');

console.log('R03 SQL/LIPE PASS: INSERT público protegido, idade 14+, status pendente, REVOKE TRUNCATE, UPDATE(status), políticas admin existentes preservadas.');
console.log('R03 ADMIN PASS: /admin/login e /admin incluídos; sem migração ativa ou deploy. Dry-run real registrado separadamente.');
