// TC22: proveniência das URLs Supabase embutidas na vitrine pública.
// SOMENTE GET de HTML e JS públicos; nunca imprime chave, URL completa,
// conteúdo de chunk, PII, cookies, token, nem executa envio de formulário.
import {mkdirSync,writeFileSync} from 'node:fs';
const envs={
 prodRef:'doygnsubiitencoyzjzk',
 devRef:'esjrjzyvyhtzwgihcbsc',
};
const bases=[
 ['oficial','https://educart.pro'],
 ['www','https://www.educart.pro'],
 ['candidato','https://educart-11-candidate.educartsuporte.workers.dev'],
 ['productionDirect','https://educart-production.educartsuporte.workers.dev'],
];
const details=[];
for(const [label,origin] of bases){
 const report={label,readOnly:true,writes:0,pagesChecked:0,jsCount:0,
  html:{dev:false,prod:false},js:{dev:false,prod:false},
  chunksWithDev:0,chunksWithProd:0,errorTypes:[]};
 const paths=new Set();
 try{
  for(const path of ['/inscricao','/']){
   const response=await fetch(origin+path,{method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',
    headers:{Accept:'text/html','User-Agent':'EducART-TC22-readonly/1'},
    signal:AbortSignal.timeout(15000)});
   if(response.status!==200) {report.errorTypes.push(path+' HTTP '+response.status);continue;}
   report.pagesChecked++;
   const html=await response.text();
   report.html.dev ||=html.includes(envs.devRef);
   report.html.prod ||=html.includes(envs.prodRef);
   for(const m of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)){
    const s=m[1];if(!/\/_next\/static\/.+(?:\.js|\.(?:mjs|cjs))([?#].*)?$/i.test(s))continue;
    try{
     const url=new URL(s,origin);
     if(url.origin===origin)paths.add(url.pathname);
    }catch{}
   }
  }
  const listed=[...paths].slice(0,70);
  for(const path of listed){
   const res=await fetch(origin+path,{method:'GET',redirect:'manual',credentials:'omit',cache:'no-store',
    headers:{Accept:'application/javascript,*/*;q=0.5','User-Agent':'EducART-TC22-readonly/1'},
    signal:AbortSignal.timeout(14000)});
   if(res.status!==200){report.errorTypes.push('asset HTTP '+res.status);continue;}
   // Public JS is examined only in the runner memory. Never save source.
   const js=await res.text(); report.jsCount++;
   if(js.includes(envs.devRef)) {report.js.dev=true;report.chunksWithDev++;}
   if(js.includes(envs.prodRef)) {report.js.prod=true;report.chunksWithProd++;}
  }
  report.discoveredScripts=paths.size;
 }catch(e){report.errorTypes.push(String(e?.name||'Error'));}
 details.push(report);
 console.log('TC22 SANITIZED '+JSON.stringify(report));
}
mkdirSync('tc22-artifacts',{recursive:true});
writeFileSync('tc22-artifacts/proveniencia-supabase.json',JSON.stringify({
 observedAt:new Date().toISOString(),writes:0,
 caution:'Scan de recursos publicos apenas; sem confirmacao de escritas HTTP ou rota Cloudflare',
 summaries:details,
},null,2));
const official=details.find(x=>x.label==='oficial');
if(official?.js.dev||official?.html.dev)console.log('TC22 ALERTA: referencia DEV detectada na interface publicada, verificar antes de captar dados.');
else if(official?.js.prod||official?.html.prod)console.log('TC22: referencia PROD detectada na interface publicada.');
else console.log('TC22 INCONCLUSIVO: URLs nao localizadas nos recursos acessiveis; verificar configuracao de Worker.');
if(details.some(x=>x.pagesChecked===0))process.exitCode=1;
