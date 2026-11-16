// TC21: identidade de artefatos estáticos de páginas públicas.
// GET sem sessão e sem formulários. Não lê nenhum campo administrativo.
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hosts=[
 ['oficial','https://educart.pro'],
 ['oficial-www','https://www.educart.pro'],
 ['producao-direct','https://educart-production.educartsuporte.workers.dev'],
 ['candidato-direct','https://educart-11-candidate.educartsuporte.workers.dev'],
];
const routes=['/','/formacao','/inscricao'];
const data=[];
const hash=s=>createHash('sha256').update(s).digest('hex').slice(0,16);
for(const [name,base] of hosts)for(const route of routes){
 try{
  const result=await fetch(base+route,{
   method:'GET',redirect:'manual',cache:'no-store',credentials:'omit',
   headers:{accept:'text/html','User-Agent':'EducART-TC21-readonly/1.0'},
   signal:AbortSignal.timeout(15000)});
  const html=result.status===200?await result.text():'';
  const assets=[...html.matchAll(/(?:src|href|data-src)=["']([^"']+)["']/gi)]
   .map(x=>x[1])
   .filter(x=>/\/_next\/static\/|\/assets\/|\/chunks\/|(?:\.css|\.js)(?:\?|$)/i.test(x))
   .map(x=>{try{return new URL(x,base).pathname}catch{return x}})
   .filter(x=>!x.startsWith('data:'));
  const dedup=[...new Set(assets)].sort();
  const d={name,route,status:result.status,assetCount:dedup.length,
   assetSetHash:hash(dedup.join('\n')),assets:dedup};
  console.log('TC21 PAGE '+JSON.stringify({...d,assets:undefined}));
  data.push(d);
 }catch(error){
  const d={name,route,error:String(error?.name||'Error')};data.push(d);
  console.log('TC21 FETCH '+JSON.stringify(d));
 }
}
const summary=[];
for(const route of routes){
 const official=data.find(x=>x.name==='oficial'&&x.route===route);
 for(const name of ['oficial-www','producao-direct','candidato-direct']){
  const other=data.find(x=>x.name===name&&x.route===route);
  const a=new Set(official?.assets??[]),b=new Set(other?.assets??[]);
  const common=[...a].filter(x=>b.has(x)).length;
  const comparable=a.size>0&&b.size>0;
  summary.push({route,comparedWith:name,officialAssetCount:a.size,otherAssetCount:b.size,
   common,union:new Set([...a,...b]).size,
   jaccard:comparable?Number((common/new Set([...a,...b]).size).toFixed(3)):null,
   identical:comparable&&common===a.size&&common===b.size});
 }
}
mkdirSync('tc21-artifacts',{recursive:true});
writeFileSync('tc21-artifacts/public-builds.json',JSON.stringify({
 observedAt:new Date().toISOString(),reads:data.length,writes:0,
 routeMappingConfirmed:false,
 interpretation:'Similaridade de artefatos sugere mesma compilação; não prova associação de Route',
 pages:data.map(x=>({name:x.name,route:x.route,status:x.status,assetCount:x.assetCount,
 assetSetHash:x.assetSetHash,error:x.error})),summary},null,2));
console.log('TC21 SUMMARY '+JSON.stringify(summary));
if(data.some(x=>x.error))process.exitCode=1;
