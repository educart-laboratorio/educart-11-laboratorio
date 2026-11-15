#!/usr/bin/env node
/* AutoDEV/RG-04: somente GETs de metadados Cloudflare para preflight de prévia privada.
 * Nunca mostra token, valores de vars do Worker, políticas com e-mails ou metadados de contas.
 * Este script NÃO publica, NÃO altera policies, NÃO lê dados do Supabase.
 */
const account='8fe5407b4d31f20e19a1388527e365ad';
const candidate='educart-11-candidate';
const hostname='educart-11-candidate.educartsuporte.workers.dev';
const base='https://api.cloudflare.com/client/v4/accounts/'+account;
const tokens=[
  ['CANDIDATE',process.env.CF_CANDIDATE_TOKEN||''],
  ['ACCESS',process.env.CF_ACCESS_TOKEN||''],
];
async function get(label,token,path){
  if(!token){console.log(label+': CREDENCIAL AUSENTE');return null;}
  try{
    const res=await fetch(base+path,{method:'GET',
      headers:{Authorization:'Bearer '+token,Accept:'application/json'},
      signal:AbortSignal.timeout(12000)});
    console.log(label+': HTTP '+res.status);
    return res.ok?await res.json():null;
  }catch(e){console.log(label+': REDE INDISPONÍVEL ('+(e?.name||'erro')+')');return null;}
}
let deploymentRead=false,accessInspect=false,accessMatch=false,accessPolicy=false;
for(const [nome,token] of tokens){
  const d=await get(nome+' / WORKER DEPLOYMENTS',token,
    '/workers/scripts/'+candidate+'/deployments?per_page=2');
  if(d?.success&&Array.isArray(d.result?.deployments)){
    deploymentRead=true;
    const top=d.result.deployments[0];
    if(top?.created_on)console.log(nome+' / WORKER: último registro na plataforma '+top.created_on);
    console.log(nome+' / WORKER: '+d.result.deployments.length+' registro(s) lido(s), sem conteúdo do código');
  }
  const apps=await get(nome+' / ACCESS APPS',token,
    '/access/apps?per_page=200');
  if(!apps?.success||!Array.isArray(apps.result))continue;
  accessInspect=true;
  const matches=apps.result.filter(a=>{
    const domain=String(a.domain||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'');
    const ds=Array.isArray(a.destinations)?a.destinations:[];
    // Uma regra no próprio Worker também pode proteger workers.dev; nesse caso
    // a correspondência de worker_id precisa de comprovação independente.
    return domain===hostname||ds.some(x=>String(x.hostname||'')===hostname);
  });
  const generic=apps.result.filter(a=>(a.destinations||[]).some(
    x=>['worker','all_workers'].includes(x.type))).length;
  console.log(nome+' / ACCESS: '+matches.length+' aplicação(ões) de hostname exato; '+generic+
    ' regra(s) amplas por Worker (correspondência ainda não confirmada)');
  if(matches.length===0)continue;
  accessMatch=true;
  for(const app of matches){
    if(!app.id)continue;
    const ps=await get(nome+' / ACCESS POLICY',token,
      '/access/apps/'+encodeURIComponent(app.id)+'/policies');
    const rows=Array.isArray(ps?.result)?ps.result:[];
    const allow=rows.filter(x=>x.decision==='allow'&&Array.isArray(x.include)&&x.include.length>0);
    const bypass=rows.filter(x=>x.decision==='bypass');
    if(allow.length>0&&!bypass.length)accessPolicy=true;
    console.log(nome+' / ACCESS: allow_restritivo='+allow.length+' bypass='+bypass.length);
  }
}
const status=deploymentRead&&accessInspect&&accessMatch&&accessPolicy?'INDÍCIO_POSITIVO':'NÃO_COMPROVADO';
console.log('PORTARIA_CLOUDFLARE_ACCESS: '+status);
if(status!=='INDÍCIO_POSITIVO')console.log('::warning::Bloqueio da publicação V4: política Access e permissões da candidata não comprovadas');
if(process.argv.includes('--require-access')&&status!=='INDÍCIO_POSITIVO'){
  console.error('::error::Deploy recusado: acesso Cloudflare Access não verificado; nenhuma publicação permitida.');
  process.exitCode=1;
}
console.log('::notice::Consulta apenas leitura: não houve deploy, alteração de DNS ou escrita em dados oficiais');
