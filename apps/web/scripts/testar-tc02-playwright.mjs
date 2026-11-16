// TC-02: regressao E2E sem escritas, para a candidata EducART 1.1.
// Todas as chamadas Supabase sao interceptadas no browser ANTES do clique.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.TC02_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.TC02_ARTIFACTS || 'tc02-artifacts';
const widths = [360, 390, 768, 1440];
const scenarios = [
  { name: 'sucesso-201', code: 201, kind: 'success' },
  { name: 'duplicidade-409', code: 409, kind: 'error' },
  { name: 'erro-500', code: 500, kind: 'error' },
  { name: 'timeout', code: 0, kind: 'error' },
];
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of widths) {
    for (const scenario of scenarios) {
      const context = await browser.newContext({ viewport: { width, height: 800 } });
      const page = await context.newPage();
      const writes = [];
      const requests = [];
      await context.route(/https:\/\/[^/]+\.supabase\.co\/.*/, async route => {
        const request = route.request();
        const url = new URL(request.url());
        requests.push({ method: request.method(), host: url.host, path: url.pathname });
        if (request.method() === 'POST' && url.pathname === '/rest/v1/inscricoes_oficina') {
          writes.push({ host: url.host, intercepted: true, blocked: true });
          if (scenario.code === 0) {
            await route.abort('timedout');
          } else if (scenario.code === 201) {
            await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: '' });
          } else {
            const body = scenario.code === 409
              ? JSON.stringify({ code: '23505', message: 'synthetic duplicate — NO DB WRITE' })
              : JSON.stringify({ code: 'XX000', message: 'synthetic server error — NO DB WRITE' });
            await route.fulfill({ status: scenario.code, headers: { 'content-type': 'application/json' }, body });
          }
        } else {
          await route.abort('blockedbyclient');
        }
      });

      try {
        const response = await page.goto(base + '/inscricao', { waitUntil: 'domcontentloaded' });
        assert.equal(response?.status(), 200, 'Página de inscrição deveria retornar 200');
        await page.locator('[data-inscricao-step="1"]').waitFor();

        await page.getByRole('button', { name: /Avançar para Dados Pessoais/ }).click();
        await page.locator('#nomeCompleto').fill('Teste Sintético TC02');
        await page.locator('#dataNascimento').fill('1990-01-01');
        await page.locator('#telefone').fill('71999999999');
        await page.locator('#email').fill('tc02-nao-gravar@example.invalid');
        await page.getByRole('button', { name: /Avançar para Endereço/ }).click();
        await page.locator('#endereco').fill('Rua Fictícia, 1, Bairro de Teste');
        await page.locator('input[name="cidadeEstado"][value="Salvador/BA"]').check({ force: true });
        await page.getByRole('button', { name: /Finalizar e Confirmar Inscrição/ }).click();

        const target = scenario.kind === 'success'
          ? page.locator('.form-success-card')
          : page.locator('.form-error-alert[role="alert"]').first();
        await target.waitFor({ state: 'visible', timeout: 15000 });
        await page.waitForFunction((selector) => {
          const el = document.querySelector(selector);
          return Boolean(el && document.activeElement === el);
        }, scenario.kind === 'success' ? '.form-success-card' : '.form-error-alert[role="alert"]');
        const position = await target.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            viewportHeight: window.innerHeight,
            focused: document.activeElement === el,
            scrollY: window.scrollY,
          };
        });
        assert(position.top >= -2 && position.top < position.viewportHeight - 20,
          'Feedback fora do viewport: ' + JSON.stringify(position));
        assert(position.focused, 'Foco nao direcionado ao feedback');
        assert.equal(writes.length, 1, 'Exatamente um POST sintético deve ser interceptado');
        if (scenario.kind === 'success') {
          assert.match(await target.innerText(), /Inscrição Enviada com Sucesso/);
        } else if (scenario.code === 409) {
          assert.match(await target.innerText(), /já possui uma inscrição registrada/);
        } else {
          assert.match(await target.innerText(), /erro|conexão|tente novamente/i);
        }
        const name = scenario.name + '-' + width;
        await page.screenshot({ path: path.join(output, name + '.png'), fullPage: false });
        results.push({ width, scenario: scenario.name, passed: true, writesBlocked: writes.length, position });
        console.log(JSON.stringify(results.at(-1)));
      } catch (error) {
        const name = scenario.name + '-' + width;
        await page.screenshot({ path: path.join(output, name + '-FALHA.png'), fullPage: false }).catch(() => {});
        results.push({ width, scenario: scenario.name, passed: false, error: String(error), requests, writesBlocked: writes.length });
        console.error(JSON.stringify(results.at(-1)));
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'relatorio-tc02.json'), JSON.stringify({ realWrites: 0, scenarios: results }, null, 2));
}
assert(results.every(result => result.passed), 'TC-02 falhou: conferir relatorio e imagens; nenhuma escrita real executada');
console.log('TC-02 aprovado em ' + results.length + ' casos. Zero escritas reais.');
