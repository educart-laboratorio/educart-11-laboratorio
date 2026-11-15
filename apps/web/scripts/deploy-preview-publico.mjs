/**
 * EducART 1.1 — PREVIEW PÚBLICO, APENAS DEMONSTRAÇÃO LAB.
 * Target FIXO e isolado: educart-11-public-preview, sem custom domains.
 * Zero Trust não é requisito para este Worker de demonstração.
 *
 * Atenção: a chave sb_publishable é pública, RLS DEV rege dados.
 * A equipe deve tratar inscrições nesta URL como dados de teste.
 * Não usar segredos de produção, service_role ou Dados de alunos reais.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const deploy=process.argv.includes('--deploy');
/* R07.1: encerramento de caminhos antigos de publicacao antes de sessao E2E.
 * O dry-run ainda e permitido; nenhuma flag/segredo libera deploy. */
if (deploy) {
  throw Error('R07.1 BLOQUEIO: preview publico 1.1 nao pode ser publicado antes de homologacao.');
}

const target='educart-11-public-preview';
const dev='esjrjzyvyhtzwgihcbsc';
const cloudflare='8fe5407b4d31f20e19a1388527e365ad';
const workspace=process.cwd();
const dir='./.cloudflare/output/v0/workers/default';
const temp=path.resolve(workspace,'wrangler.educart-11-public-preview.generated.json');
const entry=path.join(workspace,dir,'bundle/index.js');
const assets=path.join(workspace,dir,'assets');
if (!fs.existsSync(entry)||!fs.existsSync(assets))throw Error('Build Vinext não encontrado');
if(deploy){
  if(process.env.EDUCART_PREVIEW_PUBLICA!=='AUTORIZADA')throw Error('Ordem de preview público não validada');
  if(process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://'+dev+'.supabase.co')throw Error('Banco selecionado não é database-dev');
  if(!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'))throw Error('Usar somente a publishable key de DEV');
  if(process.env.CLOUDFLARE_ACCOUNT_ID!==cloudflare)throw Error('Conta Cloudflare errada');
  // Este script é exclusivo da versão 1.1. O original deploy-worker.mjs
  // continua intocado e segue apontando a educart-production.
  for(const [file,needle] of [
    ['src/app/admin/page.tsx','<AdminRotinaAcademicaLab />'],
    ['src/app/admin/login/page.tsx','obterPapeisGestao'],
    ['src/lib/admin/autorizar-gestao.ts','equipe_papeis'],
  ]){
    if(!fs.readFileSync(path.resolve(workspace,file),'utf8').includes(needle))
      throw Error('Código não corresponde ao lab 1.1: '+file);
  }
}
const config={
  name:target,
  main:dir+'/bundle/index.js',
  compatibility_date:'2026-10-31',
  compatibility_flags:['nodejs_compat'],
  no_bundle:true,find_additional_modules:true,
  base_dir:dir+'/bundle',
  rules:[{type:'ESModule',globs:['**/*.js'],fallthrough:true},{type:'Data',globs:['**/*.json'],fallthrough:true}],
  assets:{
    directory:dir+'/assets',binding:'ASSETS',
    html_handling:'none',not_found_handling:'none',
    run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*'],
  },
  images:{binding:'IMAGES'},workers_dev:true,
};
if(config.name!=='educart-11-public-preview'||'routes' in config||'route' in config)throw Error('Mudança de Worker/rota proibida');
fs.writeFileSync(temp,JSON.stringify(config,null,2));
try{
  console.log('EducART 1.1 — '+(deploy?'DEPLOY PUBLICO DEV AUTORIZADO':'DRY-RUN')+' no Worker '+target);
  const args=['--yes','wrangler@4.149.0','deploy','--config',temp];
  if(!deploy)args.push('--dry-run');
  const result=spawnSync('npx',args,{cwd:workspace,env:process.env,stdio:'inherit'});
  if(result.error)throw result.error;
  if(result.status!==0)process.exitCode=result.status||1;
}finally{fs.rmSync(temp,{force:true});}
