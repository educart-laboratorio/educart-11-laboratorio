// TC27 — contratos sinteticos; sem Cloudflare ou Supabase de verdade.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const source=readFileSync('scripts/publicar-standby-triple-core-autorizado.mjs','utf8');
for(const term of [
 "const TARGET='educart-11-prod-ready'",
 "const CANDIDATE='educart-11-candidate'",
 "const LEGACY='educart-production'",
 "const PROD='https://doygnsubiitencoyzjzk.supabase.co'",
 "GSI_TC27_APPROVAL",
 "if(existing.status!==404)",
 "if(bUrl?.type!=='plain_text' || bUrl.text!==PROD)",
 "if(!/^sb_publishable_",
 "NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'off'",
 "workers_dev:true",
 "for(const forbidden of ['routes','route','custom_domains','zone_id','triggers'])",
 "fs.rmSync(file,{force:true})",
 "['/inscricao','405','POST']",
 "command('npx',['--yes','wrangler@4.149.0','deploy','--config',file]",
 "EDUCART_GSI_HEAD",
]) assert(source.includes(term),'TC27: contrato ausente '+term);
assert(!source.includes('keep_vars:true'),'Nao herdar Worker existente');
assert(!source.includes("'--route'"),'Nao alterar Workers Routes');
assert(!source.includes('apply_migration'),'Nao escrever em DB');
const syntEnv={
 ...process.env,
 GITHUB_ACTIONS:'true',
 GITHUB_REPOSITORY:'educart-laboratorio/educart-11-laboratorio',
 GITHUB_REF_NAME:'gsi-integracao-triple-core-20261115',
 GITHUB_EVENT_NAME:'push',
 GITHUB_SHA:'0'.repeat(40),
 GSI_TC27_APPROVAL:'GSI_TRIPLE_CORE_EXPLICIT_AUTHORIZATION',
 CLOUDFLARE_API_TOKEN:'synthetic-test-value-not-real',
 NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'off'
};
function blocked(label,overrides,args=['--authorized-deploy']){
 const r=spawnSync(process.execPath,['scripts/publicar-standby-triple-core-autorizado.mjs',...args],
  {cwd:process.cwd(),env:{...syntEnv,...overrides},encoding:'utf8',timeout:10000});
 assert.notEqual(r.status,0,'TC27 bloqueio '+label);
 assert(!r.stdout.includes('synthetic-test-value-not-real'));
 assert(!r.stderr.includes('synthetic-test-value-not-real'));
 assert((r.stderr||'').includes('GSI TC27 FAIL-CLOSED:'),'TC27 falta gate '+label);
}
blocked('sem gatilho',{},[]);
blocked('sem runner',{GITHUB_ACTIONS:'false'});
blocked('repositorio incorreto',{GITHUB_REPOSITORY:'outra-conta/portal'});
blocked('branch incorreta',{GITHUB_REF_NAME:'main'});
blocked('evento incorreto',{GITHUB_EVENT_NAME:'pull_request'});
blocked('SHA incorreto',{GITHUB_SHA:'abc'});
blocked('sem aprovacao',{GSI_TC27_APPROVAL:''});
blocked('sem token',{CLOUDFLARE_API_TOKEN:''});
blocked('captacao ligada',{NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'approved'});
console.log('TC27 PASS: 9 negativas locais, Worker e ambiente exatos, sem rede/deploy.');
