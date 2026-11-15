/**
 * R08/R09 — uma conta institucional, agora com operador único; estudantes individuais.
 * Testes sintéticos de autorização; não substituem E2E no Codespaces privado.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { obterPapeisGestao } from '../src/lib/admin/autorizar-gestao.ts';

const uid='01234567-89ab-4cde-8f01-234567890abc';
const mock=(admin,roles)=>({
  from(table){
    assert(['portal_admins','equipe_papeis'].includes(table));
    return { select(){
      return { eq(field,id){
        assert.equal(field,'user_id');
        assert.equal(id,uid);
        if(table==='portal_admins')
          return {maybeSingle:async()=>({data:admin?{user_id:uid}:null,error:null})};
        return Promise.resolve({data:roles.map(papel=>({papel})),error:null});
      }};
    }};
  }
});
assert.deepEqual(await obterPapeisGestao(mock(true,['coordenacao','secretaria']),uid),
  ['coordenacao','secretaria'],'Conta institucional pode operar ambas as áreas');
assert.deepEqual(await obterPapeisGestao(mock(false,['coordenacao','secretaria']),uid),
  [],'Sem portal_admins, dupla função não dá acesso');
assert.deepEqual(await obterPapeisGestao(mock(true,['estudante']),uid),
  [],'Papel de estudante não concede gestão');
const read=p=>readFileSync(p,'utf8');
const admin=read('src/app/admin/page.tsx');
const login=read('src/app/admin/login/page.tsx');
const roles=read('src/lib/admin/autorizar-gestao.ts');
const proxy=read('src/proxy.ts');
const policy=read('src/lib/security/preview-native-policy.ts');
const portal=read('src/app/minha-educart/page.tsx');
const css=read('src/app/admin/admin.css');
assert(admin.includes('Gestão unificada'));
assert(admin.includes('admin-single-operator-note'));
// R08: identidade, login e os dez destinos preservados na navegação contextual.
assert(admin.includes("useState<'academico' | 'ingressos' | 'inscricoes' | 'secretaria' | 'financeiro' | 'clientes'>('academico')"),
 'Os destinos antigos e a seção Clientes DEV devem permanecer na navegação.');
for(const nome of ['Visão geral','Pessoas e matrículas','Formações e aulas','Financeiro',
 'Gestão de inscrições','Secretaria / Coordenação','Estudantes e vínculos','Clientes históricos'])
 assert(admin.includes(nome),'Destino ausente: '+nome);
assert(admin.includes('solicitarDestino(item.id)')&&admin.includes('rascunhoMatriculaPendente')&&
 admin.includes('Descartar alterações e sair'),'Rascunhos protegidos entre grupos');
assert(login.includes("router.replace('/admin')"),
 'O login deve continuar navegando para o painel autorizado.');

assert(admin.includes('único operador administrativo autorizado'));
assert(admin.includes("papeisGestao.includes('coordenacao') && papeisGestao.includes('secretaria')"));
assert(admin.includes("const podeAlterarStatus = papeisGestao.includes('coordenacao')"));
assert(admin.includes("const podeMatricular = papeisGestao.some"));
assert(login.includes('obterPapeisGestao(supabase, data.user.id)'));
assert(roles.includes(".from('portal_admins')")&&roles.includes(".from('equipe_papeis')"));
assert(proxy.includes('identidadeHomologacaoPermitida'));
assert(policy.includes('contasInstitucionais'));
assert(portal.includes('educart_fotos_consentimento_dev'),'Portal individual do aluno preservado');
assert(css.includes('.admin-layout-root .admin-single-operator-note'));
assert(!admin.includes('senhaCompartilhada')&&!admin.includes('service_role'));
console.log('R08/R09 PASS: operador único, dupla função autorizada, fail-closed e separação do aluno; sem deploy.');
