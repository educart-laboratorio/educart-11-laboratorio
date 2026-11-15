/**
 * EducART 1.1 — publicador separado da produção.
 * NUNCA compartilha Worker, rotas ou variables com educart-production.
 * Sem --deploy executa somente dry-run; deploy exige Access previamente ativo.
 */
import {existsSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const deploy=process.argv.includes('--deploy');
const cwd=process.cwd();
const target='educart-11-homologacao';
const project='esjrjzyvyhtzwgihcbsc';
const account='8fe5407b4d31f20e19a1388527e365ad';
const folder='.cloudflare/output/v0/workers/default';
const cfgPath=resolve(cwd,'wrangler.homologacao.generated.json');
const env=process.env;
if(!existsSync(resolve(cwd,folder,'bundle/index.js'))||!existsSync(resolve(cwd,folder,'assets')))
  throw Error('Build real Vinext ausente: npm run build:vinext');
if(['educart-production','educart-autodev-preview'].includes(target))
  throw Error('Não publicar sobre Workers existentes');
// R07: trava global anterior a quaisquer permissões/segredos do fluxo histórico.
// Nenhuma opção da CLI ou variável de ambiente pode liberar um Worker privado
// até a proteção nativa e o teste de HTTP real serem homologados pela direção.
if (deploy) {
  throw Error('R07 BLOQUEIO: deploy da prévia privada proibido antes de homologação da portaria nativa.');
}
if(deploy){
  if(env.NEXT_PUBLIC_SUPABASE_URL!=='https://'+project+'.supabase.co')
    throw Error('BLOQUEIO: database-dev obrigatório');
  if(!env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))
    throw Error('BLOQUEIO: chave publishable DEV obrigatória');
  if(env.CLOUDFLARE_ACCOUNT_ID!==account||!env.CLOUDFLARE_API_TOKEN)
    throw Error('BLOQUEIO: conta/API token Cloudflare ausente ou inesperado');
  if(env.GITHUB_ACTIONS!=='true' ||
     env.GITHUB_REF_NAME!=='autodev-laboratorio-editavel-2026-11-03' ||
     !env.GITHUB_WORKFLOW_REF?.includes('/homologacao-educart-11-isolada.yml@'))
    throw Error('BLOQUEIO: deploy permitido somente no workflow manual da branch EducART 1.1');
  if(env.EDUCART_HOMOLOG_ACCESS_CONFIRMED!=='protected')
    throw Error('BLOQUEIO: preview precisa de Cloudflare Access previamente configurado');
  if(env.EDUCART_HOMOLOG_DEPLOY_CONFIRMATION!=='EDUCART_11_DEV_APENAS')
    throw Error('BLOQUEIO: falta confirmação explícita de deploy de homologação');
  // Variável GitHub não é prova de proteção real. Testar visitante ANÔNIMO
  // antes de publicar para evitar exposição de dados da prévia.
  const access=spawnSync('node',['scripts/verificar-access-homologacao.mjs'],{
    cwd,env,stdio:'inherit'
  });
  if(access.error)throw access.error;
  if(access.status!==0)
    throw Error('BLOQUEIO: Cloudflare Access não comprovado; deploy impedido');
}
const config={
  name:target,
  main:'./'+folder+'/bundle/index.js',
  compatibility_date:'2026-10-31',
  compatibility_flags:['nodejs_compat'],
  no_bundle:true,
  find_additional_modules:true,
  base_dir:'./'+folder+'/bundle',
  rules:[{type:'ESModule',globs:['**/*.js'],fallthrough:true},{type:'Data',globs:['**/*.json'],fallthrough:true}],
  assets:{
    directory:'./'+folder+'/assets',binding:'ASSETS',
    html_handling:'none',not_found_handling:'none',
    run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*']
  },
  images:{binding:'IMAGES'},workers_dev:true
};
if('route' in config||'routes' in config)throw Error('Rota de produção proibida');
writeFileSync(cfgPath,JSON.stringify(config,null,2)+'\n');
try{
  console.log('EducART 1.1 — Worker isolado: '+target+'; '+(deploy?'HOMOLOGAÇÃO AUTORIZADA':'DRY RUN'));
  const args=['--yes','wrangler@4.149.0','deploy','--config',cfgPath,...(!deploy?['--dry-run']:[])];
  const r=spawnSync('npx',args,{cwd,env,stdio:'inherit'});
  if(r.error)throw r.error;
  if(r.status!==0)process.exitCode=r.status||1;
}finally{unlinkSync(cfgPath);}
