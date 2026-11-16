import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

// Navegacao publica, sem autenticacao, envio de formularios ou escrita de dados.
const base = new URL(process.env.AUDIT_BASE_URL || 'https://educart.pro');
const output = path.resolve('artifacts');
const modes = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];
const routeSeeds = [
  '/', '/formacao', '/inscricao', '/cadastro', '/criar',
  '/inscricao-previa', '/niveis-demo', '/admin', '/admin/login',
  '/minha-educart/login'
];
const maxRoutes = 24;
const routeQueue = [...routeSeeds];
const knownRoutes = new Set(routeSeeds);
const records = [];
const failures = [];
await fs.mkdir(output, { recursive: true });

function safeRoute(value) {
  try {
    const url = new URL(value, base);
    if (url.origin !== base.origin) return null;
    const p = decodeURIComponent(url.pathname);
    if (!p.startsWith('/') || p.length > 180) return null;
    if (/^\/(api|_next|documentos|logout|sair|auth|admin\/(?!login)|minha-educart\/(?!login))/i.test(p)) return null;
    if (/\.(pdf|jpg|jpeg|png|webp|svg|json|xml|txt|zip)$/i.test(p)) return null;
    return p.replace(/\/+$/, '') || '/';
  } catch {
    return null;
  }
}
function fileStem(route, mode) {
  const slug = (route === '/' ? 'inicio' : route.replace(/^\//, '').replace(/[^a-z0-9_-]+/gi, '-')).slice(0, 55);
  return mode + '-' + slug;
}
async function homeTriage(page, mode) {
  const trail = [];
  const steps = [
    ['abertura', 'button.eg-tap'],
    ['interesses', 'button.eg-area-on'],
    ['objetivo', 'button.eg-choice'],
    ['idade', 'button.eg-choice'],
    ['experiencia', 'button.eg-choice'],
  ];
  for (const [stage, selector] of steps) {
    const bg = page.locator('.eg-backdrop');
    const box = await bg.boundingBox().catch(() => null);
    trail.push({ stage, backdrop: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null });
    await page.screenshot({ path: path.join(output, fileStem('/triagem-' + stage, mode) + '.png'), fullPage: false }).catch(() => {});
    const action = page.locator(selector).first();
    if (!(await action.isVisible().catch(() => false))) break;
    await action.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(450);
    if (new URL(page.url()).pathname !== '/') break;
  }
  const heights = trail.map(t => t.backdrop?.height).filter(Number.isFinite);
  return {
    trail,
    backdropHeightVariation: heights.length > 1 ? Math.round(Math.max(...heights) - Math.min(...heights)) : null,
  };
}

const browser = await chromium.launch({ headless: true });
try {
  for (const mode of modes) {
    const context = await browser.newContext({
      viewport: { width: mode.width, height: mode.height },
      locale: 'pt-BR',
      colorScheme: 'light',
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const visited = new Set();
    for (let index = 0; index < routeQueue.length && visited.size < maxRoutes; index++) {
      const route = safeRoute(routeQueue[index]);
      if (!route || visited.has(route)) continue;
      visited.add(route);
      const page = await context.newPage();
      let consoleErrorCount = 0;
      let scriptErrorCount = 0;
      let requestFailureCount = 0;
      page.on('console', m => { if (m.type() === 'error') consoleErrorCount++; });
      page.on('pageerror', () => { scriptErrorCount++; });
      page.on('requestfailed', () => { requestFailureCount++; });
      const row = { viewport: mode.name, route, status: null, finalRoute: '', titlePresent: false, h1Count: 0, missingImageCount: 0, overflowPx: 0, unnamedButtons: 0, axeViolations: [], errors: [] };
      try {
        const response = await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        row.status = response?.status() ?? null;
        row.finalRoute = new URL(page.url()).pathname;
        await page.waitForTimeout(650);
        const facts = await page.evaluate(() => {
          const root = document.scrollingElement || document.documentElement;
          const imgs = [...document.querySelectorAll('img')];
          const buttons = [...document.querySelectorAll('button')];
          return {
            titlePresent: Boolean(document.title.trim()),
            h1Count: document.querySelectorAll('h1').length,
            missingImageCount: imgs.filter(i => i.complete && i.naturalWidth === 0).length,
            overflowPx: Math.max(0, Math.ceil(root.scrollWidth - window.innerWidth)),
            unnamedButtons: buttons.filter(b => !(b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent || '').trim()).length,
            links: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean),
          };
        });
        Object.assign(row, { titlePresent: facts.titlePresent, h1Count: facts.h1Count, missingImageCount: facts.missingImageCount, overflowPx: facts.overflowPx, unnamedButtons: facts.unnamedButtons });
        // Auditoria complementar de SEO, sem coletar dados pessoais.
        row.seo = await page.evaluate(() => ({
          title: document.title || '',
          description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
          ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
          robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
          lang: document.documentElement.lang || '',
          headings: [...document.querySelectorAll('h1')].map(el => (el.textContent || '').trim().slice(0,110)),
          imagesWithoutAlt: [...document.images].filter(img => !img.hasAttribute('alt')).length,
        }));

        for (const href of facts.links) {
          const next = safeRoute(href);
          if (next && !knownRoutes.has(next) && knownRoutes.size < maxRoutes) {
            knownRoutes.add(next);
            routeQueue.push(next);
          }
        }
        if (!/^\/(admin|admin\/login|inscricao-previa)$/.test(route)) {
          try {
            const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
            row.axeViolations = axe.violations.map(v => ({ id: v.id, impact: v.impact, affectedNodes: v.nodes.length }));
          } catch {
            row.errors.push('Axe nao concluiu a verificacao nesta rota');
          }
        }
        await page.screenshot({ path: path.join(output, fileStem(route, mode.name) + '.png'), fullPage: true, animations: 'disabled' });
        if (route === '/') row.homeTriage = await homeTriage(page, mode.name);
        if (row.status >= 500) failures.push(mode.name + ' ' + route + ': HTTP ' + row.status);
        if (row.overflowPx > 3) row.errors.push('Risco de scroll horizontal: ' + row.overflowPx + 'px');
      } catch (error) {
        row.errors.push('Navegacao/inspecao nao concluida: ' + String(error?.message || error).slice(0, 180));
        failures.push(mode.name + ' ' + route + ': falha de navegacao');
      }
      row.consoleErrorCount = consoleErrorCount;
      row.scriptErrorCount = scriptErrorCount;
      row.requestFailureCount = requestFailureCount;
      records.push(row);
      console.log(JSON.stringify({ viewport: row.viewport, route: row.route, status: row.status, overflowPx: row.overflowPx, axe: row.axeViolations.length, errors: row.errors.length }));
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
// Amostra HTTP de publicacao, SEO e cabecalhos — apenas GET; sem login ou escrita.
const httpChecks = [];
for (const route of ['/', '/formacao', '/inscricao', '/cadastro', '/criar',
  '/admin', '/admin/login', '/minha-educart/login', '/niveis-demo',
  '/matricula-demo', '/robots.txt', '/sitemap.xml', '/favicon.ico']) {
  const probe = {route, status: null, headers: {}, error: null};
  try {
    const response = await fetch(new URL(route, base), {method:'GET', redirect:'manual', signal:AbortSignal.timeout(12000)});
    probe.status = response.status;
    probe.headers = {
      contentType:response.headers.get('content-type'),
      cacheControl:response.headers.get('cache-control'),
      xRobotsTag:response.headers.get('x-robots-tag'),
      strictTransportSecurity:response.headers.get('strict-transport-security'),
      contentSecurityPolicy:response.headers.get('content-security-policy'),
      xContentTypeOptions:response.headers.get('x-content-type-options'),
      referrerPolicy:response.headers.get('referrer-policy'),
      permissionsPolicy:response.headers.get('permissions-policy'),
      location:response.headers.get('location'),
    };
  } catch(error) { probe.error = String(error?.message||error).slice(0,100); }
  httpChecks.push(probe);
}

const report = {
  auditedAt: new Date().toISOString(),
  target: base.origin,
  type: 'browser-public-read-only',
  sourceCommit: process.env.GITHUB_SHA || null,
  modes,
  failures,
  httpChecks,
  results: records,
  limitations: [
    'Nao demonstra SHA em producao; exige verificacao de deploy.',
    'Nao autentica usuario nem valida dados privados, pagamento, login ou RLS.',
    'Nao envia formularios; jornada final exige ambiente isolado.',
    'Achados automatizados precisam de revisao visual humana.'
  ],
};
await fs.writeFile(path.join(output, 'relatorio.json'), JSON.stringify(report, null, 2));
const lines = [
  '# EducART.pro — varredura publica automatizada',
  '',
  'Alvo: ' + base.origin + ' | paginas/variantes: ' + records.length + ' | falhas graves: ' + failures.length,
  '',
  '| Tela | Rota | HTTP | Overflow | Axe | JS erros | Observacoes |',
  '|---|---|---:|---:|---:|---:|---|',
  ...records.map(r => '| ' + r.viewport + ' | ' + r.route + ' | ' + (r.status ?? '-') + ' | ' + r.overflowPx + 'px | ' + r.axeViolations.length + ' | ' + r.scriptErrorCount + ' | ' + (r.errors.join('; ') || '—') + ' |'),
  '',
  '## Metadados e links canônicos por rota',
  '| Tela | Rota | Canônico | Descrição | Imagens sem ALT |',
  '|---|---|---|---|---:|',
  ...records.map(r => '| '+r.viewport+' | '+r.route+' | '+(r.seo?.canonical||'—')+' | '+(r.seo?.description?'presente':'ausente')+' | '+(r.seo?.imagesWithoutAlt??'—')+' |'),
  '',
  '## Respostas HTTP e cabecalhos',
  '| Rota | HTTP | CSP | HSTS | Robots |',
  '|---|---:|---|---|---|',
  ...httpChecks.map(r => '| '+r.route+' | '+(r.status??'—')+' | '+(r.headers?.contentSecurityPolicy?'sim':'não')+' | '+(r.headers?.strictTransportSecurity?'sim':'não')+' | '+(r.headers?.xRobotsTag||'—')+' |'),
  '',
  'Limites: sem login, sem envio, sem acesso privado, sem comprovacao do SHA publicado. Conferir capturas e relatorio.json.'
];
await fs.writeFile(path.join(output, 'RESUMO.md'), lines.join('\n'));
if (failures.length) process.exitCode = 1;
