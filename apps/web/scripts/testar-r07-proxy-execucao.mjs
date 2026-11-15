/**
 * R07: executa a função proxy REAL em um runtime isolado, substituindo somente
 * NextResponse e as chamadas Supabase por mocks sintéticos (nenhum acesso à rede).
 * Não é E2E nem substitui os testes de autenticação em um Worker real.
 */
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const HOST='educart-11-homologacao.educartsuporte.workers.dev';
const USER='01234567-89ab-4cde-8f01-234567890abc';
const env={
  EDUCART_PRIVATE_PREVIEW_MODE:'required',
  NEXT_PUBLIC_SUPABASE_URL:DEV,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_chave-sintetica-r07',
};
let scenario, calls;
function reset(overrides={}) {
  scenario={
    claims:true, user:{id:USER,email:'felipe.jdtc@gmail.com',is_anonymous:false},
    member:true, roles:['secretaria'], authError:false,
    ...overrides,
  };
  calls=[];
}
class FakeResponse {
  constructor({status=200,redirectTo=null}={}) {
    this.status=status;
    this.redirectTo=redirectTo;
    this.headers=new Headers();
    this.cookieEntries=[];
    this.cookies={set:(name,value,options)=>{this.cookieEntries.push({name,value,options})}};
  }
  static next(){return new FakeResponse()}
  static json(_data,{status}){return new FakeResponse({status})}
  static redirect(url,{status}){return new FakeResponse({status,redirectTo:String(url)})}
  static rewrite(url){const response=new FakeResponse();response.headers.set('x-middleware-rewrite',String(url));return response;}
}
function makeRequest(path='/',{host=HOST,receivedHost=host,method='GET',accept='text/html',rsc=false}={}) {
  const url='https://'+host+path;
  const cookies=[];
  const headers=new Headers({accept});
  if(rsc)headers.set('rsc','1');
  headers.set('host',receivedHost);
  return {
    url,nextUrl:new URL(url),method,headers,
    cookies:{getAll:()=>cookies,set:(name,value)=>cookies.push({name,value})},
  };
}
function createMockClient(_url,_key,options) {
  const dbQuery=table=>({
    select: column=>({
      eq: (field,id)=>{
        calls.push([table,column,field,id]);
        let result;
        if (table==='portal_admins') result={data:scenario.member?{user_id:USER}:null,error:scenario.dbError?{code:'42501'}:null};
        else result={data:scenario.roles.map(papel=>({papel})),error:scenario.dbError?{code:'42501'}:null};
        return {
          maybeSingle:async()=>result,
          then:(resolve,reject)=>Promise.resolve(result).then(resolve,reject),
        };
      },
    }),
  });
  return {
    auth:{
      getClaims:async()=>{
        calls.push('claims');
        if(scenario.throwNetwork)throw Error('falha de rede');
        if(scenario.refresh)options.cookies.setAll([{name:'sb-r07',value:'fake-cookie',options:{httpOnly:true,sameSite:'lax'}}]);
        return scenario.claims?{data:{claims:{sub:USER}},error:null}:{data:{claims:null},error:{message:'expired'}};
      },
      getUser:async()=>{
        calls.push('user');
        return {data:{user:scenario.user},error:scenario.authError?{message:'revoked'}:null};
      },
    },
    from:dbQuery,
  };
}

const context=vm.createContext({process:{env},URL,Headers,console});
const modules={
  'next/server':new vm.SyntheticModule(['NextResponse'],function(){this.setExport('NextResponse',FakeResponse)},{context}),
  '@supabase/ssr':new vm.SyntheticModule(['createServerClient'],function(){this.setExport('createServerClient',createMockClient)},{context}),
};
function tsModule(filename,identifier) {
  const source=readFileSync(filename,'utf8');
  const js=ts.transpileModule(source,{
    compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
    fileName:filename,
  }).outputText;
  return new vm.SourceTextModule(js,{context,identifier});
}
modules['./lib/admin/autorizar-gestao']=tsModule('src/lib/admin/autorizar-gestao.ts','gestao');
modules['./lib/security/preview-native-policy']=tsModule('src/lib/security/preview-native-policy.ts','politica');
const main=tsModule('src/proxy.ts','proxy');
await main.link(specifier=>{
  if(!modules[specifier])throw Error('Import inesperado: '+specifier);
  return modules[specifier];
});
await main.evaluate();
const proxy=main.namespace.proxy;

reset();
env.EDUCART_PRIVATE_PREVIEW_MODE='off';
let r=await proxy(makeRequest('/admin',{host:'educart.pro'}));
assert.equal(r.status,503);assert.equal(calls.length,0,'admin oficial bloqueado sem modo privado obrigatório');
env.EDUCART_PRIVATE_PREVIEW_MODE='required';
r=await proxy(makeRequest('/admin',{host:'preview-alias.example.org'}));
assert.equal(r.status,503,'alias em Worker privado deve ser recusado');

const candidateHost='educart-11-candidate.educartsuporte.workers.dev';
reset();
env.EDUCART_PRIVATE_PREVIEW_MODE='off';
r=await proxy(makeRequest('/minha-educart',{host:candidateHost}));
assert.equal(r.status,503,'Candidata sem modo privado deve falhar fechada');
reset({claims:false});
env.EDUCART_PRIVATE_PREVIEW_MODE='required';
r=await proxy(makeRequest('/minha-educart',{host:candidateHost}));
assert.equal(r.status,303,'Candidata nao pode entregar historico a visitante anonimo');
assert(r.redirectTo.endsWith('/admin/login'));
assert.deepEqual(calls,['claims'],'Sem sessao nao consultar banco de dados');
reset();
r=await proxy(makeRequest('/admin/login',{host:candidateHost}));
assert.equal(r.status,200,'Login administrativo publico na candidata');
assert.deepEqual(calls,[],'Formulario nao consulta dados privados');
assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive',
  'Login publico da candidata nao pode ser indexado');
assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0',
  'Login da candidata nao pode ser cacheado');
for (const path of ['/','/formacao','/inscricao','/cadastro','/criar']) {
  reset({claims:false});
  r=await proxy(makeRequest(path,{host:candidateHost}));
  assert.equal(r.status,200,'Vitrine publica sem necessidade de sessao: '+path);
  assert.deepEqual(calls,[],'Vitrine publica nao deve consultar Auth nem banco: '+path);
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
  assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');
  reset({claims:false});
  r=await proxy(makeRequest(path,{host:candidateHost,method:'POST',accept:'application/json'}));
  assert.equal(r.status,401,'POST em pagina da vitrine exige autenticacao: '+path);
  reset({claims:false});
  r=await proxy(makeRequest(path,{host:candidateHost,receivedHost:'spoof.example',accept:'application/json'}));
  assert.equal(r.status,401,'Host divergente nao recebe excecao publica: '+path);
}
reset({claims:false});
r=await proxy(makeRequest('/admin',{host:candidateHost}));
assert.equal(r.status,303,'Gestao continua protegida mesmo com vitrine publica');
assert.deepEqual(calls,['claims']);
reset({claims:false});
r=await proxy(makeRequest('/api/matriculas',{host:candidateHost,method:'POST',accept:'application/json'}));
assert.equal(r.status,401,'Dados e chamadas privadas sempre exigem sessao');

reset();
env.EDUCART_PRIVATE_PREVIEW_MODE='off';
r=await proxy(makeRequest('/admin'));
assert.equal(r.status,503);assert.equal(calls.length,0,'sem modo: fail closed');
env.EDUCART_PRIVATE_PREVIEW_MODE='required';
reset();
r=await proxy(makeRequest('/admin/login'));
assert.equal(r.status,200);assert.equal(calls.length,0,'login publico no ambiente privado');
reset();
r=await proxy(makeRequest('/_next/static/chunk.js'));
assert.equal(r.status,200);assert.equal(calls.length,0,'asset estatico');
reset({claims:false});
r=await proxy(makeRequest('/admin'));
assert.equal(r.status,303);assert(r.redirectTo.endsWith('/admin/login'));
assert.deepEqual(calls,['claims'],'sem JWT nao consultar dados');
reset({claims:false});
r=await proxy(makeRequest('/admin',{rsc:true}));
assert.equal(r.status,401,'RSC deve receber 401');
reset({claims:false});
r=await proxy(makeRequest('/api/matriculas',{method:'POST'}));
assert.equal(r.status,401,'POST anonimo recebe 401');
reset({user:{id:USER,email:'outro@gmail.com',is_anonymous:false}});
r=await proxy(makeRequest('/admin'));
assert.equal(r.status,403,'sem email permitido, mesmo autenticado');
assert.deepEqual(calls,['claims','user'],'sem email permitido nao toca no banco');
reset({user:{id:USER,email:'felipe.jdtc@gmail.com',is_anonymous:true}});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,303,'anon auth proibido');
reset({user:{id:'outro-id',email:'felipe.jdtc@gmail.com',is_anonymous:false}});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,303,'JWT nao corresponde ao usuario');
reset({member:false});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,403,'sem portal_admins');
reset({roles:[]});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,403,'sem papel de gestao');
reset({dbError:true});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,403,'RLS erro no banco');
reset({authError:true});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,303,'sessao revogada');
reset({throwNetwork:true});
r=await proxy(makeRequest('/admin'));assert.equal(r.status,503,'falha de rede nega');

for(const [email,papeis] of [
  ['educartsuporte@gmail.com',['secretaria','coordenacao']],
  ['felipe.jdtc@gmail.com',['secretaria']],
  ['alinenepomuceno85@gmail.com',['coordenacao']],
]) {
  reset({user:{id:USER,email,is_anonymous:false},roles:papeis,refresh:true});
  r=await proxy(makeRequest('/admin'));
  assert.equal(r.status,200,'autoriza credenciais e papéis: '+email);
  assert.equal(r.headers.get('Cache-Control'),'private, no-store, max-age=0');
  assert.equal(r.headers.get('Vary'),'Cookie');
  assert.equal(r.headers.get('X-Robots-Tag'),'noindex, nofollow, noarchive');
  assert(r.cookieEntries.some(c=>c.name==='sb-r07'),'preserva cookie renovado');
  assert(calls.some(call=>Array.isArray(call)&&call[0]==='portal_admins'));
  assert(calls.some(call=>Array.isArray(call)&&call[0]==='equipe_papeis'));
}
reset();
env.NEXT_PUBLIC_SUPABASE_URL='https://doygnsubiitencoyzjzk.supabase.co';
r=await proxy(makeRequest('/admin'));
assert.equal(r.status,503,'nao aceitar database de producao');
assert.equal(calls.length,0);
env.NEXT_PUBLIC_SUPABASE_URL=DEV;

// R07.5: E2E sintético da portaria de estudantes no Codespaces PRIVATE.
const codespace='educart-r075-seguro';
const codespaceHost=codespace+'-3000.app.github.dev';
env.NODE_ENV='development';
env.EDUCART_PRIVATE_PREVIEW_MODE='codespaces-private';
env.CODESPACES='true';
env.CODESPACE_NAME=codespace;
env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN='app.github.dev';
reset();
r=await proxy(makeRequest('/minha-educart/login',{host:codespaceHost}));
assert.equal(r.status,200,'login de estudante deve carregar sem sessão no Codespaces privado');
assert.deepEqual(calls,[],'formulário público não consulta dados');
reset();
r=await proxy(makeRequest('/minha-educart/recuperar',{host:codespaceHost}));
assert.equal(r.status,200,'recuperação do estudante no Codespaces privado');
reset({claims:false});
r=await proxy(makeRequest('/minha-educart',{host:codespaceHost}));
assert.equal(r.status,303);
assert(r.redirectTo.endsWith('/minha-educart/login'),'estudante anônimo não é redirecionado ao /admin');
reset({claims:false});
r=await proxy(makeRequest('/minha-educart/ativar?convite=01234567-89ab-4cde-8f01-234567890abc',{host:codespaceHost}));
assert.equal(r.status,200,'convite precisa abrir ANTES da conta existir');
assert.deepEqual(calls,[],'formulário de convite não toca dados privados sem Auth');
reset({claims:false});
r=await proxy(makeRequest('/minha-educart',{host:codespaceHost,rsc:true}));
assert.equal(r.status,401,'histórico RSC sem sessão negado');
reset({user:{id:USER,email:'r13-estudante-a@example.invalid',is_anonymous:false},member:false,roles:[]});
r=await proxy(makeRequest('/minha-educart',{host:codespaceHost}));
assert.equal(r.status,200,'estudante Auth pode acessar UI individual');
assert.deepEqual(calls,['claims','user'],'estudante não consulta nem herda papéis administrativos');
reset({user:{id:USER,email:'r13-estudante-a@example.invalid',is_anonymous:false},member:false,roles:[]});
r=await proxy(makeRequest('/minha-educart/ativar',{host:codespaceHost}));
assert.equal(r.status,200,'página de convite só exibe formulário; RPC exige Auth e matrícula');
assert.deepEqual(calls,[],'página pública do convite não consulta dados protegidos');
reset({user:{id:USER,email:'r13-estudante-a@example.invalid',is_anonymous:false},member:false,roles:[]});
r=await proxy(makeRequest('/admin',{host:codespaceHost}));
assert.equal(r.status,403,'estudante não pode entrar no painel administrativo');
reset({user:{id:USER,email:'r13-estudante-a@example.invalid',is_anonymous:false},member:false,roles:[]});
r=await proxy(makeRequest('/minha-educart/api/privada',{host:codespaceHost}));
assert.equal(r.status,403,'rota futura não ganha bypass do estudante');
env.NODE_ENV='production';
env.EDUCART_PRIVATE_PREVIEW_MODE='required';
reset({claims:false});
r=await proxy(makeRequest('/minha-educart/login',{host:HOST}));
assert.equal(r.status,303);
assert(r.redirectTo.endsWith('/admin/login'),'Worker não permite o novo bypass local');

console.log('R07 PROXY EXEC: 18 classes de acesso testadas, sem dados reais e sem deploy.');
