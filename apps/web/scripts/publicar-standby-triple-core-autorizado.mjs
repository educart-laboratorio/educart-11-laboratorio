// SUPER GSI TC27 — publicar SOMENTE o novo Worker independente sob ordem expressa.
// Fluxo executavel apenas pelo GitHub Enterprise, em branch/commit autorizado.
// Nao escreve DB, nao altera DNS/Workers Routes, nao toca nos Workers existentes.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const ACCOUNT='8fe5407b4d31f20e19a1388527e365ad';
const PROD='https://doygnsubiitencoyzjzk.supabase.co';
const TARGET='educart-11-prod-ready';
const CANDIDATE='educart-11-candidate';
const LEGACY='educart-production';
const BRANCH='gsi-integracao-triple-core-20261115';
const REPO='educart-laboratorio/educart-11-laboratorio';
const HOST='https://educart-11-prod-ready.educartsuporte.workers.dev';
const token=process.env.CLOUDFLARE_API_TOKEN || '';

function reject(reason){throw new Error('GSI TC27 FAIL-CLOSED: '+reason)}
function authorized(){
 if(process.argv.length!==3 || process.argv[2]!=='--authorized-deploy')
  reject('comando exclusivo de publicacao controlada');
 if(process.env.GITHUB_ACTIONS!=='true' ||
    process.env.GITHUB_REPOSITORY!==REPO ||
    process.env.GITHUB_REF_NAME!==BRANCH ||
    process.env.GITHUB_EVENT_NAME!=='push' ||
    !/^[a-f0-9]{40}$/.test(process.env.GITHUB_SHA||'') ||
    process.env.GSI_TC27_APPROVAL!=='GSI_TRIPLE_CORE_EXPLICIT_AUTHORIZATION')
  reject('origem do runner ou aprovacao nao corresponde a ordem');
 if(!token)reject('credencial Cloudflare indisponivel no GitHub Secret');
 if(process.env.NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS==='approved')
  reject('proibido ativar inscricoes durante standby');
}
async function settings(name){
 const response=await fetch(
  'https://api.cloudflare.com/client/v4/accounts/'+ACCOUNT+'/workers/scripts/'+encodeURIComponent(name)+'/settings',
  {method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(20000)}
 );
 return {status:response.status,json:response.ok?await response.json():null};
}
function binding(res,name){
 return res?.json?.result?.bindings?.find(x=>x?.name===name);
}
function sanitized(s,key){
 return String(s||'')
   .replaceAll(key,'[REDACTED_PUBLISHABLE_KEY]')
   .replaceAll(token,'[REDACTED_TOKEN]')
   .replace(/sb_publishable_[A-Za-z0-9_-]+/g,'[REDACTED_PUBLISHABLE_KEY]')
   .slice(-6000);
}
function command(exe,args,env,key,maxMs){
 const r=spawnSync(exe,args,{cwd:process.cwd(),env,encoding:'utf8',timeout:maxMs,
  maxBuffer:64*1024*1024,stdio:['ignore','pipe','pipe']});
 if(r.error || r.status!==0)
  reject(exe+' falhou ('+(r.status??'signal')+'): '+sanitized((r.stderr||'')+'\n'+(r.stdout||'')+'\n'+String(r.error||''),key));
}
async function probe(endpoint,expected,method='GET'){
 const response=await fetch(HOST+endpoint,{method,redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(response.status!==expected)reject('HTTP '+endpoint+' esperava '+expected+' e recebeu '+response.status);
 if(method==='GET' && ['/inscricao','/cadastro','/criar'].includes(endpoint)){
  const html=await response.text();
  if(!/indispon[ií]ve|temporariament/i.test(html))
   reject('rota '+endpoint+' nao confirmou aviso sem coleta');
  if(/<form[^>]*>/i.test(html))
   reject('rota '+endpoint+' possui formulario no standby');
 }
 return response.status;
}
authorized();
const existing=await settings(TARGET);
if(existing.status!==404)reject('Worker standby ja existe ou leitura indisponivel (HTTP '+existing.status+'); nao sobrescrever');
const [source,candidate]=await Promise.all([settings(LEGACY),settings(CANDIDATE)]);
if(source.status!==200 || candidate.status!==200 ||
   source.json?.success!==true || candidate.json?.success!==true)
 reject('origem ou candidato nao puderam ser conferidos com leitura Cloudflare');
const bUrl=binding(source,'NEXT_PUBLIC_SUPABASE_URL');
const bKey=binding(source,'NEXT_PUBLIC_SUPABASE_ANON_KEY');
if(bUrl?.type!=='plain_text' || bUrl.text!==PROD)
 reject('Worker legado nao tem endereco Supabase PROD estrito');
const key=bKey?.type==='plain_text' ? bKey.text : '';
if(!/^sb_publishable_[A-Za-z0-9_-]{15,180}$/.test(key))
 reject('chave publishable PROD indisponivel na configuracao autorizada');

const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:PROD,
 NEXT_PUBLIC_SUPABASE_ANON_KEY:key,
 NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'off',
 EDUCART_OFFICIAL_11_MODE:'required',
 EDUCART_PRIVATE_PREVIEW_MODE:'off',
 NEXT_TELEMETRY_DISABLED:'1',
 WRANGLER_SEND_METRICS:'false'};
if(env.NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS!=='off')reject('captação precisa ficar desligada');

const root=path.resolve('.cloudflare/output/v0/workers/default');
const file=path.resolve('.gsi-tc27-standby.generated.json');
let deployed=false;
try{
 console.log('TC27: Cloudflare validou que novo Worker nao existe; origem PROD e candidato conferidos.');
 command('npm',['run','build:vinext'],env,key,10*60*1000);
 if(!fs.existsSync(path.join(root,'bundle/index.js'))||
    !fs.existsSync(path.join(root,'assets')))reject('build sem artefatos Vinext');
 const config={
  name:TARGET,account_id:ACCOUNT,
  main:'./.cloudflare/output/v0/workers/default/bundle/index.js',
  compatibility_date:'2026-10-31',compatibility_flags:['nodejs_compat'],
  no_bundle:true,find_additional_modules:true,
  base_dir:'./.cloudflare/output/v0/workers/default/bundle',
  rules:[{type:'ESModule',globs:['**/*.js'],fallthrough:true},
         {type:'Data',globs:['**/*.json'],fallthrough:true}],
  assets:{directory:'./.cloudflare/output/v0/workers/default/assets',binding:'ASSETS',
    html_handling:'none',not_found_handling:'none',
    run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*']},
  images:{binding:'IMAGES'},workers_dev:true,
  vars:{
   EDUCART_OFFICIAL_11_MODE:'required',
   NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'off',
   NEXT_PUBLIC_SUPABASE_URL:PROD,
   NEXT_PUBLIC_SUPABASE_ANON_KEY:key,
   EDUCART_GSI_HEAD:process.env.GITHUB_SHA,
  }
 };
 for(const forbidden of ['routes','route','custom_domains','zone_id','triggers'])
  if(Object.hasOwn(config,forbidden))reject('binding de dominio nao autorizado: '+forbidden);
 fs.writeFileSync(file,JSON.stringify(config,null,2),{mode:0o600});
 // UNICA operacao Cloudflare com escrita: criacao de Worker NOVO sem rotas.
 command('npx',['--yes','wrangler@4.149.0','deploy','--config',file],env,key,7*60*1000);
 deployed=true;
}finally{
 fs.rmSync(file,{force:true});
 // A chave publica foi usada somente dentro deste processo e do bundle oficial.
}
if(!deployed)reject('publicacao nao concluida');
const published=await settings(TARGET);
if(published.status!==200 || published.json?.success!==true)
 reject('Worker criado mas GET settings pos-publicacao falhou');
const b=(name)=>binding(published,name);
if(b('NEXT_PUBLIC_SUPABASE_URL')?.text!==PROD ||
   b('EDUCART_OFFICIAL_11_MODE')?.text!=='required' ||
   b('NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS')?.text!=='off' ||
   b('EDUCART_GSI_HEAD')?.text!==process.env.GITHUB_SHA)
 reject('configuracao do Worker novo nao corresponde ao pacote aprovado');

const checks=[];
for(const [endpoint,status,method] of [
 ['/','200','GET'],['/formacao','200','GET'],
 ['/admin/login','200','GET'],['/admin','303','GET'],
 ['/inscricao','200','GET'],['/cadastro','200','GET'],
 ['/criar','200','GET'],['/inscricao','405','POST']
]){
 const expected=Number(status);
 await probe(endpoint,expected,method);
 checks.push(endpoint+' '+method+' '+status);
}
console.log('TC27 SUCCESS: '+TARGET+' criado sem routes; URL PROD; inscricoes desativadas; SHA conferido.');
console.log('TC27 HTTP CHECKS: '+checks.join('; '));
console.log('TC27: zero alteracoes em Worker candidato/legado, DNS, Workers Routes ou banco.');
