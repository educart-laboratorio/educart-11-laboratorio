// Publicador EXCLUSIVO do domínio oficial, por ordem expressa da Direção em 15/11/2026.
// Mantém a versão antiga recuperável via histórico Cloudflare; aponta o Worker oficial à candidata 1.1, com Supabase DEV autorizado.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const dryRun = process.argv.includes('--dry-run');
/* EducART 1.1: esta acao altera explicitamente o Worker de producao, sem mudar rotas ou DNS. */
if (!dryRun && process.env.EDUCART_DEPLOY_TARGET !== 'official-user-authorized') {
  throw new Error('Deploy oficial não foi autorizado pelo ambiente');
}
if (!dryRun && process.env.CLOUDFLARE_ACCOUNT_ID !== '8fe5407b4d31f20e19a1388527e365ad') {
  throw new Error('Conta Cloudflare nao autorizada');
}
if (!dryRun && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://esjrjzyvyhtzwgihcbsc.supabase.co') {
  throw new Error('Somente banco DEV permitido');
}

if (!dryRun && process.env.EDUCART_OFFICIAL_CUTOVER_CONFIRM !== 'PUBLICAR-1.1-EDUCART.PRO') { throw new Error('Confirmação oficial ausente'); }
const workspace = process.cwd();
const output = path.join(workspace, '.cloudflare/output/v0/workers/default');
if (!fs.existsSync(path.join(output, 'bundle/index.js')) || !fs.existsSync(path.join(output, 'assets'))) {
  throw new Error('Cloudflare build artifacts missing; run npm run build:vinext first');
}
if (!dryRun && (
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')
)) {
  throw new Error('Public Supabase build variables missing: refusing deploy');
}
// R45: defesa adicional do publicador. Não substitui a aprovação do environment
// nem autentica criptograficamente o executor: confere apenas origem declarada.
if (!dryRun) {
  const branch='secretaria-11-candidate-online-20261115';
  const sha=process.env.WORKERS_CI_COMMIT_SHA || '';
  if (process.env.GITHUB_REPOSITORY !== 'educart-laboratorio/educart-11-laboratorio' ||
      process.env.WORKERS_CI !== '1' ||
      process.env.WORKERS_CI_BRANCH !== branch ||
      !/^[0-9a-f]{40}$/.test(sha) ||
      process.env.GITHUB_ACTIONS !== 'true' ||
      process.env.GITHUB_REF_NAME !== branch ||
      process.env.GITHUB_SHA !== sha ||
      !['workflow_dispatch','push'].includes(process.env.GITHUB_EVENT_NAME || '')) {
    throw new Error('Candidata: origem de publicacao nao autorizada');
  }
}
const config = {
  name:'educart-production',
  account_id:'8fe5407b4d31f20e19a1388527e365ad',
  main:'./.cloudflare/output/v0/workers/default/bundle/index.js',
  compatibility_date:'2026-10-31',
  compatibility_flags:['nodejs_compat'],
  no_bundle:true,
  find_additional_modules:true,
  base_dir:'./.cloudflare/output/v0/workers/default/bundle',
  rules:[
    {type:'ESModule',globs:['**/*.js'],fallthrough:true},
    {type:'Data',globs:['**/*.json'],fallthrough:true}
  ],
  assets:{
    directory:'./.cloudflare/output/v0/workers/default/assets',
    binding:'ASSETS',
    html_handling:'none',
    not_found_handling:'none',
    run_worker_first:['/*','!/_next/static/*','!/*/_next/static/*']
  },
  images:{binding:'IMAGES'},
  workers_dev:true,
  // O domínio oficial já está conectado ao Worker production; todas as rotas privadas
  // devem passar pela portaria R07 e exigir Auth/RBAC no servidor.
  vars:{
    EDUCART_PRIVATE_PREVIEW_MODE:'required',
    NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  }
};
const temp=path.join(workspace,'wrangler.autodev.prod11.generated.json');
fs.writeFileSync(temp,JSON.stringify(config,null,2));
console.log('AutoDEV: ' +(dryRun?'dry-run':'deploy')+' EducART 1.1 on existing official Worker; no DNS or route changes');
const args=['--yes','wrangler@4.149.0','deploy','--config',temp];
if(dryRun)args.push('--dry-run');
try {
  const res=spawnSync('npx',args,{cwd:workspace,env:process.env,stdio:'inherit'});
  if(res.error)throw res.error;
  if(res.status!==0)process.exitCode=res.status||1;
} finally {
  fs.rmSync(temp,{force:true});
}
