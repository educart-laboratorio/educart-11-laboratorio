/**
 * R07 — matriz de negações para a portaria do Worker de prévia, sem rede.
 * Não finge homologação de login real; isso exige navegador/HTTP após deploy
 * expressamente autorizado e RLS intacto no Supabase DEV.
 */
import './testar-r074-codespaces-privado.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  HOST_PREVIA_PRIVADA, HOST_PREVIA_CANDIDATA, URL_SUPABASE_DEV,
  classificarRequisicaoPrivada, identidadeHomologacaoPermitida,
  configuracaoSupabaseDevValida, identificarRotaEstudantePrivada,
} from '../src/lib/security/preview-native-policy.ts';

const preview = HOST_PREVIA_PRIVADA;
const result = (host, path, mode='required', method='GET', receivedHost=host) =>
  classificarRequisicaoPrivada(host,path,mode,'production',{
    hostRecebido:receivedHost,metodoHttp:method,
  });
for (const path of ['/admin','/minha-educart','/minha-educart/login','/api/restrita',
 '/admin/financeiro','/api/matriculas','/formacao/secreta','/inscricao/privada',
 '/cadastro/privado','/criar/privado']) {
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'required'),'avaliar',
    'Worker candidato requer portaria para '+path);
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'off'),'negado',
    'Worker candidato sem modo deve falhar fechado: '+path);
}
for (const path of ['/','/formacao','/formacao/','/inscricao','/inscricao/',
 '/cadastro','/cadastro/','/criar','/criar/']) {
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'required'),'publico',
    'Vitrine e formulário precisam estar disponíveis ao público: '+path);
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'off'),'negado',
    'A falta do modo obrigatório nunca libera a candidata: '+path);
  assert.equal(result(HOST_PREVIA_PRIVADA,path,'required'),'avaliar',
    'Homologação totalmente privada continua intacta: '+path);
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'required','HEAD'),'publico',
    'HEAD da vitrine e permitido: '+path);
  for (const method of ['POST','PUT','PATCH','DELETE','OPTIONS']) {
    assert.equal(result(HOST_PREVIA_CANDIDATA,path,'required',method),'avaliar',
      'Metodo de escrita deve exigir sessao: '+method+' '+path);
  }
  assert.equal(result(HOST_PREVIA_CANDIDATA,path,'required','GET','spoof.example'),'avaliar',
    'Host divergente nunca recebe excecao publica: '+path);
}
assert.equal(result(HOST_PREVIA_CANDIDATA,'/admin/login','required'),'publico',
  'Login administrativo disponivel sem sessao na candidata');


for (const host of ['educart.pro','www.educart.pro',
  'educart-production.educartsuporte.workers.dev',
  'educart-autodev-preview.educartsuporte.workers.dev']) {
  assert.equal(result(host,'/admin','off'), 'publico','Portal 1.0/Workers atuais intactos: '+host);
  assert.equal(result(host,'/admin','required'),'negado','Alias nao pode contornar preview mode: '+host);
}
for (const path of ['/','/admin','/inscricao','/formacao',
  '/api/restrita','/api/futura/teste','/_rsc','/admin/financeiro',
  '/admin/qualquer.js','/protegido.png','/robots.txt','/favicon.ico']) {
  assert.equal(result(preview,path),'avaliar','Recurso protegido: '+path);
  assert.equal(result(preview,path,'off'),'negado','Sem modo habilitado: '+path);
}
for (const path of ['/admin/login','/admin/login/','/_next/static/chunk.js',
  '/_next/image','/images/marca/logo.svg']) {
  assert.equal(result(preview,path),'publico','Exceção estrita: '+path);
  assert.equal(result(preview,path,'off'),'negado','Sem modo, até login deve falhar: '+path);
}
assert.equal(result(preview,'/admin/login/extravio'),'avaliar');
assert.equal(result(preview,'/_next/data/admin.json'),'avaliar');
assert.equal(result(preview,'/images_fake/segredo.txt'),'avaliar');

// R07.2: a sessão institucional humana pode ser testada APENAS localmente no
// next dev vinculado a loopback; nunca habilitar exceção no Worker publicado.
for(const host of ['localhost','127.0.0.1']) {
  assert.equal(classificarRequisicaoPrivada(host,'/admin','local','development'),'avaliar');
  assert.equal(classificarRequisicaoPrivada(host,'/admin/login','local','development'),'publico');
  assert.equal(classificarRequisicaoPrivada(host,'/api/sessao','local','development'),'avaliar');
  assert.equal(classificarRequisicaoPrivada(host,'/admin','local','production'),'negado');
  assert.equal(classificarRequisicaoPrivada(host,'/admin','local',undefined),'negado');
}
assert.equal(classificarRequisicaoPrivada('educart.pro','/','local','development'),'negado');
assert.equal(classificarRequisicaoPrivada(preview,'/','local','development'),'negado');
assert.equal(classificarRequisicaoPrivada('alias.example.org','/admin','local','development'),'negado');


for (const email of ['educartsuporte@gmail.com',
  'felipe.jdtc@gmail.com','alinenepomuceno85@gmail.com',
  ' FELIPE.JDTC@GMAIL.COM ']) assert.equal(identidadeHomologacaoPermitida(email),true,email);
for (const email of ['','qualquer@gmail.com','invasor@educart.pro',
  'suporte@gmail.com',null,undefined]) assert.equal(identidadeHomologacaoPermitida(email),false,String(email));

// R07.5: estudante entra apenas no Codespaces privado; nenhuma exceção no Worker.
const nomeR075='educart-r075-privado';
const hostR075=nomeR075+'-3000.app.github.dev';
const ctxR075={
  codespaces:'true',nome:nomeR075,dominio:'app.github.dev',hostRecebido:hostR075
};
for(const pathname of ['/minha-educart/login','/minha-educart/recuperar','/minha-educart/ativar']) {
  assert.equal(identificarRotaEstudantePrivada(pathname),'publica');
  assert.equal(classificarRequisicaoPrivada(hostR075,pathname,'codespaces-private','development',ctxR075),'publico');
  assert.equal(classificarRequisicaoPrivada(preview,pathname,'required'),'avaliar',
    'Nenhum bypass de estudante no Worker');
}
for(const pathname of ['/minha-educart']) {
  assert.equal(identificarRotaEstudantePrivada(pathname),'autenticada');
  assert.equal(classificarRequisicaoPrivada(hostR075,pathname,'codespaces-private','development',ctxR075),'avaliar');
}
for(const pathname of ['/minha-educart/api/pagamentos','/admin','/api/secretaria']) {
  assert.equal(identificarRotaEstudantePrivada(pathname),null);
  assert.equal(classificarRequisicaoPrivada(hostR075,pathname,'codespaces-private','development',ctxR075),'avaliar');
}
assert.equal(classificarRequisicaoPrivada(hostR075,'/minha-educart/login',
  'codespaces-private','production',ctxR075),'negado');

const key='sb_publishable_teste-sem-credencial-real';
assert(configuracaoSupabaseDevValida(URL_SUPABASE_DEV,key));
assert(!configuracaoSupabaseDevValida('https://doygnsubiitencoyzjzk.supabase.co',key),
  'Projeto de producao nunca permitido');
assert(!configuracaoSupabaseDevValida(URL_SUPABASE_DEV,'sb_secret_sem_permissao'));
assert(!configuracaoSupabaseDevValida(URL_SUPABASE_DEV,undefined));

const proxy = readFileSync('src/proxy.ts','utf8');
const auth = readFileSync('src/lib/admin/autorizar-gestao.ts','utf8');
const login = readFileSync('src/app/admin/login/page.tsx','utf8');
const dashboard = readFileSync('src/app/admin/page.tsx','utf8');
const workflow = readFileSync('../../.github/workflows/validar-educart-11-consolidacao-interna.yml','utf8');
const app = readFileSync('src/app/layout.tsx','utf8');
const runner = readFileSync('scripts/preparar-homologacao-cloudflare.mjs','utf8');
for(const expression of [
  'export async function proxy(request: NextRequest)',
  "export const config = { matcher: ['/:path*'] }",
  'process.env.NODE_ENV',
  'supabase.auth.getClaims()',
  'supabase.auth.getUser()',
  'user.is_anonymous',
  'user.id !== claimsData.claims.sub',
  'identidadeHomologacaoPermitida(user.email)',
  'obterPapeisGestao(supabase, user.id)',
  'Cache-Control',
  "'private, no-store, max-age=0'",
  "response.headers.set('Vary', 'Cookie')",
  "new URL(rotaEstudante === 'autenticada' ? '/minha-educart/login' : '/admin/login', request.url)",
  "return erro(503)",
  'request.cookies.getAll()',
  'request.cookies.set(name, value)',
]) assert(proxy.includes(expression),'Proteção ausente: '+expression);
assert(!proxy.includes('getSession()'),'Nao confiar em cookie sem validacao');
assert(!proxy.includes('SERVICE_ROLE')&&!proxy.includes('sb_secret_'),'Nao usar credencial secreta');
assert(auth.includes(".from('portal_admins')")&&auth.includes(".from('equipe_papeis')"),
  'Membership e papel persistidos exigidos');
assert(login.includes('obterPapeisGestao'),'Tela 1.0 de login mantida');
assert(dashboard.includes('getUser()')&&dashboard.includes('podeAlterarStatus'),
  'Gestao com verificacoes legadas de papel mantida');
assert(app.includes('<AccessibilityWidget />')&&app.includes('<WhatsAppFlutuante />'),
  'LIPE 1.0 intacta');
assert(workflow.includes('testar-r01-baseline'),'CI preserva baseline');
assert(runner.includes('if(deploy){'),'Regra existente de nao publicar sem protecao e permissao');
console.log('R07 OK: 3 identidades, auth + membership + papel, 401/403, cookies, no-store, preview isolada.');
console.log('Ainda pendente: execucao HTTP autenticada real e homologacao antes de liberar qualquer deploy.');
