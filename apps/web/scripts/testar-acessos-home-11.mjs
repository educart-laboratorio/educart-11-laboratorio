/** EducART 1.1 — acessos discretos na home sem alterar arquivos LIPE. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const ler = p => readFileSync(p, 'utf8');
const template = ler('src/app/template.tsx');
const css = ler('src/app/acessos-home.css');
const home = ler('src/app/page.tsx');
const entrada = ler('src/components/EntradaEducart.tsx');
const policy = ler('src/lib/security/preview-native-policy.ts');
const loginAdmin = ler('src/app/admin/login/page.tsx');
const loginCliente = ler('src/app/minha-educart/login/page.tsx');
const manifesto = JSON.parse(ler('../../AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json'));
const hashBlob = bytes => createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
for (const info of manifesto.protectedPublicFiles) {
  if (!['apps/web/src/app/page.tsx','apps/web/src/components/EntradaEducart.tsx'].includes(info.path)) continue;
  const atual = readFileSync('../../' + info.path);
  assert.equal(hashBlob(atual),info.gitBlobSha, 'Home original alterada sem LIPE: '+info.path);
}
assert(home.includes('<EntradaEducart />'),'Jornada original da home preservada');
assert(entrada.includes('data-educart-etapa={etapa}'),'Etapas originais intactas');
assert(template.includes("pathname === '/'"),'Atalhos somente na home');
assert(template.includes('{children}'),'Roteamento original deve continuar');
assert(template.includes('usePathname'),'Detecção explícita da rota');
assert.match(template, /href="\/admin\/login"/);
assert.match(template, /href="\/minha-educart\/login"/);
assert.match(template, /Painel Administrativo/);
assert.match(template, /Minha EducART/);
assert.match(template, /Por convite · em testes/);
assert(!/\.rpc\(|supabase|auth\.signIn|localStorage|window\.location/.test(template),
  'Atalhos não podem autenticar, conceder acesso nem alterar dados');
assert(loginAdmin.includes('obterPapeisGestao'),'Login administrativo RBAC permanece ativo');
assert(loginCliente.includes('convite'),'Minha EducART exige convite');
assert(policy.includes("pathname === '/admin/login'"),'Portaria privada original preservada');
assert(css.includes('position: fixed')&&css.includes('z-index: 30'),'Acessos visíveis sem reestruturar a home');
assert(css.includes('max-width: 480px'),'Responsividade mínima');
assert(css.includes('focus-visible')&&css.includes('forced-colors'),'Acessibilidade dos botões');
console.log('HOME ACESSOS PASS: Painel e Minha EducART por convite, topo responsivo, 1.0 LIPE intacta, sem deploy.');
