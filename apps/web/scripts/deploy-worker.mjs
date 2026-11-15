
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const dryRun = process.argv.includes('--dry-run');
/* R07.1: a branch laboratório não pode publicar o Worker da EducART 1.0.
 * Nenhum token ou variável de ambiente libera este código sem uma nova revisão.
 * A versão de produção em main NÃO é modificada por esta alteração. */
if (!dryRun) {
  throw new Error('R07.1 BLOQUEIO: publicar educart-production a partir do laboratorio e proibido.');
}

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
const config = {
  name:'educart-production',
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
  keep_vars:true,
  workers_dev:true
};
const temp=path.join(workspace,'wrangler.autodev.generated.json');
fs.writeFileSync(temp,JSON.stringify(config,null,2));
console.log('AutoDEV: ' +(dryRun?'dry-run':'deploy')+' for EducART Worker; remote variables preserved');
const args=['--yes','wrangler@4.149.0','deploy','--config',temp];
if(dryRun)args.push('--dry-run');
const res=spawnSync('npx',args,{cwd:workspace,env:process.env,stdio:'inherit'});
fs.rmSync(temp,{force:true});
if(res.error)throw res.error;
if(res.status!==0)process.exit(res.status||1);
