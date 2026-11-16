// SUPER GSI TC20 — comparação de respostas anônimas, somente leitura.
// Não comprova a configuração Cloudflare Workers Routes; apenas sugere
// a origem HTTP pelas características e não acessa dados privados.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
const hosts=[
 ['oficial','https://educart.pro'],
 ['oficial-www','https://www.educart.pro'],
 ['worker-producao','https://educart-production.educartsuporte.workers.dev'],
 ['worker-candidato','https://educart-11-candidate.educartsuporte.workers.dev'],
];
const routes=['/','/admin/login','/admin','/formacao','/inscricao'];
const list=[];
for(const [label,host] of hosts){
 for(const route of routes){
  try{
   const r=await fetch(host+route,{method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
    headers:{Accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5','User-Agent':'EducART-TC20-read-only/1'},
    signal:AbortSignal.timeout(15000)});
   const bytes=Buffer.from(await r.arrayBuffer());
   // Nenhum corpo, cookie, token ou payload de inscrição é impresso/salvo.
   const loc=r.headers.get('location');
   const d={host:label,path:route,status:r.status,bodySize:bytes.length,
    bodySha256:createHash('sha256').update(bytes).digest('hex'),
    contentType:r.headers.get('content-type'),
    location:loc?new URL(loc,host).pathname:null,
    cacheControl:r.headers.get('cache-control'),
    robots:r.headers.get('x-robots-tag'),
    server:r.headers.get('server'),
    cfCacheStatus:r.headers.get('cf-cache-status'),
   };
   list.push(d);console.log('TC20 '+JSON.stringify(d));
  }catch(e){
   const d={host:label,path:route,errorType:String(e?.name||'Error')};
   list.push(d);console.log('TC20 ERRO '+JSON.stringify(d));
  }
 }
}
const by=(host,path)=>list.find(x=>x.host===host && x.path===path);
const observations=[];
for(const route of routes){
 const pub=by('oficial',route);
 const prod=by('worker-producao',route);
 const cand=by('worker-candidato',route);
 observations.push({path:route,oficialHttp:pub?.status??null,
  producaoHttp:prod?.status??null,candidatoHttp:cand?.status??null,
  oficialSameStatusAsProduction:pub?.status!=null&&pub.status===prod?.status,
  oficialSameStatusAsCandidate:pub?.status!=null&&pub.status===cand?.status,
  oficialSameBytesAsProduction:pub?.bodySha256!=null&&pub.bodySha256===prod?.bodySha256,
  oficialSameBytesAsCandidate:pub?.bodySha256!=null&&pub.bodySha256===cand?.bodySha256,
 });
}
mkdirSync('tc20-artifacts',{recursive:true});
writeFileSync('tc20-artifacts/fingerprints-publicos.json',
 JSON.stringify({observedAt:new Date().toISOString(),routeMappingConfirmed:false,
  caution:'Comparacao HTTP nao substitui consulta autenticada Workers Routes Read',
  writes:0,results:list,observations},null,2));
console.log('TC20 COMPARACOES '+JSON.stringify(observations));
console.log('TC20: '+list.length+' leituras HTTP e 0 escritas, sem acesso a dados administrativos.');
if(list.some(x=>x.errorType))process.exitCode=1;
