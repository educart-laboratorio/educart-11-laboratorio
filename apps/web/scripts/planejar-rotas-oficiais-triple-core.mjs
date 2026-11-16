// GSI TC25 — inventario e plano reversivel das Workers Routes, SEM PUT/POST.
// --fixture para prova sintetica, --live para leitura com token Workers Routes Read.
// Nunca modifica Cloudflare, DNS, segredos nem dados Supabase.
import fs from 'node:fs';
import path from 'node:path';
const ACCOUNT='8fe5407b4d31f20e19a1388527e365ad';
const ZONE='educart.pro';
const SOURCE='educart-11-candidate';
const TARGET='educart-11-prod-ready';
export const REQUIRED=['www.educart.pro','www.educart.pro/*','*.educart.pro/*','educart.pro/*'];
/** Confirma nome, conta e id da zona. Nunca aceitar homonima de outra conta. */
export function selecionarZonaOficial(zones){
 if(!Array.isArray(zones))return null;
 const matches=zones.filter(x=>x?.name===ZONE &&
   x?.account?.id===ACCOUNT &&
   typeof x?.id==='string' && /^[a-f0-9]{32}$/i.test(x.id));
 return matches.length===1?matches[0]:null;
}
export function gerarPlano(rotas,zoneId){
 if(!Array.isArray(rotas)||!zoneId)throw Error('TC25: inventario incompleto');
 const matches=rotas.filter(x=>typeof x.pattern==='string'&&x.pattern.includes('educart.pro'));
 const extra=matches.filter(x=>!REQUIRED.includes(x.pattern));
 if(extra.length)throw Error('TC25: outras rotas educart.pro detectadas; conferir precedencia');
 const seen=new Set(),before=[];
 for(const pattern of REQUIRED){
  const list=matches.filter(x=>x.pattern===pattern);
  if(list.length!==1)throw Error('TC25: rota ausente/duplicada '+pattern);
  const r=list[0];
  if(typeof r.id!=='string'||!r.id||r.script!==SOURCE)
   throw Error('TC25: identificador ou origem divergente '+pattern);
  if(seen.has(r.id))throw Error('TC25: ID duplicado');
  seen.add(r.id);
  before.push({routeId:r.id,pattern,worker:r.script});
 }
 return {zone:ZONE,zoneId,account:ACCOUNT,source:SOURCE,target:TARGET,
  routeCount:before.length,sourceSnapshot:before,
  cutoverPlan:before.map(x=>({routeId:x.routeId,pattern:x.pattern,from:x.worker,to:TARGET})),
  rollbackPlan:before.map(x=>({routeId:x.routeId,pattern:x.pattern,restore:x.worker})),
  writes:0,authorizedToPublish:false};
}
async function cloudflareGet(url,token){
 const response=await fetch(url,{method:'GET',
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw Error('TC25: leitura Cloudflare HTTP '+response.status+'; nenhum corte permitido');
 const result=await response.json();
 if(!result.success)throw Error('TC25: leitura Cloudflare negada');
 return result.result;
}
async function main(){
 const argv=process.argv.slice(2);
 if(argv.length!==2 || !['--fixture','--live'].includes(argv[0]))
  throw Error('TC25: somente --fixture <arquivo> ou --live <snapshot-destino>');
 let routeList,zoneId;
 if(argv[0]==='--fixture'){
  const file=JSON.parse(fs.readFileSync(argv[1],'utf8'));
  routeList=file.routes;zoneId=file.zone_id;
 }else{
  const token=process.env.CLOUDFLARE_API_TOKEN;
  if(!token)throw Error('TC25: token de somente leitura ausente');
  const zones=await cloudflareGet('https://api.cloudflare.com/client/v4/zones?name='+ZONE+'&account.id='+ACCOUNT,token);
  const zone=selecionarZonaOficial(zones);
  if(!zone)throw Error('TC25: zona ausente, duplicada ou conta divergente');
  zoneId=zone.id;
  routeList=await cloudflareGet('https://api.cloudflare.com/client/v4/zones/'+zoneId+'/workers/routes',token);
 }
 const plan=gerarPlano(routeList,zoneId);
 const file=path.resolve(argv[0]==='--live'?argv[1]:'tc25-artifacts/planejamento-sintetico.json');
 fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify({...plan,generatedAt:new Date().toISOString()},null,2),{mode:0o600});
 console.log('TC25 PASS: '+plan.routeCount+' rotas mapeadas sem escrita; origem '+SOURCE+'; destino '+TARGET+'; rollback em snapshot.');
}
if(process.argv[1]&&process.argv[1].endsWith('planejar-rotas-oficiais-triple-core.mjs')){
 main().catch(e=>{console.error(String(e?.message||e));process.exitCode=1;});
}
