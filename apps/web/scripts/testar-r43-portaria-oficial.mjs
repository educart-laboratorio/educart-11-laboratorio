/**
 * R43 — verificação da FUTURA portaria oficial 1.1, sem alterar PROD.
 * Não simula sessão humana nem afirma homologação HTTP.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classificarRotaOficial11, configuracaoSupabaseOficial11Valida,
  classificarRequisicaoPrivada, URL_SUPABASE_DEV, URL_SUPABASE_PROD,
} from '../src/lib/security/preview-native-policy.ts';
import { obterPapeisGestao } from '../src/lib/admin/autorizar-gestao.ts';

const classificar=(host,rota,modo='required',metodo='GET',recebido=host)=>
  classificarRotaOficial11(host,rota,recebido,metodo,modo);
const hosts=['educart.pro','www.educart.pro',
  'educart-production.educartsuporte.workers.dev'];
for(const host of hosts) {
  for(const rota of ['/','/formacao','/formacao/','/inscricao','/cadastro',
                     '/criar','/images/oficina-atores-simbolo.svg']) {
    assert.equal(classificar(host,rota),'publico','Vitrine 1.1: '+host+rota);
  }
  for(const rota of ['/admin','/admin/','/admin/financeiro','/admin/qualquer',
                     '/admin/login/outra','/api/admin','/api/admin/exportar',
                     '/api/secretaria','/_next/data/build-id/admin.json']) {
    assert.equal(classificar(host,rota),'avaliar','Servidor deve autenticar: '+host+rota);
    assert.equal(classificarRotaOficial11(host,rota,host,'GET',undefined),'negado','Modo ausente deve falhar: '+rota);
    assert.equal(classificar(host,rota,'off'),'negado','Modo desligado deve falhar: '+rota);
    assert.equal(classificar(host,rota,'required','GET','host-invasor.example'),'negado');
  }
  for(const metodo of ['GET','HEAD']) {
    assert.equal(classificar(host,'/admin/login','required',metodo),'publico');
    assert.equal(classificar(host,'/admin/login/','required',metodo),'publico');
  }
  for(const metodo of ['POST','PUT','PATCH','DELETE']) {
    assert.equal(classificar(host,'/admin/login','required',metodo),'avaliar');
    assert.equal(classificar(host,'/admin','required',metodo),'avaliar');
  }
  assert.equal(classificarRotaOficial11(host,'/admin/login',host,'GET',undefined),'negado');
}
// Host não pertencente ao projeto não recebe a portaria oficial.
for(const host of ['attacker.example','educart.pro.evil.example',
                   'educart-11-candidate.educartsuporte.workers.dev']){
  assert.equal(classificarRotaOficial11(host,'/admin',host,'GET',undefined),null);
  assert.equal(classificar(host,'/admin'),'negado',
    'Modo oficial ativo não pode aceitar host estranho');
}
for(const host of ['localhost','127.0.0.1','0.0.0.0']) {
  assert.equal(classificarRotaOficial11(host,'/admin','educart.pro','GET','required'),'avaliar',
    'Hostname Next normalizado com Host oficial exige autenticação');
  assert.equal(classificarRotaOficial11(host,'/admin','atacante.example','GET','required'),'negado');
  assert.equal(classificarRotaOficial11(host,'/admin','educart.pro','GET',undefined),'negado');
}
const chaveFalsa='sb_publishable_'+'teste_nao_real';
assert(configuracaoSupabaseOficial11Valida(URL_SUPABASE_PROD,chaveFalsa));
assert(!configuracaoSupabaseOficial11Valida(URL_SUPABASE_DEV,chaveFalsa));
assert(!configuracaoSupabaseOficial11Valida(URL_SUPABASE_PROD,'sb_secret_invalida'));
assert(!configuracaoSupabaseOficial11Valida(URL_SUPABASE_PROD,undefined));
// Preservação explícita: a classificação R07 isolada não é alterada.
assert.equal(classificarRequisicaoPrivada('educart.pro','/admin','off'),'publico');
assert.equal(classificarRequisicaoPrivada(
  'educart-11-candidate.educartsuporte.workers.dev',
  '/admin','required','production',
  {hostRecebido:'educart-11-candidate.educartsuporte.workers.dev',metodoHttp:'GET'}),'avaliar');

// R03: teste do autorizador real com dados sintéticos e consultas de menor privilégio.
const id='00000000-0000-4000-8000-000000000001';
const stub=(membro,papeis)=>({
  from(tabela){
    assert(['portal_admins','equipe_papeis'].includes(tabela));
    return {select(){
      return {eq(coluna,valor){
        assert.equal(coluna,'user_id'); assert.equal(valor,id);
        if(tabela==='portal_admins')
          return {maybeSingle:async()=>({data:membro?{user_id:id}:null,error:null})};
        return Promise.resolve({data:papeis.map(papel=>({papel})),error:null});
      }};
    }};
  }
});
assert.deepEqual(await obterPapeisGestao(stub(false,['coordenacao']),id),[],
  'Usuário sem associação portal_admins não acessa');
assert.deepEqual(await obterPapeisGestao(stub(true,[]),id),[],
  'Associação sem papel não acessa');
assert.deepEqual(await obterPapeisGestao(stub(true,['visitante']),id),[],
  'Papel inválido não acessa');
assert.deepEqual(await obterPapeisGestao(stub(true,['secretaria']),id),['secretaria']);
assert.deepEqual(await obterPapeisGestao(stub(true,['coordenacao']),id),['coordenacao']);
assert.deepEqual(await obterPapeisGestao(stub(true,['secretaria','coordenacao']),id),
                 ['secretaria','coordenacao']);
const proxy=readFileSync('src/proxy.ts','utf8');
for(const trecho of [
  'classificarRotaOficial11(', 'const portalOficial = classificacaoOficial !== null',
  'configuracaoSupabaseOficial11Valida(', 'supabase.auth.getClaims()',
  'supabase.auth.getUser()', 'user.is_anonymous',
  'user.id !== claimsData.claims.sub', 'obterPapeisGestao(supabase, user.id)',
  'if (papeis.length === 0) return erro(403)',
  'if (!portalOficial && !identidadeHomologacaoPermitida(user.email)) return erro(403)',
  "response.headers.set('Vary', 'Cookie')",
]) assert(proxy.includes(trecho),'Portaria oficial ausente em proxy.ts: '+trecho);
assert(!proxy.includes('getSession()'),'Não confiar exclusivamente em sessão local');
console.log('R43 PASS: domínios oficiais, negativos, positivos RBAC, Auth e preview preservada.');
console.log('PENDENTE: login e acesso HTTP reais no destino oficial homologado.');
