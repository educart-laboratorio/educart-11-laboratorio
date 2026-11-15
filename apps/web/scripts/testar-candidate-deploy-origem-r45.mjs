/** R45: guarda de origem do publicador, somente negativas locais sem rede. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const publicador=resolve('scripts/deploy-11-candidate.mjs');
const branch='autodev-r07-estudantes-codespaces-private-20261106';
const sha='a'.repeat(40);
const raiz=mkdtempSync(join(tmpdir(),'educart-r45-origem-'));
const bundle=join(raiz,'.cloudflare/output/v0/workers/default/bundle');
const assets=join(raiz,'.cloudflare/output/v0/workers/default/assets');
mkdirSync(bundle,{recursive:true});
mkdirSync(assets,{recursive:true});
writeFileSync(join(bundle,'index.js'),'// artefato sintético, nunca publicado\n');
const base={
  PATH:process.env.PATH||'',HOME:raiz,
  EDUCART_DEPLOY_TARGET:'staging',
  CLOUDFLARE_ACCOUNT_ID:'8fe5407b4d31f20e19a1388527e365ad',
  NEXT_PUBLIC_SUPABASE_URL:'https://esjrjzyvyhtzwgihcbsc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_teste_sintetico',
  WORKERS_CI:'1',WORKERS_CI_BRANCH:branch,WORKERS_CI_COMMIT_SHA:sha,
  GITHUB_ACTIONS:'true',GITHUB_REF_NAME:branch,GITHUB_SHA:sha,
  GITHUB_EVENT_NAME:'workflow_dispatch',
};
let verificacoes=0;
function negar(nome,variaveis){
  const r=spawnSync(process.execPath,[publicador],{
    cwd:raiz,env:{...base,...variaveis},encoding:'utf8',timeout:8000,
  });
  assert.equal(r.error,undefined,nome+' não deve falhar ao iniciar');
  assert.notEqual(r.status,0,nome+' deve impedir publicação');
  assert.match((r.stderr||'')+(r.stdout||''),/Candidata: origem de publicacao nao autorizada/,nome);
  assert.equal(existsSync(join(raiz,'wrangler.autodev.generated.json')),false,nome+' alcançou a geração de configuração');
  verificacoes++;
}
try {
  negar('WORKERS_CI ausente',{WORKERS_CI:''});
  negar('branch de build diferente',{WORKERS_CI_BRANCH:'main'});
  negar('SHA inválido',{WORKERS_CI_COMMIT_SHA:'abc'});
  negar('SHA entre origens divergente',{WORKERS_CI_COMMIT_SHA:'b'.repeat(40)});
  negar('fora de GitHub Actions',{GITHUB_ACTIONS:'false'});
  negar('ref GitHub diferente',{GITHUB_REF_NAME:'main'});
  negar('SHA GitHub diferente',{GITHUB_SHA:'b'.repeat(40)});
  negar('evento inesperado',{GITHUB_EVENT_NAME:'schedule'});
} finally {
  rmSync(raiz,{recursive:true,force:true});
}
assert.equal(verificacoes,8);
console.log('R45 PASS: oito negativas de origem locais; sem Wrangler, rede ou deploy.');