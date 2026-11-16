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
const erros = [];

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
        await page.waitForLoadState('load', { timeout: 16000 });
        await page.waitForTimeout(850); // hidratação real no Vinext DEV
        await page.addScriptTag({ content: axe.source });
        const scan = async (estado) => {
          // Uma única injeção por documento: modais reutilizam a mesma instância axe.
          const outcome = await page.evaluate(async tags =>
            // @ts-ignore: script injection supplies axe
            await window.axe.run(document, { runOnly: { type: 'tag', values: tags } }), etiquetas);
          const violations = outcome.violations.map(v => ({
            id: v.id, impact: v.impact, help: v.help, tags: v.tags,
            nodes: v.nodes.map(n => ({ target: n.target, html: n.html?.slice(0, 900), failureSummary: n.failureSummary })).slice(0, 20)
          }));
          const caseName = rota + ' ' + largura + 'px ' + estado;
          resultado.push({ caseName, status, violations, incomplete: outcome.incomplete.map(v => v.id) });
          summarized.push({ caseName, total: violations.length,
            critical: violations.filter(v=>v.impact==='critical').length,
            serious: violations.filter(v=>v.impact==='serious').length,
            moderate: violations.filter(v=>v.impact==='moderate').length,
            minor: violations.filter(v=>v.impact==='minor').length
          });
          for(const v of violations)console.log('AXE '+caseName+' '+v.impact+' '+v.id+' nodes='+v.nodes.length+' targets='+JSON.stringify(v.nodes.slice(0,10).map(n=>({selector:n.target,html:n.html?.slice(0,240)}))));
        };
        await scan('inicial');
        if(rota==='/' || rota==='/inscricao'){
          const btn=page.locator('.a11y-floating-trigger');
          const panel=page.locator('#educart-a11y-dialog');
          await btn.click();
          try { await panel.waitFor({state:'visible',timeout:5000}); }
          catch (firstError) {
            // O HTML inicial pode chegar antes do React hidratar; reenviar apenas
            // se aria-expanded mostrar que a primeira interacao foi ignorada.
            if(await btn.getAttribute('aria-expanded')==='true') throw firstError;
            await page.waitForTimeout(700);
            await btn.click();
            await panel.waitFor({state:'visible',timeout:6500});
          }
          await scan('modal-acessibilidade');
          // Verificação funcional: Escape devolve o foco ao acionador e fecha
          // a janela. A auditoria por contraste não comprova isso sozinha.
          await page.keyboard.press('Escape');
          await panel.waitFor({state:'hidden',timeout:5000});
          assert.equal(await btn.evaluate(el=>document.activeElement===el),true,
            'Escape não devolveu foco ao botão de acessibilidade em '+rota);
        }
        if(rota==='/'){
          await page.getByRole('button',{name:/Toque para começar/}).click();
          await page.locator('[data-educart-etapa="interesses"]').waitFor({state:'visible'});
          await scan('triagem-interesses');
          await page.locator('.eg-area-on').click();
          await page.locator('[data-educart-etapa="objetivo"]').waitFor({state:'visible'});
          await scan('triagem-objetivo');
          await page.locator('.eg-choice').filter({hasText:'Atuação profissional'}).click();
          await page.locator('[data-educart-etapa="idade"]').waitFor({state:'visible'});
          await scan('triagem-idade');
          await page.locator('.eg-choice').filter({hasText:'14 a 17 anos'}).click();
          await page.locator('[data-educart-etapa="experiencia"]').waitFor({state:'visible'});
          await scan('triagem-experiencia');
        }
        if(rota==='/formacao'){
          await page.locator('.eg-course-open').first().click();
          const dialogo=page.locator('.eg-conhecer-dialog');
          await dialogo.waitFor({state:'visible'});
          await scan('dialogo-formacao');
          await page.keyboard.press('Escape');
          await dialogo.waitFor({state:'hidden'});
        }
        if(rota==='/inscricao'){
          await page.getByRole('button',{name:/Avançar para Dados Pessoais/}).click();
          await page.locator('[data-inscricao-step="2"]').waitFor({state:'visible'});
          await scan('inscricao-dados');
          // Somente dados fictícios locais; NÃO enviar o formulário.
          await page.locator('#nomeCompleto').fill('Pessoa Ficticia de Teste');
          await page.locator('#dataNascimento').fill('2000-01-01');
          await page.locator('#telefone').fill('71999999999');
          await page.locator('#email').fill('teste@example.invalid');
          await page.getByRole('button',{name:/Avançar para Endereço/}).click();
          await page.locator('[data-inscricao-step="3"]').waitFor({state:'visible'});
          await scan('inscricao-revisao');
        }
        if(rota==='/niveis-demo'){
          await page.locator('.lv-tier-card').last().click();
          await scan('perfil-pro');
          await page.locator('.theme-toggle-btn').click();
          await scan('tema-alternativo');
        }
      } catch (error) {
        erros.push({ caseName: rota+' '+largura+'px', error: String(error) });
        console.error('TC10 ERRO '+rota+' '+largura+': '+String(error));
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
fs.writeFileSync('tc10-artifacts/axe-relatorio.json',JSON.stringify({generatedAt:new Date().toISOString(),tags:etiquetas,summary:summarized,cases:resultado,erros},null,2));
console.log('TC10: '+resultado.length+' estados auditados, '+resultado.reduce((a,c)=>a+c.violations.length,0)+' violacoes WCAG, zero POST.');
const severos=resultado.flatMap(c=>c.violations.filter(v=>v.impact==='serious'||v.impact==='critical'));
if(severos.length || erros.length) {
  console.error('TC10 BLOQUEIO: '+severos.length+' violacoes graves e '+erros.length+' erros de varredura; conferir artifact axe-relatorio.json.');
  process.exitCode=1;
}
