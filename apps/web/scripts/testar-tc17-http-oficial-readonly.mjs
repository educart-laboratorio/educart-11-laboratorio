// TC17: verificação anônima somente leitura no domínio real. Nenhum login,
// cookie persistido, header Authorization, POST, banco ou operação Cloudflare.
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const cases = [
  { host: 'https://educart.pro', route: '/', kind: 'public' },
  { host: 'https://educart.pro', route: '/formacao', kind: 'public' },
  { host: 'https://educart.pro', route: '/inscricao', kind: 'public' },
  { host: 'https://educart.pro', route: '/admin/login', kind: 'login' },
  { host: 'https://educart.pro', route: '/admin', kind: 'private' },
  { host: 'https://educart.pro', route: '/robots.txt', kind: 'public' },
  { host: 'https://www.educart.pro', route: '/', kind: 'alias' },
  { host: 'https://www.educart.pro', route: '/admin/login', kind: 'alias-login' },
  { host: 'https://educart-11-candidate.educartsuporte.workers.dev', route: '/admin', kind: 'private-candidate' }
];
const data = [];
let failures = 0;
const headers = { 'accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5', 'user-agent': 'EducART-SUPER-GSI-TC17-readonly/1.0' };
for (const item of cases) {
  const target = item.host + item.route;
  try {
    const response = await fetch(target, {
      method: 'GET', redirect: 'manual', credentials: 'omit',
      cache: 'no-store', headers,
      signal: AbortSignal.timeout(18000),
    });
    const status = response.status;
    const location = response.headers.get('location');
    // Não baixar nem guardar HTML administrativo, cookies, corpo de páginas,
    // informação de sessão, e-mail ou token. Resumo só de cabeçalhos públicos.
    const d = {
      target, kind: item.kind, status,
      contentType: response.headers.get('content-type'),
      locationPath: location ? (() => {
        try {const u = new URL(location, target); return u.origin === new URL(target).origin ? u.pathname : '[outside-origin]';}
        catch {return '[invalid-location]';}
      })() : null,
      cacheControl: response.headers.get('cache-control'),
      robots: response.headers.get('x-robots-tag'),
      xFrameOptions: response.headers.get('x-frame-options'),
      csp: response.headers.get('content-security-policy')?.slice(0,300) ?? null,
      nosniff: response.headers.get('x-content-type-options'),
      hsts: response.headers.get('strict-transport-security'),
    };
    const redirect = [301,302,303,307,308].includes(status);
    d.findings = [];
    if (item.kind === 'public' && status !== 200 && !redirect) d.findings.push('PUBLIC_UNAVAILABLE');
    if (item.kind === 'login' && status !== 200) d.findings.push('LOGIN_UNAVAILABLE');
    if (item.kind === 'private' && status === 503) d.findings.push('SECRETARIA_UNAVAILABLE');
    if (item.kind.startsWith('private') && status === 200) d.findings.push('PRIVATE_ROUTE_RETURNED_200_ANON_VERIFY_CONTENT');
    if (item.kind === 'private' && ![401,403,303,307,308].includes(status)) d.findings.push('PRIVATE_ROUTE_NOT_AUTH_GATED');
    if (item.kind === 'login' && status === 200 && !/no-store|no-cache|private/.test(d.cacheControl??'')) d.findings.push('LOGIN_CACHE_POLICY_MISSING');
    if (item.kind === 'login' && status === 200 && !/noindex/i.test(d.robots??'')) d.findings.push('LOGIN_NOINDEX_HEADER_MISSING');
    if (['LOGIN_UNAVAILABLE','PUBLIC_UNAVAILABLE','PRIVATE_ROUTE_RETURNED_200_ANON_VERIFY_CONTENT','PRIVATE_ROUTE_NOT_AUTH_GATED'].some(x=>d.findings.includes(x))) failures++;
    data.push(d);
    console.log('TC17 '+JSON.stringify(d));
  } catch (e) {
    failures++;
    const d={ target, kind: item.kind, error: String(e?.name ?? 'RequestError')+': '+String(e?.message ?? e).slice(0,160) };
    data.push(d);
    console.log('TC17 ERROR '+JSON.stringify(d));
  }
}
mkdirSync('tc17-artifacts',{recursive:true});
writeFileSync('tc17-artifacts/probe-publico.json',JSON.stringify({
  observedAt: new Date().toISOString(),
  workflowHead: process.env.GITHUB_SHA || '(local)',
  userDataAccessed: false, writes: 0, cases:data, criticalFindings:failures,
},null,2));
assert.equal(data.length,cases.length);
console.log('TC17 RESULT: '+data.length+' GETs sem login, '+failures+' alertas bloqueantes. Arquivo público sanitizado.');
if(failures)process.exitCode=1;