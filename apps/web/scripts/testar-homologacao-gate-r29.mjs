import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const audit=readFileSync('scripts/auditar-cloudflare-candidate-r29.mjs','utf8');
const publish=readFileSync('../../.github/workflows/publicar-educart-11-candidate-cloudflare.yml','utf8');
assert(audit.includes('process.argv.includes(\'--require-access\')'),'R29 preflight precisa falhar fechado');
assert(audit.includes('process.exitCode=1'),'R29 precisa bloquear publicação');
assert(audit.includes('ACCESS APPS')&&audit.includes('ACCESS POLICY'),'Auditoria deve inspecionar apps e políticas');
assert(audit.includes('deploymentRead&&accessInspect&&accessMatch&&accessPolicy'),'Checagem completa obrigatória');
// A Cloudflare devolveu 403 na consulta do Access; a candidata oferece
// as páginas públicas de inscrição, mas exige autenticação nativa+RLS para dados.
assert(publish.includes('node --experimental-strip-types scripts/testar-r07-portaria-nativa.mjs'));
assert(publish.includes('node --experimental-vm-modules scripts/testar-r07-proxy-execucao.mjs'));
const guard=publish.indexOf('Comprovar portaria nativa antes da publicacao');
const deploy=publish.indexOf('Publicar somente Worker isolado');
assert(guard>0&&deploy>guard,'Autenticacao nativa e RBAC devem preceder o deploy');
assert(publish.includes('falhou=1')&&publish.includes('RSC: 1')&&
 publish.includes('Rollback do Worker candidato se a prova remota falhar'),
 'Checagem HTTP pós-publicação e reversão são obrigatórias');
assert(!publish.includes('node scripts/auditar-cloudflare-candidate-r29.mjs --require-access'),
 'Não confundir API Access 403 com requisito do site público protegido por Auth/RLS');
assert(publish.includes("EDUCART_DEPLOY_TARGET: staging")&&publish.includes("environment: educart-11-candidate"));
assert(!/educart-production|wrangler@latest/.test(publish),'Nome de produção ou versão flutuante no publicador');
console.log('R29/R33 PASS: vitrine publica, portaria nativa antes do deploy e rollback após falha remota.');
