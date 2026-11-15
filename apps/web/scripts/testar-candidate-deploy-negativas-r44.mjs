/** Testa exclusivamente negações anteriores ao publicador, sem rede nem deploy. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

const publicador=resolve('scripts/deploy-11-candidate.mjs');
const fonte=readFileSync(publicador,'utf8');
assert.match(fonte,/name:'educart-11-candidate'/);
assert.doesNotMatch(fonte,/name:'educart-production'/);
assert.doesNotMatch(fonte,/\bkeep_vars\s*:\s*true/);

const temp=mkdtempSync(join(tmpdir(),'educart-deploy-negativas-'));
const base={
  PATH:process.env.PATH||'',
  HOME:temp,
  EDUCART_DEPLOY_TARGET:'staging',
  CLOUDFLARE_ACCOUNT_ID:'8fe5407b4d31f20e19a1388527e365ad',
  NEXT_PUBLIC_SUPABASE_URL:'https://esjrjzyvyhtzwgihcbsc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_somente_teste_sintetico',
};

function rejeitar(sobrescrever,mensagem){
  const resultado=spawnSync(process.execPath,[publicador],{
    cwd:temp,
    env:{...base,...sobrescrever},
    encoding:'utf8',
    timeout:8000,
  });
  assert.equal(resultado.error,undefined,'O subprocesso precisa terminar normalmente');
  assert.notEqual(resultado.status,0,'O publicador deve recusar: '+mensagem);
  assert.match((resultado.stderr||'')+(resultado.stdout||''),mensagem);
}

try {
  // Um diretório sempre vazio impede alcançar npx/wrangler, mesmo com staging correto.
  assert.equal(existsSync(join(temp,'.cloudflare')),false);
  rejeitar({EDUCART_DEPLOY_TARGET:'production'},/Deploy exige EDUCART_DEPLOY_TARGET=staging/);
  rejeitar({CLOUDFLARE_ACCOUNT_ID:'conta-errada'},/Conta Cloudflare nao autorizada/);
  rejeitar({NEXT_PUBLIC_SUPABASE_URL:'https:\/\/outro.example.invalid'},/Somente banco DEV permitido/);
  rejeitar({NEXT_PUBLIC_SUPABASE_ANON_KEY:''},/Cloudflare build artifacts missing/);
  rejeitar({},/Cloudflare build artifacts missing/);
  assert.equal(existsSync(join(temp,'wrangler.autodev.generated.json')),false);
} finally {
  rmSync(temp,{recursive:true,force:true});
}

console.log('PASS: cinco negações locais, sem artefatos, publicação ou rede.');
