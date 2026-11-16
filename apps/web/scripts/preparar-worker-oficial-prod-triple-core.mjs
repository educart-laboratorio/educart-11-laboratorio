// GSI Triple Core / TC24 — SOMENTE --dry-run. Nao possui modo deploy.
// Novo Worker isolado, sem routes/custom_domains; o candidato nao e tocado.
// O bundle deve ser compilado no MESMO job com URL PROD + chave publishable.
// Uma futura publicacao requer novo fluxo e autorizacao expressa.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const args=process.argv.slice(2);
if(args.length!==1||args[0]!=='--dry-run')throw Error('TC24: somente --dry-run; deploy remoto inexistente neste script');
const account='8fe5407b4d31f20e19a1388527e365ad';
const target='educart-11-prod-ready';
const prod='https://doygnsubiitencoyzjzk.supabase.co';
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==prod)throw Error('TC24: abortar, URL Supabase nao PROD');
const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY??'';
if(!key.startsWith('sb_publishable_')||key.length<27||key.startsWith('sb_secret_'))
 throw Error('TC24: chave publishable ausente/invalida; nunca usar service_role');
if(process.env.EDUCART_OFFICIAL_11_MODE!=='required')
 throw Error('TC24: portaria oficial deve ser obrigatoria');
if(process.env.EDUCART_PRIVATE_PREVIEW_MODE==='required')
 throw Error('TC24: nao herdar portaria DEV da candidata');
if(process.env.GITHUB_ACTIONS==='true' &&
  (process.env.GITHUB_REPOSITORY!=='educart-laboratorio/educart-11-laboratorio'||
   process.env.GITHUB_REF_NAME!=='gsi-integracao-triple-core-20261115'))
 throw Error('TC24: runner/repositorio/branch nao autorizados para ensaio');
const root=path.resolve('.cloudflare/output/v0/workers/default');
if(!fs.existsSync(path.join(root,'bundle/index.js'))||
   !fs.existsSync(path.join(root,'assets')))
 throw Error('TC24: executar build:vinext neste job antes de empacotar');
const config={
 name:target,account_id:account,
 main:'./.cloudflare/output/v0/workers/default/bundle/index.js',
 compatibility_date:'2026-10-31',
 compatibility_flags:['nodejs_compat'],
 no_bundle:true,find_additional_modules:true,
 base_dir:'./.cloudflare/output/v0/workers/default/bundle',
 rules:[
  {type:'ESModule',globs:['**/*.js'],fallthrough:true},
  {type:'Data',globs:['**/*.json'],fallthrough:true},
 ],
 assets:{
  directory:'./.cloudflare/output/v0/workers/default/assets',
  binding:'ASSETS',html_handling:'none',not_found_handling:'none',
  run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*']
 },
 images:{binding:'IMAGES'},
 workers_dev:true,
 vars:{
  EDUCART_OFFICIAL_11_MODE:'required',
  // Jamais configurar a portaria DEV no Worker oficial independente.
  NEXT_PUBLIC_SUPABASE_URL:prod,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:key,
 },
};
// Contractual guard: nenhum alias/route sera configurado por este preparo.
for(const forbidden of ['routes','route','custom_domains','zone_id','triggers']){
 if(Object.hasOwn(config,forbidden))throw Error('TC24: encontrou vinculacao indevida '+forbidden);
}
const file=path.resolve('.gsi-tc24-standby.generated.json');
const out=path.resolve('tc24-artifacts');
let success=false;
try{
 fs.writeFileSync(file,JSON.stringify(config,null,2),{mode:0o600});
 const child=spawnSync('npx',['--yes','wrangler@4.149.0','deploy','--config',file,'--dry-run'],
  {cwd:process.cwd(),encoding:'utf8',timeout:180000,
   env:{...process.env,CLOUDFLARE_API_TOKEN:'',CLOUDFLARE_ACCOUNT_TOKEN:'',WRANGLER_SEND_METRICS:'false'}});
 if(child.error)throw child.error;
 // Wrangler pode exibir bindings publicos; este runner so utiliza chave FICTICIA.
 if(child.status!==0)throw Error('TC24: Wrangler dry-run falhou (codigo '+child.status+')');
 success=true;
} finally {
 fs.rmSync(file,{force:true});
 fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(path.join(out,'resumo.json'),JSON.stringify({
  preparedAt:new Date().toISOString(),sourceCommit:process.env.GITHUB_SHA||null,
  worker:target,cloudflareAccount:account,database:'PROD',
  mode:'required',routes:[],workersDev:true,realKeyPresent:false,
  packagingDryRunSuccess:success,writeActions:0,
  note:'Build/empacotamento sintetico com chave publica ficticia. Nao publicado nem conectado ao banco real.'
 },null,2));
}
console.log('TC24 DRY-RUN PASS: '+target+' sem routes; PROD URL no pacote, chave ficticia, zero publicacao.');
