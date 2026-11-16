// SUPER GSI TC30 — somente GET Cloudflare, teste de credenciais JA EXISTENTES.
// Nao imprime tokens, nao escreve na zona e nao tenta corte de rotas.
import fs from 'node:fs';
import {gerarPlano} from './planejar-rotas-oficiais-triple-core.mjs';

const ACCOUNT='8fe5407b4d31f20e19a1388527e365ad';
const ZONE='educart.pro';
const ROOT='https://api.cloudflare.com/client/v4';
const TOKENS=[
 ['candidate',process.env.TC30_CANDIDATE_TOKEN||''],
 ['homolog',process.env.TC30_HOMOLOG_TOKEN||''],
 ['access',process.env.TC30_ACCESS_TOKEN||'']
];
if(process.env.GITHUB_REPOSITORY!=='educart-laboratorio/educart-11-laboratorio' ||
   process.env.GITHUB_REF_NAME!=='gsi-integracao-triple-core-20261115' ||
   process.env.GITHUB_ACTIONS!=='true')
 throw Error('TC30: somente GitHub Enterprise da branch aprovada');

async function get(path,token){
 const r=await fetch(ROOT+path,{
  method:'GET',
  headers:{Authorization:'Bearer '+token,Accept:'application/json'},
  signal:AbortSignal.timeout(16000),
 });
 let payload=null;
 if(r.ok){try{payload=await r.json()}catch{payload=null}}
 return {status:r.status,success:payload?.success===true,data:payload?.result};
}
const out={readOnly:true,writeCalls:0,zone:ZONE,checkedAt:new Date().toISOString(),
 status:'inconclusivo',checks:[],routeCount:null};
fs.mkdirSync('tc30-artifacts',{recursive:true});
try{
 const available=TOKENS.filter(x=>x[1]).map(x=>x[0]);
 if(!available.length)throw Error('TC30: nao ha tokens preexistentes nos Secrets consultados');
 let zoneId='';
 for(const [label,token] of TOKENS){
  if(!token)continue;
  let z;
  try{z=await get('/zones?name='+ZONE+'&account.id='+ACCOUNT,token)}
  catch(e){out.checks.push({tokenLabel:label,zoneStatus:'network_error'});continue}
  const zones=Array.isArray(z.data)?z.data:[];
  const zone=zones.find(x=>x?.name===ZONE && x?.account?.id===ACCOUNT)||
    zones.find(x=>x?.name===ZONE);
  out.checks.push({tokenLabel:label,zoneStatus:z.status,zoneFound:Boolean(zone)});
  if(zone?.id){zoneId=zone.id;break}
 }
 if(!zoneId)throw Error('TC30: nenhuma credencial conseguiu identificar a zona');
 const used=new Set();
 for(const [label,token] of TOKENS){
  if(!token||used.has(token))continue;
  used.add(token);
  let r;
  try{r=await get('/zones/'+encodeURIComponent(zoneId)+'/workers/routes',token)}
  catch(e){out.checks.push({tokenLabel:label,routeStatus:'network_error'});continue}
  out.checks.push({tokenLabel:label,routeStatus:r.status,routeAccessible:r.success});
  console.log('TC30 READ '+JSON.stringify({tokenLabel:label,http:r.status,routeAccessible:r.success}));
  if(!r.success || !Array.isArray(r.data))continue;
  const plan=gerarPlano(r.data,zoneId);
  fs.writeFileSync('tc30-artifacts/inventario-rotas-reais.json',
    JSON.stringify({...plan,readAt:new Date().toISOString(),from:label},null,2),{mode:0o600});
  out.status='rotas_validadas';out.routeCount=plan.routeCount;
  console.log('TC30 SUCCESS: '+plan.routeCount+' rotas exatas, IDs de inventario preservados no artefato; zero escrita.');
  break;
 }
 if(out.status!=='rotas_validadas')throw Error('TC30: falta Zone Workers Routes Read nas credenciais existentes');
}catch(e){
 console.log('TC30 NO-GO: '+String(e?.message||'falha de leitura'));
 process.exitCode=2;
}finally{
 fs.writeFileSync('tc30-artifacts/status-sanitizado.json',JSON.stringify(out,null,2),{mode:0o600});
}
