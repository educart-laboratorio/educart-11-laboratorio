/**
 * EducART R07.2 — integração HTTP REAL sobre loopback em GitHub Actions.
 * Não há Worker publicado, túnel, porta pública ou conta pessoal usada.
 * Servidor Next 16 de desenvolvimento vinculado SOMENTE a 127.0.0.1.
 * Os testes validam a portaria na pilha HTTP, não sessões reais de equipe.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve } from 'node:path';
import { lookup } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';

const modoLocal=process.argv.includes('--local');
const modoCodespaces=process.argv.includes('--codespaces');
const modoCodespacesNegado=process.argv.includes('--codespaces-deny');
assert([modoLocal,modoCodespaces,modoCodespacesNegado].filter(Boolean).length<=1,'Modos exclusivos');
// Portas distintas evitam falso resultado quando Next dev demora a liberar o socket.
const port=modoCodespacesNegado?31214:modoCodespaces?31213:modoLocal?31212:31211;
const hostPrivado='educart-11-homologacao.educartsuporte.workers.dev';
// R07.2: ambos testes continuam em loopback. `--local` usa modo de login humano.
const origin=(modoLocal || modoCodespaces || modoCodespacesNegado)?'http://127.0.0.1:'+port:'http://'+hostPrivado+':'+port;
const dev='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const env={
  ...process.env,
  EDUCART_PRIVATE_PREVIEW_MODE:(modoCodespaces||modoCodespacesNegado)?'codespaces-private':modoLocal?'local':'required',
  CODESPACES:modoCodespaces?'true':modoCodespacesNegado?'false':undefined,
  CODESPACE_NAME:(modoCodespaces||modoCodespacesNegado)?'educart-r074-ci':undefined,
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:(modoCodespaces||modoCodespacesNegado)?'app.github.dev':undefined,
  NEXT_PUBLIC_SUPABASE_URL:dev,
  // Nunca usa chave de produção, service role nem login real.
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_r072_local_ficticia',
  NEXT_TELEMETRY_DISABLED:'1',
  CI:'true',
};
// O bind por hostname usa o endereco resolvido. Se nao for loopback, ABORTAR.
if (!modoLocal && !modoCodespaces && !modoCodespacesNegado) {
  const { address } = await lookup(hostPrivado, { family:4 });
  assert.equal(address,'127.0.0.1','Hostname não está isolado em loopback');
}
const bind=(modoLocal || modoCodespaces || modoCodespacesNegado)?'127.0.0.1':hostPrivado;
const entry=resolve('node_modules/next/dist/bin/next');
const child=spawn(process.execPath,[entry,'dev','--hostname',bind,'--port',String(port)],{
  cwd:process.cwd(),env,stdio:['ignore','pipe','pipe'],
});
let diag='', closed=false;
for(const s of [child.stdout,child.stderr])s.on('data',chunk=>{
  // Log diagnóstico apenas local ao job, nunca imprimir resposta com dados.
  diag=(diag+String(chunk)).slice(-1600);
});
child.on('exit',()=>{closed=true;});
async function request(path,opts={}) {
  const headers=new Headers({Accept:'application/json'});
  if(opts.html)headers.set('Accept','text/html');
  if(opts.rsc)headers.set('RSC','1');
  if(opts.cookie)headers.set('Cookie',opts.cookie);
  if(opts.host)headers.set('Host',opts.host);
  const res=await fetch(origin+path,{
    method:opts.method||'GET', headers,redirect:'manual',
    signal:AbortSignal.timeout(10000),
  });
  const txt=await res.text();
  // Nunca reproduzir corpo nos logs: apenas checar vazamento de marcadores.
  assert(!txt.includes('sb_secret_'),'Resposta expôs padrão de segredo');
  return {status:res.status,headers:res.headers,body:txt};
}
function headersPrivados(r) {
  assert.match(r.headers.get('cache-control')||'',/no-store/,'Sem cache compartilhado');
  assert.match(r.headers.get('x-robots-tag')||'',/noindex/,'Sem indexação');
  assert.match(r.headers.get('vary')||'',/Cookie/,'Resposta deve variar por cookie');
}
try {
  let alive=false;
  const codigoLoginEsperado=modoCodespacesNegado?503:200;
  for(let i=0;i<22;i++) {
    if(closed)throw Error('Servidor Next encerrado antes de ficar pronto; '+diag.replace(/\x1b\[[0-9;]*m/g,'').slice(-500));
    try {
      // Não expor conteúdo público durante a espera.
      const r=await request('/admin/login',{html:true});
      if(r.status===codigoLoginEsperado){alive=true;break;}
      if(i===21)throw Error('Login local não acessível: '+r.status+'; '+diag.slice(-1200));
    } catch(e) { if(i===21)throw e; }
    await sleep(500);
  }
  assert(alive,'Servidor não respondeu após inicialização');

  const tests=modoCodespacesNegado?[
    ['/admin/login',{html:true},503],
    ['/',{html:true},503],
    ['/admin',{html:true},503],
    ['/api/rota-futura',{method:'POST'},503],
  ]:[ 
    ['/admin',{html:true},303],
    ['/',{html:true},303],
    ['/formacao',{html:true},303],
    ['/admin/financeiro',{html:true},303],
    ['/api/rota-futura',{method:'POST'},401],
    ['/admin',{rsc:true},401],
    ['/admin',{cookie:'sb-r072=valor-forjado',html:true},303],
  ];
  for(const [path,opts,expected] of tests) {
    const r=await request(path,opts);
    assert.equal(r.status,expected,'HTTP real '+path+' esperado '+expected+' obtido '+r.status);
    headersPrivados(r);
    if(expected===303) {
      const loc=r.headers.get('location')||'';
      assert.equal(new URL(loc,origin).pathname,'/admin/login','Redirecionamento somente local');
    }
    console.log('R07.2 HTTP LOOPBACK OK:',modoCodespacesNegado?'codespaces-deny':modoCodespaces?'codespaces':modoLocal?'local':'worker',opts.method||'GET',path,'HTTP',r.status);
  }
  if (modoCodespaces) {
    // Next dev pode normalizar o Host no transporte; a prova de host arbitrario
    // fica na politica pura R07.4. Aqui testamos o fluxo HTTP de login.
    console.log('R07.4 HTTP Codespaces: acesso anonimo protegido por 303/401.');
  }
  if (modoCodespacesNegado) {
    console.log('R07.4 HTTP Codespaces: CODESPACES=false negou login e rotas em HTTP 503.');
  }
  console.log('R07.2: '+tests.length+' respostas HTTP isoladas, sem credenciais, sem Worker, sem deploy.');
  console.log('Alias de Worker continua sujeito a teste direto de proxy; Next dev normaliza Host para o hostname do listener.');
  console.log('PENDENTE: sessão Supabase DEV real com credenciais institucionais e browser touch.');
} finally {
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(2500)]);
  if(!closed)child.kill('SIGKILL');
}

// Subprocessos nao podem invocar novamente a bateria principal: isso
// provocaria recursao infinita e consumo desnecessario do CI.
if (modoCodespaces || modoCodespacesNegado) process.exit(0);

if (!modoLocal && !modoCodespaces && !modoCodespacesNegado) {
  // O CI existente executa este script sem parametros; a terceira bateria
  // exercita Codespaces em loopback sem alterar workflows ou publicar portas.
  const check=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--codespaces'],{
    cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:45000,
  });
  assert.equal(check.status,0,
    'R07.4 HTTP Codespaces em loopback falhou; nenhum deploy foi realizado');
  const deny=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--codespaces-deny'],{
    cwd:process.cwd(),env:process.env,stdio:'inherit',timeout:45000,
  });
  assert.equal(deny.status,0,
    'R07.4 HTTP Codespaces deveria negar sem CODESPACES=true');
}
