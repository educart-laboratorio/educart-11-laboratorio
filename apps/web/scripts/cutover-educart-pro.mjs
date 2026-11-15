// AutoDEV GSI-R59 — corte de domínio sob ordem expressa da Direção, 15/11/2026.
// Altera somente vinculo de Worker Custom Domain; sem deploy, DNS manual ou banco.
// Valida antes, confirma depois e desfaz o vinculo caso falhe.
const ACCOUNT = "8fe5407b4d31f20e19a1388527e365ad";
const TARGET = "educart-11-candidate";
const PREVIOUS = "educart-production";
const APEX = "educart.pro";
const ALIAS = "www.educart.pro";
const API = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/domains`;
const secret = process.env.CLOUDFLARE_API_TOKEN;
if (!secret || process.env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT ||
    process.env.GITHUB_REPOSITORY !== "educart-laboratorio/educart-11-laboratorio" ||
    process.env.GITHUB_REF_NAME !== "secretaria-11-candidate-online-20261115" ||
    process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Execução não autorizada: ambiente, token ou origem inválidos");
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function cloudflare(method, url, body) {
  const response = await fetch(url, {
    method, headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json"
    }, body: body ? JSON.stringify(body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json.success) {
    const codes = Array.isArray(json.errors)
      ? json.errors.map(e => `${e.code}: ${e.message}`).join("; ") : "";
    throw new Error(`Cloudflare ${method} HTTP ${response.status}: ${codes || "acesso negado ou resposta inválida"}`);
  }
  return json;
}
async function domains() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const result = await cloudflare("GET", `${API}?page=${page}&per_page=100`);
    if (!Array.isArray(result.result)) throw new Error("Inventário Cloudflare inesperado");
    all.push(...result.result);
    if (!result.result_info || page >= (result.result_info.total_pages || 1)) break;
  }
  return all;
}
async function httpProbe(base) {
  const checks = [
    ["/", "GET", 200],
    ["/formacao", "GET", 200],
    ["/inscricao", "GET", 200],
    ["/admin/login", "GET", 200],
    ["/admin", "GET", 303],
    ["/api/matriculas", "POST", 401]
  ];
  for (const [route, method, expected] of checks) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(base + route, {
        method, redirect: "manual", signal: controller.signal,
        headers: { "Accept": method === "GET" ? "text/html" : "application/json", "Cache-Control": "no-cache" }
      });
      if (res.status !== expected) throw new Error(`${route}: HTTP ${res.status}, esperado ${expected}`);
    } finally {
      clearTimeout(timer);
    }
  }
}
async function attach(entry, service) {
  const body = {
    hostname: entry.hostname, service, zone_id: entry.zone_id,
    enabled: true, previews_enabled: Boolean(entry.previews_enabled)
  };
  await cloudflare("PUT", API, body);
}
const changed = [];
try {
  console.log("Pré-teste HTTP da candidata, sem alterar domínio");
  await httpProbe("https://educart-11-candidate.educartsuporte.workers.dev");
  console.log("Pré-teste da candidata: PASS");
  const original = await domains();
  const apex = original.filter(d => d.hostname === APEX);
  if (apex.length !== 1) throw new Error("educart.pro não aparece como um único Custom Domain: nenhum vínculo foi alterado");
  const selected = [apex[0]];
  const www = original.filter(d => d.hostname === ALIAS);
  if (www.length > 1) throw new Error("www.educart.pro ambíguo: nenhuma alteração");
  if (www.length === 1 && [PREVIOUS, TARGET].includes(www[0].service)) selected.push(www[0]);
  for (const d of selected) {
    if (![PREVIOUS, TARGET].includes(d.service) ||
        !d.zone_id || d.zone_name !== "educart.pro" || d.enabled === false) {
      throw new Error(`Vínculo inesperado para ${d.hostname}; sem alterar nada`);
    }
    console.log(`Vínculo anterior: ${d.hostname} -> ${d.service}`);
  }
  for (const d of selected) {
    if (d.service !== TARGET) {
      await attach(d, TARGET);
      changed.push(d);
      console.log(`Reassociado: ${d.hostname} -> ${TARGET}`);
    }
  }
  let lastError;
  for (let attempt = 1; attempt <= 15; attempt++) {
    try {
      await sleep(3000);
      const live = await domains();
      for (const d of selected) {
        if (!live.some(x => x.hostname === d.hostname && x.service === TARGET && x.enabled !== false)) {
          throw new Error(`API ainda não confirmou ${d.hostname} -> ${TARGET}`);
        }
      }
      await httpProbe("https://educart.pro");
      if (selected.some(d => d.hostname === ALIAS)) await httpProbe("https://www.educart.pro");
      console.log(`SUCESSO: educart.pro atende no Worker ${TARGET}; checks HTTP públicos e privados passaram`);
      if (process.env.GITHUB_STEP_SUMMARY) {
        const fs = await import("node:fs");
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
          `## EducART 1.1 — domínio oficial\n- educart.pro: ${TARGET}\n- HTTP: /, /formacao, /inscricao, /admin/login = 200; /admin = 303; API sem JWT = 401\n- Supabase, DNS manual e código da versão anterior não alterados.\n`);
      }
      process.exit(0);
    } catch (e) {
      lastError = e;
      console.log(`Aguardando confirmação/HTTP ${attempt}/15: ${e.message}`);
    }
  }
  throw new Error(`Verificação pós-corte falhou: ${lastError?.message}`);
} catch (error) {
  console.error(`Corte não concluído: ${error.message}`);
  for (const d of changed.reverse()) {
    try {
      await attach(d, d.service);
      console.log(`Rollback: ${d.hostname} -> ${d.service}`);
    } catch (rollbackError) {
      console.error(`ATENÇÃO: rollback de ${d.hostname} falhou: ${rollbackError.message}`);
    }
  }
  process.exitCode = 1;
}
