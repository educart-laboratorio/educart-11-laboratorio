/** R05 LIPE: testar verificacao real de Access sem consultar a rede. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {redirecionaParaAccess, URL_PRIVADA, verificarAccess} from './verificar-access-homologacao.mjs';

assert.equal(URL_PRIVADA, 'https://educart-11-homologacao.educartsuporte.workers.dev/');
assert.equal(redirecionaParaAccess(302,
 'https://educart-homolog.cloudflareaccess.com/cdn-cgi/access/login/foo'), true);
assert.equal(redirecionaParaAccess(302,
 '/cdn-cgi/access/login?redirect_url=%2F'), true);
assert.equal(redirecionaParaAccess(200, null), false);
assert.equal(redirecionaParaAccess(403, null), false);
assert.equal(redirecionaParaAccess(404, null), false);
assert.equal(redirecionaParaAccess(302, 'https://evil.example.com/admin/login'), false);
assert.equal(redirecionaParaAccess(302, '/admin/login'), false);
assert.equal(redirecionaParaAccess(302, 'http://educart-homolog.cloudflareaccess.com/cdn-cgi/access/login'), false);
assert.equal(redirecionaParaAccess(302, 'https://cloudflareaccess.com/cdn-cgi/access/login'), false);

const mock = (status, location) => async () =>
  new Response('', {status, headers: location ? {location} : {}});
await verificarAccess(mock(302,
 'https://educart-homolog.cloudflareaccess.com/cdn-cgi/access/login/foo'));
await assert.rejects(
  () => verificarAccess(mock(200, null)),
  /Access não comprovado/);
await assert.rejects(
  () => verificarAccess(mock(302, 'https://evil.example.org/foo')),
  /Access não comprovado/);

const runner = readFileSync('scripts/preparar-homologacao-cloudflare.mjs','utf8');
const ci = readFileSync('../../.github/workflows/validar-inscricao-responsiva-lab.yml','utf8');
const manual = readFileSync('../../.github/workflows/homologacao-educart-11-isolada.yml','utf8');
assert(runner.includes('verificar-access-homologacao.mjs'));
assert(runner.includes("EDUCART_HOMOLOG_ACCESS_CONFIRMED"));
assert(runner.includes("if(deploy){"));
assert(ci.includes('testar-r05-access-homologacao.mjs'));
assert(manual.includes('testar-r05-access-homologacao.mjs'));
assert(manual.includes("inputs.etapa == 'deploy'"));
assert(!runner.includes("'educart-production',\n  main:"));
console.log('R05 OK: redirecionamento Access obrigatório; publicações sem Access são negadas.');
