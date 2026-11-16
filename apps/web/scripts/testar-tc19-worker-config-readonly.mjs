// TC19 | Diagnostico somente leitura da configuracao do Worker.
// NUNCA exibir valores de secrets, JSON integral, headers Authorization ou tokens.
// Essa rotina consulta somente Cloudflare GET; nao publica nem altera scripts.
import fs from 'node:fs';
const token=process.env.CLOUDFLARE_API_TOKEN;
const account='8fe5407b4d31f20e19a1388527e365ad';
const scripts=['educart-11-candidate','educart-production','educart-11-prod-ready'];
const wanted=['EDUCART_OFFICIAL_11_MODE','EDUCART_PRIVATE_PREVIEW_MODE',
 'NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const report={readOnly:true,writes:0,accountVerified:false,workers:[],checkedAt:new Date().toISOString()};
if(!token || process.env.GITHUB_REPOSITORY!=='educart-laboratorio/educart-11-laboratorio'){
 console.log('TC19: credencial de leitura indisponivel neste executor');
 process.exitCode=2;
}else{
 for(const name of scripts){
  const target='https://api.cloudflare.com/client/v4/accounts/'+account+
   '/workers/scripts/'+encodeURIComponent(name)+'/settings';
  try{
   const response=await fetch(target,{
    method:'GET',headers:{Authorization:'Bearer '+token,'accept':'application/json'},
    signal:AbortSignal.timeout(20000)
   });
   const item={worker:name,http:response.status,settingsAccessible:false,vars:[]};
   if(response.ok){
    const data=await response.json();
    if(data?.success===true && Array.isArray(data.result?.bindings)){
     report.accountVerified=true;
     item.settingsAccessible=true;
     for(const n of wanted){
      const b=data.result.bindings.find(v=>v?.name===n);
      const known=b&&b.type==='plain_text'&&typeof b.text==='string';
      const state=!b?'missing':!known?'present_unreadable':
       n==='EDUCART_OFFICIAL_11_MODE' ? b.text==='required'?'required':'not_required':
       n==='EDUCART_PRIVATE_PREVIEW_MODE' ? b.text==='required'?'required':'not_required':
       n==='NEXT_PUBLIC_SUPABASE_URL' ? b.text==='https://doygnsubiitencoyzjzk.supabase.co'?'prod':'not_prod':
       b.text.startsWith('sb_publishable_')?'publishable':'not_publishable';
      item.vars.push({name:n,state});
     }
    }
   }
   report.workers.push(item);
   console.log('TC19 SETTINGS '+JSON.stringify(item));
  }catch(e){
   const d={worker:name,errorType:String(e?.name||'Error'),settingsAccessible:false};
   report.workers.push(d);console.log('TC19 REQUEST '+JSON.stringify(d));
  }
 }
 // Custom Domains usam esta API: a leitura nao exige permissao DNS.
 try{
  const url='https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/domains';
  const res=await fetch(url,{method:'GET',headers:{Authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const json=res.ok?await res.json():null;
  const list=Array.isArray(json?.result)?json.result:[];
  const filtered=list.filter(x=>x?.hostname==='educart.pro'||x?.hostname==='www.educart.pro')
    .map(x=>({hostname:x.hostname,worker:x.service??x.script??x.worker??'(not-provided)',enabled:x.enabled??null}));
  report.domains={http:res.status,matching:filtered};
  console.log('TC19 DOMAINS '+JSON.stringify(report.domains));
 }catch(e){
  report.domains={errorType:String(e?.name||'Error')};
  console.log('TC19 DOMAINS '+JSON.stringify(report.domains));
 }
 // Zone Routes sao distintas de Custom Domains. Sem permissao zone read,
 // registrar apenas status, nao inferir ausencia de rota.
 try{
  const qs='?name=educart.pro&account.id='+account;
  const zr=await fetch('https://api.cloudflare.com/client/v4/zones'+qs,
   {method:'GET',headers:{Authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const zones=zr.ok?await zr.json():null;
  const zone=Array.isArray(zones?.result)?zones.result.find(x=>x?.name==='educart.pro'):null;
  report.zoneRead={http:zr.status,found:Boolean(zone)};
  if(zone?.id){
   const rr=await fetch('https://api.cloudflare.com/client/v4/zones/'+encodeURIComponent(zone.id)+'/workers/routes',
    {method:'GET',headers:{Authorization:'Bearer '+token,accept:'application/json'},signal:AbortSignal.timeout(15000)});
   const rt=rr.ok?await rr.json():null;
   report.routes={http:rr.status,
    matching:(Array.isArray(rt?.result)?rt.result:[]).filter(x=>/^(www\.)?educart\.pro\/\*/.test(x?.pattern??''))
     .map(x=>({pattern:x.pattern,worker:x.script??null}))};
   console.log('TC19 ROUTES '+JSON.stringify(report.routes));
  }else console.log('TC19 ZONE '+JSON.stringify(report.zoneRead));
 }catch(e){report.routes={errorType:String(e?.name||'Error')};
  console.log('TC19 ROUTES '+JSON.stringify(report.routes));}
}
fs.mkdirSync('tc19-artifacts',{recursive:true});
fs.writeFileSync('tc19-artifacts/config-sanitizada.json',JSON.stringify(report,null,2));
if(report.workers.some(w=>w.settingsAccessible)){console.log('TC19 PASS: metadados Worker lidos sem exibir secrets, sem alteracoes.');}
else{console.log('TC19 INCONCLUSIVO: sem leitura de settings do Worker; nenhum segredo divulgado.');process.exitCode=1;}
