/** R06: testes locais sem token, rede ou Worker. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_NAME,HOSTNAME,ACCOUNT_ID,ALLOWED_EMAILS,planoAccess,
  auditarAplicacao,auditarPolitica,gerenciarAccess} from './gerenciar-access-homologacao.mjs';

const appId='11111111-1111-4111-8111-111111111111';
const plan=planoAccess();
const app={id:appId,type:'self_hosted',name:APP_NAME,domain:HOSTNAME};
const policy=plan.policies[0];
assert.equal(plan.domain,HOSTNAME);
assert.equal(plan.type,'self_hosted');
assert.equal(plan.policies.length,1);
assert.deepEqual(plan.policies[0].include.map(r=>r.email.email),ALLOWED_EMAILS);
assert.equal(auditarAplicacao(app,[policy]),true);
for (const invalid of [
  {...policy,include:[{everyone:{}}]},
  {...policy,include:[{email_domain:{domain:'gmail.com'}}]},
  {...policy,include:[{email:{email:'desconhecido@gmail.com'}},...policy.include.slice(1)]},
  {...policy,decision:'bypass'},
  {...policy,decision:'deny'},
  {...policy,include:[...policy.include,policy.include[0]]},
  {...policy,exclude:[{everyone:{}}]},
  {...policy,mfa_config:{mfa_disabled:true}},
]) assert.throws(()=>auditarPolitica(invalid),/BLOQUEIO/);
for (const invalid of [
  {...app,domain:'www.educart.pro'},
  {...app,name:'educart-production'},
  {...app,destinations:[{type:'all_workers'}]},
  {...app,options_preflight_bypass:true},
  {...app,allow_authenticate_via_warp:true},
]) assert.throws(()=>auditarAplicacao(invalid,[policy]),/BLOQUEIO/);
assert.throws(()=>auditarAplicacao(app,[policy,policy]),/BLOQUEIO/);

const env={
  CLOUDFLARE_ACCOUNT_ID:ACCOUNT_ID,
  CLOUDFLARE_API_TOKEN_ACCESS_HOMOLOG:'TOKEN_DE_TESTE',
  GITHUB_ACTIONS:'true',
  GITHUB_REF_NAME:'autodev-laboratorio-editavel-2026-11-03',
  GITHUB_WORKFLOW_REF:'repo/.github/workflows/homologacao-educart-11-isolada.yml@refs/heads/autodev-laboratorio-editavel-2026-11-03',
  EDUCART_ACCESS_CONFIRMATION:'EDUCART_R06_ACCESS_SOMENTE',
};
const calls=[];
function mock(state) {
  return async (url,opts) => {
    calls.push(opts.method);
    if (url.endsWith('/user/tokens/verify')) {
      return new Response(JSON.stringify({success:true,result:{status:'active'}}),{status:200});
    }
    if (opts.method==='POST') {
      state.apps.push({...app});
      state.policies=[policy];
      return new Response(JSON.stringify({success:true,result:app}),{status:200});
    }
    const result=url.includes('/policies')?state.policies:state.apps;
    return new Response(JSON.stringify({
      success:true,result,result_info:{total_pages:1}
    }),{status:200});
  };
}
await assert.rejects(()=>gerenciarAccess({
  mode:'ensure',env:{...env,GITHUB_ACTIONS:'false'},fetcher:mock({apps:[]})
}),/BLOQUEIO/);
await assert.rejects(()=>gerenciarAccess({
  mode:'audit',env,fetcher:mock({apps:[],policies:[]})
}),/BLOQUEIO/);
const state={apps:[],policies:[]};
assert.equal((await gerenciarAccess({
  mode:'ensure',env,fetcher:mock(state)
})).status,'protected');
assert.equal(calls.filter(m=>m==='POST').length,1);
assert.equal((await gerenciarAccess({
  mode:'audit',env,fetcher:mock(state)
})).status,'protected');
const invalidState={apps:[app],policies:[{...policy,include:[{everyone:{}}]}]};
await assert.rejects(()=>gerenciarAccess({
  mode:'ensure',env,fetcher:mock(invalidState)
}),/BLOQUEIO/);
// Verificar distinção entre token ativo e acesso ao escopo negado, sem imprimir segredo.
await assert.rejects(() => gerenciarAccess({
  mode:'audit', env,
  fetcher:async (url) => {
    if (url.endsWith('/user/tokens/verify'))
      return new Response(JSON.stringify({success:true,result:{status:'active'}}),{status:200});
    return new Response(JSON.stringify({success:false,errors:[{code:9109,message:'do not leak'}]}),{status:403});
  }
}),/HTTP 403; codigos API: 9109/);
await assert.rejects(() => gerenciarAccess({
  mode:'audit', env,
  fetcher:async () => new Response(JSON.stringify({
    success:false,errors:[{code:10000,message:'secret do not print'}]
  }),{status:401})
}),/token Cloudflare nao validado; HTTP 401; codigos API: 10000/);
const noApi=()=>{throw Error('Nao deve acessar internet')};
assert.equal((await gerenciarAccess({mode:'plan',env:{},fetcher:noApi})).status,'plan');
const workflow=readFileSync('../../.github/workflows/homologacao-educart-11-isolada.yml','utf8');
const ci=readFileSync('../../.github/workflows/validar-inscricao-responsiva-lab.yml','utf8');
assert(workflow.includes('CLOUDFLARE_API_TOKEN_ACCESS_HOMOLOG'));
assert(workflow.includes('gerenciar-access-homologacao.mjs --audit'));
assert(workflow.includes('gerenciar-access-homologacao.mjs --ensure'));
assert(workflow.includes("inputs.etapa == 'deploy'"));
assert(ci.includes('testar-r06-access-api.mjs'));
assert(!workflow.includes('TinyFish'));
console.log('R06 OK: plano, criacao, auditoria e bloqueios sem Cloudflare real.');
