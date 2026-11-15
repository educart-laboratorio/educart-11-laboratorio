/**
 * EducART 1.1 — R03 / LIPE: segurança da gestão e escopo de acesso.
 *
 * Exercita a função de autorização REAL contra um Supabase sintético;
 * valida que /admin/login E /admin usam a mesma regra fail-closed.
 * Não conecta a produção nem consulta dados pessoais.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verificarAcessoGestao } from '../src/lib/admin/autorizar-gestao.ts';

const read=p=>fs.readFileSync(p,'utf8');
const login=read('src/app/admin/login/page.tsx');
const admin=read('src/app/admin/page.tsx');
const adminLayout=read('src/app/admin/layout.tsx');
const academic=read('src/components/AdminRotinaAcademicaLab.tsx');
const csvSeguro=read('src/lib/csv-seguro.ts');
const webClient=read('src/lib/supabase/client.ts');
const root=read('src/app/layout.tsx');
const sql=read('../../supabase/security-review/R03_PROPOSTA_RLS_SEM_APLICACAO.sql');

function fakeClient({record=null,error=null,throwError=false}={}) {
  const calls=[];
  const client={
    from(table){
      calls.push(['from',table]);
      return {select(column){
        calls.push(['select',column]);
        return {eq(field,id){
          calls.push(['eq',field,id]);
          return {async maybeSingle(){
            if(throwError) throw new Error('rede indisponível');
            return {data:record,error};
          }};
        }};
      }};
    }
  };
  return {client,calls};
}
const owner='01234567-89ab-4cde-8f01-234567890abc';
const other='00000000-1111-4222-8333-444444444444';
for(const [label,scenario,userId,expected] of [
  ['admin admitido',{record:{user_id:owner}},owner,true],
  ['user comum sem membership',{record:null},owner,false],
  ['user comum com id diferente',{record:{user_id:other}},owner,false],
  ['RLS devolve 42501',{record:null,error:{code:'42501'}},owner,false],
  ['erro de rede',{throwError:true},owner,false],
  ['id vazio',{record:{user_id:owner}},'',false],
]){
  const {client,calls}=fakeClient(scenario);
  assert.equal(await verificarAcessoGestao(client,userId),expected,label);
  if(userId)assert.deepEqual(calls,[['from','portal_admins'],['select','user_id'],['eq','user_id',userId]],label);
  else assert.equal(calls.length,0,'Id vazio não consulta banco');
  console.log('R03 CONTROLE:',label,'→',expected?'autorizado':'negado');
}
assert(login.includes('obterPapeisGestao(supabase, user.id)'),'Login deve verificar membership e papel antes de redirecionar');
assert(login.includes('obterPapeisGestao(supabase, data.user.id)'),'Login após senha também deve verificar papel');
assert(login.includes('user.is_anonymous')&&login.includes('data.user.is_anonymous'),'Login anônimo não é admin');
assert(login.includes("useMemo(() => createClient(), [])"),'Cliente Supabase de login deve ser estável');

const idxGuard=admin.indexOf('const papeis = await obterPapeisGestao(supabase, user.id)');
const idxSelect=admin.indexOf(".from('inscricoes_oficina')");
assert(idxGuard>=0&&idxSelect>idxGuard,'Admin deve checar membership ANTES de selecionar dados pessoais');
assert(admin.includes("if (papeis.length === 0) {")&&admin.includes("router.replace('/admin/login?acesso=restrito')"),'Negação do dashboard ausente');
assert(admin.includes('setInscricoes([])')&&admin.includes('setSelectedInscricao(null)'), 'Limpar dados locais após perda de permissão');
assert(admin.includes("supabase.auth.onAuthStateChange("),'Observação de logout/invalidade ausente');
assert(admin.includes("if (isLoading || !acessoAutorizado)"),'Painel não deve renderizar durante autorização');
assert(admin.includes("if (!acessoAutorizado || !podeAlterarStatus) return;"),'Mudança de status precisa de Coordenação');
assert(admin.includes('if (!acessoAutorizado || !podeAlterarStatus || registros.length === 0) return;')&&admin.includes("papeisAtuais.includes('coordenacao')"),'Exportação CSV exige Coordenação e revisão do papel antes de gerar arquivo');
assert(admin.includes(".update({ status: newStatus })"),'Update cliente restrito ao status, não à ficha inteira');
assert(admin.includes('gerarCsvExcel(headers, rows)')&&csvSeguro.includes('campos.map(csvCellSeguro)'),'Exportação CSV protegida contra fórmulas');
assert(admin.includes('areaAtiva === \'academico\'')&&admin.includes('<AdminRotinaAcademicaLab supabase={supabase}'),'Painel Administrativo acadêmico incluído');
assert(adminLayout.includes('{children}'),'Layout do painel real mantido');
assert(root.includes('<AccessibilityWidget />')&&root.includes('<WhatsAppFlutuante />'),'Preservação da acessibilidade e WhatsApp global');
assert(academic.includes('Somente Supabase DEV')&&academic.includes("supabase.from('turmas')")&&academic.includes('podeGerir={podeGerir}'),'Acadêmico consulta DEV e transmite autorização a módulos protegidos');

assert(webClient.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
assert(!webClient.includes('SERVICE_ROLE')&&!webClient.includes('service_role')&&!webClient.includes('sb_secret_'));

assert(sql.includes('NÃO EXECUTAR EM PRODUÇÃO'),'Proposta nunca aplicada implicitamente');
assert(sql.includes("status = 'pendente_confirmacao'"),'Cadastro público sempre inicia pendente');
assert(sql.includes("grant update(status)"),'Atualização de ficha limitada ao status na proposta');
assert(sql.includes("grant insert on table public.inscricoes_oficina to anon, authenticated"));
assert(sql.includes('portal_admins'), 'O texto deve explicar a política de membership preservada');
assert(!/\bdrop\s+policy\b[^;]*\beducart_admin_(read|update)_inscricoes\b/i.test(sql), 'Não substituir políticas administrativas já seguras');
assert(!/\balter\s+table\s+public\.portal_admins/i.test(sql), 'R03 isolado não altera tabela de admins');
assert(!/\bgrant\s+truncate\b/i.test(sql.replace(/--[^\n]*/g, '')), 'Nunca conceder TRUNCATE ao frontend (SQL executável, sem comentários)');
assert(/\brevoke\s+all\s+on\s+table\s+public\.inscricoes_oficina\s+from\s+anon,\s*authenticated/i.test(sql));
assert(!/with check\s*\(\s*true\s*\)/i.test(sql));
assert(!sql.includes("using (true)"));

console.log('R03 PASS: login e dashboard exigem membership; 6 cenários fail-closed; Acadêmico DEV com autorização; CSV condicionado ao papel; proposta RLS bloqueia status forjado. Sem deploy ou alteração de DB.');
