// SUPER GSI TC-01/03 — negativos do publicador oficial, sempre sem deploy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const source = fs.readFileSync('scripts/deploy-11-official-user-authorized.mjs', 'utf8');
const prod = 'https://doygnsubiitencoyzjzk.supabase.co';
const dev = 'https://esjrjzyvyhtzwgihcbsc.supabase.co';
assert(source.includes("EDUCART_OFFICIAL_11_MODE:'required'"), 'Portaria oficial ausente das vars do Worker');
assert(source.includes("EDUCART_PROD_RBAC_HOMOLOGADO"), 'Portao RBAC PROD ausente');
assert(source.includes("EDUCART_PROD_INSCRICOES_HOMOLOGADAS"), 'Portao de inscricoes PROD ausente');
assert(!source.includes("NEXT_PUBLIC_SUPABASE_URL !== 'https://esjrjzyvyhtzwgihcbsc.supabase.co'"), 'Publicador oficial ainda aceita DEV como destino');
assert(source.includes("NEXT_PUBLIC_SUPABASE_URL !== '"+prod+"'"), 'Publicador oficial nao exige banco PROD');

function negativo(nome, envOverride, expected) {
  const env = {
    ...process.env,
    EDUCART_DEPLOY_TARGET: 'official-user-authorized',
    CLOUDFLARE_ACCOUNT_ID: '8fe5407b4d31f20e19a1388527e365ad',
    NEXT_PUBLIC_SUPABASE_URL: prod,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_test_placeholder',
    EDUCART_OFFICIAL_11_MODE: 'required',
    EDUCART_PROD_RBAC_HOMOLOGADO: 'sim',
    EDUCART_PROD_INSCRICOES_HOMOLOGADAS: 'sim',
    EDUCART_OFFICIAL_CUTOVER_CONFIRM: 'PUBLICAR-1.1-EDUCART.PRO',
    ...envOverride
  };
  // Nao cria o artefato Worker. Todos os negativos devem falhar ANTES de invocar npx/Cloudflare.
  const result = spawnSync(process.execPath, ['scripts/deploy-11-official-user-authorized.mjs'], {
    cwd: process.cwd(), encoding: 'utf8', env, timeout: 10000
  });
  assert.notEqual(result.status, 0, nome+' deveria negar a publicacao');
  const combined = (result.stdout||'')+(result.stderr||'');
  assert(combined.includes(expected), nome+' deveria ter erro '+expected+'; recebeu '+combined.slice(-550));
  assert(!combined.includes('AutoDEV: deploy'), nome+' nao pode chegar ao deploy');
  console.log('PASS NEGATIVO '+nome);
}
negativo('DEV proibido', {NEXT_PUBLIC_SUPABASE_URL:dev}, 'Supabase PROD');
negativo('portaria ausente', {EDUCART_OFFICIAL_11_MODE:'off'}, 'portaria oficial');
negativo('RBAC nao aprovado', {EDUCART_PROD_RBAC_HOMOLOGADO:'nao'}, 'RBAC e inscricoes PROD');
negativo('inscricoes nao aprovadas', {EDUCART_PROD_INSCRICOES_HOMOLOGADAS:'nao'}, 'RBAC e inscricoes PROD');
negativo('confirmacao ausente', {EDUCART_OFFICIAL_CUTOVER_CONFIRM:''}, 'Confirmação oficial ausente');
negativo('artefatos ausentes', {}, 'Cloudflare build artifacts missing');
console.log('TC-01/03: 6 negativos de publicacao sem deploy e guardas de runtime consistentes.');
