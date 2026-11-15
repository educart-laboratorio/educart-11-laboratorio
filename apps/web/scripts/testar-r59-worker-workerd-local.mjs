/**
 * GSI-R59: HTTP smoke tests against actual Cloudflare workerd through Wrangler local.
 * No deployment, remote bindings, real credentials or public listener.
 * Keep in the isolated CI branch; preserve the R50 snapshot.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const output='.cloudflare/output/v0/workers/default';
assert(fs.statSync(path.join(output,'bundle/index.js')).size>0,'Bundle Vinext ausente');
assert(fs.statSync(path.join(output,'assets')).isDirectory(),'Assets Vinext ausentes');
const configFile='.gsi-r59-workerd-local.generated.json';
const host='educart-11-candidate.educartsuporte.workers.dev';
const port=8787;
const origin='http://127.0.0.1:'+port;
const config={
  name:'gsi-r59-worker-somente-local',
  main:'./'+output+'/bundle/index.js',
  compatibility_date:'2026-10-31',
  compatibility_flags:['nodejs_compat'],
  no_bundle:true,
  find_additional_modules:true,
  base_dir:'./'+output+'/bundle',
  rules:[
    {type:'ESModule',globs:['**/*.js'],fallthrough:true},
    {type:'Data',globs:['**/*.json'],fallthrough:true},
  ],
  assets:{
    directory:'./'+output+'/assets',
    binding:'ASSETS',
    html_handling:'none',
    not_found_handling:'none',
    run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*'],
  },
  workers_dev:false,
  vars:{
    EDUCART_PRIVATE_PREVIEW_MODE:'required',
    NEXT_PUBLIC_SUPABASE_URL:'https://esjrjzyvyhtzwgihcbsc.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_r59_chave_ficticia_sem_validade',
  },
};
fs.writeFileSync(configFile,JSON.stringify(config,null,2));
let exited=false,outputLog='',spawnError=null;
let processChild;
function capture(d){outputLog=(outputLog+String(d)).slice(-4000);}
async function hit(route,opts={}){
  const headers={'Host':opts.host||host,'Accept':opts.html?'text/html':'application/json'};
  if(opts.rsc)headers.RSC='1';
  if(opts.cookie)headers.Cookie=opts.cookie;
  const response=await fetch(origin+route,{
    method:opts.method||'GET',headers,redirect:'manual',signal:AbortSignal.timeout(6000),
  });
  const body=await response.text();
  assert(!body.includes('sb_secret_'),'Marcador de segredo na resposta');
  return response;
}
function assertPrivate(res){
  assert.match(res.headers.get('cache-control')||'',/no-store/,'Cache privado ausente');
  assert.match(res.headers.get('x-robots-tag')||'',/noindex/,'Noindex privado ausente');
}
try{
  processChild=spawn('npx',[
    '--yes','wrangler@4.162.0','dev','--local',
    '--config',configFile,'--ip','127.0.0.1',
    '--port',String(port),'--inspector-port','9349',
  ],{
    cwd:process.cwd(),stdio:['ignore','pipe','pipe'],
    env:{...process.env,CLOUDFLARE_ACCOUNT_ID:'',CLOUDFLARE_API_TOKEN:'',WRANGLER_SEND_METRICS:'false'},
  });
  processChild.on('error',err=>{spawnError=err;exited=true;capture(String(err));});
  processChild.on('exit',code=>{exited=true;capture('workerd exit code '+code);});
  processChild.stdout?.on('data',capture);
  processChild.stderr?.on('data',capture);
  let ready=false;
  for(let i=0;i<45;i++){
    if(exited)throw new Error('Wrangler encerrou antes de iniciar: '+outputLog);
    try{
      const response=await hit('/admin/login',{html:true});
      if(response.status>=200){ready=true;break;}
    }catch(_err){}
    await sleep(600);
  }
  assert(ready,'Wrangler local nao respondeu: '+outputLog);
  const cases=[
    {name:'login publico',route:'/admin/login',html:true,expected:200},
    {name:'vitrine publica',route:'/',html:true,expected:200},
    {name:'curso publico',route:'/formacao',html:true,expected:200},
    {name:'inscricao previa',route:'/inscricao',html:true,expected:200},
    {name:'admin anonimo',route:'/admin',html:true,expected:303,private:true,login:true},
    {name:'financeiro anonimo',route:'/admin/financeiro',html:true,expected:303,private:true,login:true},
    {name:'api sem sessao',route:'/api/rota-futura',method:'POST',expected:401,private:true},
    {name:'rsc sem sessao',route:'/admin',rsc:true,expected:401,private:true},
    {name:'cookie falsificado',route:'/admin',html:true,cookie:'sb-r59=invalido',expected:303,private:true,login:true},
    {name:'host arbitrario',route:'/admin',html:true,host:'spoof.invalid',expected:503,private:true},
  ];
  for(const c of cases){
    const res=await hit(c.route,c);
    assert.equal(res.status,c.expected,c.name+': esperado '+c.expected+', obtido '+res.status);
    if(c.private)assertPrivate(res);
    if(c.login){
      const loc=res.headers.get('location')||'';
      assert.equal(new URL(loc,origin).pathname,'/admin/login','Redirect inesperado: '+c.name);
    }
    console.log('GSI-R59 WORKERD LOCAL PASS: '+c.name+' HTTP '+res.status);
  }
  console.log('GSI-R59: 10/10 HTTP reais em workerd local, sem deploy e sem credenciais reais.');
} finally {
  if(processChild&&!exited){
    processChild.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>processChild.once('exit',resolve)),sleep(2000)]);
    if(!exited)processChild.kill('SIGKILL');
  }
  fs.rmSync(configFile,{force:true});
}
