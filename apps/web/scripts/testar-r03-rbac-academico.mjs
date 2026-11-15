/**
 * R03 / LIPE — Contrato da matriz acadêmica/financeira no database-dev.
 * Validação estática + roteiro de teste PostgreSQL reversível.
 * O SQL persistente foi aplicado somente em database-dev.
 * Painel Administrativo (/admin e /admin/login) é verificação obrigatória.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const raw=read('../../supabase/security-review/R03_DEV_PROPOSTA_RBAC_ACADEMICO_FINANCEIRO_20261104.sql');
const test=read('../../supabase/security-review/R03_DEV_TESTE_RBAC_ACADEMICO_FINANCEIRO_ROLLBACK.sql');
const admin=read('src/app/admin/page.tsx');
const login=read('src/app/admin/login/page.tsx');
const a11y=read('src/components/AccessibilityWidget.tsx');
const layout=read('src/app/layout.tsx');
const academy=read('src/components/AdminRotinaAcademicaLab.tsx');
const sql=raw.replace(/--[^\n]*/g,'').toLowerCase();

const tables=['autorizacoes_perfil','formacoes','matriculas','midias_artisticas','modulos','perfis_artisticos','pessoas','turmas'];
for(const table of tables){
  assert(sql.includes('alter policy "portal_admin_gerencia_'+table+'" on public.'+table),table+': política base preservada');
  const part=sql.split('alter policy "portal_admin_gerencia_'+table+'"')[1]?.split(';')[0]??'';
  assert(part.includes("ep.papel='coordenacao'"),table+': escrita sem papel explícito de Coordenação');
  assert(part.includes('with check'),table+': alteração deve proteger linha resultante');
  assert(part.includes('portal_admins'),table+': membership administrativo obrigatório');
}
for(const table of ['pessoas','matriculas']){
  assert(sql.includes('create policy "educart_secretaria_read_'+table+'"'),table+': Secretaria sem acesso de leitura');
}
for(const name of ['mensalidades_admin_select','mensalidades_admin_insert','mensalidades_admin_update']){
  assert(sql.includes('alter policy "'+name+'"'),name+': política financeira esquecida');
}
assert(sql.includes("ep.papel in ('secretaria','coordenacao')"),'Leitura financeira deve exigir papel válido');
assert(sql.includes("status <> 'pago' or confirmado_por=(select auth.uid())"),'Confirmação não deve omitir autoria');
assert(sql.includes('preflight'),'Migração deve ter guardas');
assert(!/\bdrop policy\b/i.test(sql),'Não remover policies originais de estudante');
assert(!/\bdrop table\b/i.test(sql),'Não apagar registros');
assert(!/\binsert into\b/i.test(sql),'Migração não deve criar dados ou conceder papéis');
assert(!/\bsecurity definer\b/i.test(sql),'Não contornar RLS');

assert(test.includes('BEGIN;') && test.trimEnd().endsWith('ROLLBACK;'),'Teste de banco deve reverter tudo');
assert(test.includes('request.jwt.claim.sub'),'Testes devem simular JWT');
for(const label of ['Secretaria','Coordenação','Não-admin','Duplo papel'])assert(test.includes(label),'Cenário de teste ausente: '+label);
assert(test.includes('pagamento')||test.includes("status=''pago''"),'Teste deve cobrir mensalidade');
assert(admin.includes('obterPapeisGestao(supabase, user.id)'));
assert(admin.includes("papeisGestao.includes('coordenacao')"));
assert(admin.includes('<AdminRotinaAcademicaLab />'),'Painel Administrativo obrigatório');
assert(login.includes('obterPapeisGestao(supabase, data.user.id)'));
assert(academy.includes('Nenhum acesso a Supabase, pagamentos ou inscrições reais é efetuado aqui.'),'Módulo acadêmico não pode ligar dados reais prematuramente');
assert(layout.includes('<AccessibilityWidget />')&&layout.includes('<WhatsAppFlutuante />'));
assert(a11y.includes('aria-modal="true"'));

console.log('R03 LIPE: 8 políticas de Coordenação, 2 políticas de leitura da Secretaria, 3 políticas financeiras.');
console.log('R03 LIPE: /admin/login, /admin, acadêmico, acessibilidade e WhatsApp verificados. Sem deploy. Teste RLS real documentado com rollback.');
