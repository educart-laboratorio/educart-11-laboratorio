// SUPER GSI / TC-10: auditoria axe-core real em Chromium, sem credenciais e sem POST.
// Cada violacao informa severidade, criterio WCAG, pagina e seletores envolvidos.
// Relatorio em JSON para diffs entre execucoes; zero dados academicos.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';
import axe from 'axe-core';

const base = process.env.TC10_BASE_URL || 'http://127.0.0.1:3001';
const rotas = ['/', '/formacao', '/inscricao', '/niveis-demo', '/admin/login'];
const larguras = [390, 1440];
const etiquetas = ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'];
const resultado = [];
const browser = await chromium.launch({ headless: true });
const summarized = [];

try {
  for (const largura of larguras) {
    const context = await browser.newContext({ viewport: { width: largura, height: 850 } });
    for (const rota of rotas) {
      const page = await context.newPage();
      try {
        const response = await page.goto(new URL(rota, base).toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
        const status = response?.status() ?? 0;
        assert.equal(status, 200, 'Resposta HTTP inesperada em ' + rota + ': ' + status);
        await page.locator('body').waitFor({ state: 'visible' });
        await page.waitForTimeout(250); // hidratar e aguardar foco/layout inicial
        const scan = async (estado) => {
          await page.addScriptTag({ content: axe.source });
          const outcome = await page.evaluate(async tags =>
            // @ts-ignore: script injection supplies axe
            await window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), etiquetas);
          const violations = outcome.violations.map(v => ({
            id: v.id, impact: v.impact, help: v.help, tags: v.tags,
            nodes: v.nodes.map(n => ({ target: n.target, failureSummary: n.failureSummary })).slice(0, 20)
          }));
          const caseName = rota + ' ' + largura + 'px ' + estado;
          resultado.push({ caseName, status, violations, incomplete: outcome.incomplete.map(v => v.id) });
          summarized.push({ caseName, total: violations.length,
            critical: violations.filter(v=>v.impact==='critical').length,
            serious: violations.filter(v=>v.impact==='serious').length,
            moderate: violations.filter(v=>v.impact==='moderate').length,
            minor: violations.filter(v=>v.impact==='minor').length
          });
          for(const v of violations)console.log('AXE '+caseName+' '+v.impact+' '+v.id+' nodes='+v.nodes.length+' target='+JSON.stringify(v.nodes[0]?.target||[]));
        };
        await scan('inicial');
        if(rota==='/' || rota==='/inscricao'){
          const btn=page.getByRole('button',{name:/Abrir menu de acessibilidade/i});
          await btn.click();
          await page.getByRole('dialog',{name:/Acessibilidade/i}).waitFor({state:'visible'});
          await scan('modal-acessibilidade');
        }
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}
fs.mkdirSync('tc10-artifacts', { recursive: true });
fs.writeFileSync('tc10-artifacts/axe-relatorio.json',JSON.stringify({generatedAt:new Date().toISOString(),tags:etiquetas,summary:summarized,cases:resultado},null,2));
console.log('TC10: '+resultado.length+' estados auditados, '+resultado.reduce((a,c)=>a+c.violations.length,0)+' violacoes WCAG, zero POST.');
const severos=resultado.flatMap(c=>c.violations.filter(v=>v.impact==='serious'||v.impact==='critical'));
if(severos.length) {
  console.error('TC10 BLOQUEIO: '+severos.length+' violacoes graves encontradas; conferir artifact axe-relatorio.json antes de aprovar.');
  process.exitCode=1;
}
