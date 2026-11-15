/** R07.4 — Codespaces privado / fail closed. Sem API externa, dados ou deploy. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {classificarRequisicaoPrivada,validarHostCodespacePrivado} from
  '../src/lib/security/preview-native-policy.ts';

const config=JSON.parse(readFileSync('../../.devcontainer/devcontainer.json','utf8'));
const start=readFileSync('../../.devcontainer/start-r074.mjs','utf8');
const proxy=readFileSync('src/proxy.ts','utf8');
const workflow=readFileSync('../../.github/workflows/validar-educart-11-consolidacao-interna.yml','utf8');
const httpRunner=readFileSync('scripts/testar-r072-http-loopback.mjs','utf8');
assert(httpRunner.includes('if (!modoLocal && !modoCodespaces && !modoCodespacesNegado)'),
  'O modo negativo nao pode reiniciar a bateria principal recursivamente');
assert(httpRunner.includes('if (modoCodespaces || modoCodespacesNegado) process.exit(0)'),
  'Subprocessos de Codespaces devem terminar apos limpar o Next dev');
assert(config.image.includes('devcontainers/javascript-node:22-bookworm'));
assert.deepEqual(config.forwardPorts,[3000]);
assert(config.portsAttributes['3000'].onAutoForward==='openBrowser');
assert(config.containerEnv.EDUCART_PRIVATE_PREVIEW_MODE==='codespaces-private');
assert.equal(config.containerEnv.NEXT_PUBLIC_SUPABASE_URL,
  'https://esjrjzyvyhtzwgihcbsc.supabase.co');
assert(!('NEXT_PUBLIC_SUPABASE_ANON_KEY' in config.containerEnv),
  'Nao inserir chave no repositorio, mesmo se for publishable');
assert(config.postStartCommand==='node .devcontainer/start-r074.mjs');
assert(config.postCreateCommand.includes('npm ci'));
assert(start.includes("process.env.CODESPACES!=='true'"));
assert(start.includes("spawnSync('git',['remote','get-url','origin']"),
  'Identidade do repositorio deve ser verificada no remote Git real');
assert(start.includes("process.env.GITHUB_REPOSITORY &&"),
  'Se GITHUB_REPOSITORY estiver presente, tambem deve corresponder ao repo');
assert(start.includes("origensPermitidas.includes(origin)"),
  'Nao aceitar remote arbitrario, inclusive mirrors ou hosts estranhos');
assert(start.includes("spawnSync('git',['branch','--show-current']"));
assert(start.includes("EDUCART_DEV_SUPABASE_PUBLISHABLE_KEY"));
assert(start.includes("'autodev-r07-estudantes-codespaces-private-20261106'"),
  'Branch de correção aprovada deve iniciar somente no Codespaces privado');
assert(start.includes("if (!keyValid(key))"),'Sem chave: nao iniciar servidor');
assert(start.includes("detached:true"));
assert(start.includes("'X-GitHub-Api-Version':'2022-11-28'"),
  'Versao REST GitHub estavel, sem cabeçalho experimental');
assert(start.includes('diagnosticarLoginLocal()'),'Diagnostico local obrigatorio');
assert(start.includes('R07.4 LOCAL OK: login EducART HTTP 200'),
  'Nao declarar servico pronto antes de receber HTML do login');
const bloqueio=spawnSync(process.execPath,['../../.devcontainer/start-r074.mjs'],{
  cwd:process.cwd(),encoding:'utf8',timeout:10000,
  env:{...process.env,CODESPACES:'false'},
});
assert.equal(bloqueio.status,1,'Iniciador nunca executa fora de Codespaces');
assert.match(bloqueio.stderr,/R07\.4 BLOQUEIO:/,'Bloqueio nao confirmou a razao');
assert(start.includes("EDUCART_PRIVATE_PREVIEW_MODE:'codespaces-private'"));
assert(!start.includes("wrangler")&&!start.includes("cloudflared")&&!start.includes("service_role"),
  'Start nao pode publicar ou tocar segredos');
for(const name of ['process.env.CODESPACES','process.env.CODESPACE_NAME',
  'process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN',
  'process.env.NODE_ENV','request.nextUrl.hostname',"request.headers.get('host')"]) assert(proxy.includes(name),'Proxy sem verificação '+name);

const name='educart-r074-aprovado';
const domain='app.github.dev';
const forwarded=name+'-3000.'+domain;
const ctx={codespaces:'true',nome:name,dominio:domain,hostRecebido:forwarded};
const classify=(host,path,mode='codespaces-private',env='development',context=ctx)=>
  classificarRequisicaoPrivada(host,path,mode,env,context);
for(const host of [forwarded,'localhost','127.0.0.1']){
  assert.equal(classify(host,'/admin'),'avaliar','Host de Codespace '+host);
  assert.equal(classify(host,'/admin/login'),'publico');
  assert.equal(classify(host,'/api/private'),'avaliar');
}
// Bind real do Codespaces: Next dev pode usar 0.0.0.0 na URL normalizada,
// mas o Host HTTP recebido deve continuar sendo o encaminhamento privado/loopback.
assert.equal(classify('0.0.0.0','/admin/login'),'publico',
  'Bind 0.0.0.0 normalizado pelo Next deve aceitar login com Host HTTP confiavel');
assert.equal(classify('0.0.0.0','/admin'),'avaliar',
  'Bind 0.0.0.0 nao pode dispensar autenticacao institucional');
for(const hostRecebido of ['0.0.0.0','evil.example.org','educart.pro']){
  assert.equal(classify('0.0.0.0','/admin/login','codespaces-private','development',
    {...ctx,hostRecebido}),'negado','Bind normalizado nao autoriza Host HTTP arbitrario');
}
for(const env of ['production','test'])
  assert.equal(classify('localhost','/admin','codespaces-private',env),'negado','Codespace so dev');
assert.equal(classificarRequisicaoPrivada('localhost','/admin','codespaces-private',undefined,ctx),
  'negado','Sem ambiente explicito: negar');
for(const context of [
  {...ctx,codespaces:'false'},
  {...ctx,nome:'../foo'},
  {...ctx,dominio:'app.github.dev.evil.com'},
  {...ctx,dominio:'example.com'},
  {...ctx,nome:undefined},
  {...ctx,hostRecebido:'other.example.org'},
])
  assert.equal(validarHostCodespacePrivado('evil.example.org','development',context),false);
// O Host HTTP recebido nao pode divergir da origem normalizada.
for(const [host,recebido] of [
  [forwarded,'evil.example.org'],
  ['evil.example.org',forwarded],
  ['educart.pro','localhost'],
  ['localhost','educart.pro'],
]) {
  assert.equal(classify(host,'/admin','codespaces-private','development',
    {...ctx,hostRecebido:recebido}),'negado','Host divergente deve falhar fechado');
}
assert.equal(classify('educart.pro','/'),'negado','Codigo de Codespace nao libera portal publico');
assert.equal(classify('evil.example.org','/','codespaces-private','development',
  {...ctx,hostRecebido:'evil.example.org'}),'negado','Sem bypass por host alternativo');
assert.equal(classify(forwarded,'/admin','codespaces-private','production'),'negado');
assert.equal(classify(forwarded,'/admin','local','production'),'negado');
assert.equal(classify('educart.pro','/admin','off'),'publico','LIPE 1.0 fora do portao');

assert(workflow.includes('testar-r01-baseline.mjs'),'LIPE deve continuar no CI');
assert(workflow.includes('timeout 150s node .devcontainer/start-r074.mjs')&&workflow.includes('curl --max-time 8'),'CI deve testar iniciador real e HTTP loopback');
console.log('R07.4 OK: Codespaces só desenvolvimento/conta GitHub/porta 3000, sem chave no Git, sem deploy.');
console.log('PENDENTE: habilitacao Codespaces na conta e login pessoal (nao automatizado).');
