/**
 * EducART R06 — Proteção de homologação SEM TinyFish.
 * --plan (offline, default); --audit (somente leitura); --ensure
 * (cria Access uma vez, apenas em workflow manual e no hostname exato).
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ACCOUNT_ID = '8fe5407b4d31f20e19a1388527e365ad';
export const HOSTNAME = 'educart-11-homologacao.educartsuporte.workers.dev';
export const APP_NAME = 'EducART 1.1 - Homologacao Privada';
export const ALLOWED_EMAILS = Object.freeze([
  'educartsuporte@gmail.com',
  'felipe.jdtc@gmail.com',
  'alinenepomuceno85@gmail.com',
].sort());
const ROOT = 'https://api.cloudflare.com/client/v4/accounts/' + ACCOUNT_ID + '/access/apps';
export function planoAccess() {
  return {
    type: 'self_hosted', name: APP_NAME, domain: HOSTNAME,
    app_launcher_visible: false, session_duration: '8h',
    policies: [{
      name: 'EducART R06 - Tres Contas Institucionais',
      decision: 'allow',
      include: ALLOWED_EMAILS.map(email => ({ email: { email } })),
    }],
  };
}
export function auditarPolitica(p) {
  if (!p || p.decision !== 'allow' ||
      !Array.isArray(p.include) || p.include.length !== ALLOWED_EMAILS.length ||
      (p.exclude?.length ?? 0) || (p.require?.length ?? 0) ||
      p.mfa_config?.mfa_disabled === true)
    throw Error('R06 BLOQUEIO: politica Access inesperada.');
  const emails = p.include.map(regra => {
    if (!regra || Object.keys(regra).length !== 1 || !regra.email ||
        Object.keys(regra.email).length !== 1 ||
        typeof regra.email.email !== 'string')
      throw Error('R06 BLOQUEIO: permissao nao e email individual.');
    return regra.email.email.toLowerCase();
  }).sort();
  if (JSON.stringify(emails) !== JSON.stringify(ALLOWED_EMAILS))
    throw Error('R06 BLOQUEIO: emails da politica divergentes.');
  return true;
}
export function auditarAplicacao(app, policies) {
  if (!app || app.type !== 'self_hosted' ||
      app.name !== APP_NAME || app.domain !== HOSTNAME ||
      !/^[0-9a-f-]{32,36}$/i.test(app.id || '') ||
      app.options_preflight_bypass === true ||
      app.allow_authenticate_via_warp === true)
    throw Error('R06 BLOQUEIO: app Access divergente.');
  if (Array.isArray(app.destinations) &&
      app.destinations.some(d => d.type !== 'public' ||
        ![HOSTNAME, 'https://' + HOSTNAME].includes(d.uri)))
    throw Error('R06 BLOQUEIO: destino Access diferente da homologacao.');
  if (!Array.isArray(policies) || policies.length !== 1)
    throw Error('R06 BLOQUEIO: exige uma unica politica.');
  auditarPolitica(policies[0]);
  return true;
}
export async function gerenciarAccess({mode='plan',env=process.env,fetcher=fetch}={}) {
  if (mode === 'plan') {
    console.log('R06: plano Access restrito; sem rede ou escrita.');
    return {status:'plan'};
  }
  if (!['audit','ensure'].includes(mode)) throw Error('Modo Access invalido');
  if (env.CLOUDFLARE_ACCOUNT_ID !== ACCOUNT_ID ||
      !env.CLOUDFLARE_API_TOKEN_ACCESS_HOMOLOG)
    throw Error('R06 BLOQUEIO: conta ou token especifico Access ausente.');
  if (mode === 'ensure' && (
      env.GITHUB_ACTIONS !== 'true' ||
      env.GITHUB_REF_NAME !== 'autodev-laboratorio-editavel-2026-11-03' ||
      !env.GITHUB_WORKFLOW_REF?.includes('/homologacao-educart-11-isolada.yml@') ||
      env.EDUCART_ACCESS_CONFIRMATION !== 'EDUCART_R06_ACCESS_SOMENTE'))
    throw Error('R06 BLOQUEIO: criacao somente em workflow manual da branch lab.');
  // Diagnostico explicitamente somente leitura; jamais imprimir token nem identificador.
  // docs.cloudflare.com/api/resources/user/subresources/tokens/methods/verify/
  if (mode === 'audit') {
    const verificar = await fetcher('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      method:'GET',
      headers:{Authorization:'Bearer ' + env.CLOUDFLARE_API_TOKEN_ACCESS_HOMOLOG},
      signal:AbortSignal.timeout(15000),
    });
    const resposta = await verificar.json().catch(() => null);
    if (!verificar.ok || resposta?.success !== true || resposta?.result?.status !== 'active')
      throw Error('R06 BLOQUEIO: token Cloudflare nao validado; HTTP ' + verificar.status +
        '; codigos API: ' + (resposta?.errors || [])
          .map(e => Number.isInteger(e.code) ? e.code : null)
          .filter(x => x !== null).slice(0, 3).join(',') +
        '. Sem tentativa de escrita.');
    console.log('R06 DIAGNOSTICO: token ativo segundo API oficial, sem revelar credencial.');
  }
  async function api(path='', method='GET', body) {
    const response = await fetcher(ROOT + path, {
      method,
      headers: {
        Authorization:'Bearer ' + env.CLOUDFLARE_API_TOKEN_ACCESS_HOMOLOG,
        'Content-Type':'application/json',
      },
      ...(body===undefined ? {} : {body:JSON.stringify(body)}),
      signal:AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => null);
    const codigos = (data?.errors || [])
      .map(e => Number.isInteger(e.code) ? e.code : null)
      .filter(x => x !== null).slice(0, 3).join(',') || 'nao informado';
    if (!response.ok) throw Error('R06 BLOQUEIO: Cloudflare HTTP ' + response.status +
      '; codigos API: ' + codigos + '; operacao ' + method + ' negada. Nenhuma credencial revelada.');
    if (data?.success !== true) throw Error('R06 BLOQUEIO: API Access recusou operacao; codigos: ' +
      codigos + '.');
    return data;
  }
  async function matches() {
    const data = await api('?page=1&per_page=1000');
    if (!Array.isArray(data.result) || (data.result_info?.total_pages ?? 1) > 1)
      throw Error('R06 BLOQUEIO: lista Access incompleta.');
    return data.result.filter(a => a.domain === HOSTNAME || a.name === APP_NAME ||
      (a.destinations || []).some(d => [HOSTNAME,'https://'+HOSTNAME].includes(d.uri)));
  }
  let found = await matches();
  if (found.length > 1) throw Error('R06 BLOQUEIO: aplicativos conflitantes.');
  if (!found.length) {
    if (mode === 'audit') throw Error('R06 BLOQUEIO: Access privado ainda ausente.');
    await api('', 'POST', planoAccess());
    found = await matches();
    if (found.length !== 1) throw Error('R06 BLOQUEIO: criacao sem releitura valida.');
  }
  const app = found[0];
  if (!/^[0-9a-f-]{32,36}$/i.test(app.id || ''))
    throw Error('R06 BLOQUEIO: identificador Access inesperado.');
  const policies = await api('/' + encodeURIComponent(app.id) + '/policies?page=1&per_page=100');
  if (!Array.isArray(policies.result) || (policies.result_info?.total_pages ?? 1) > 1)
    throw Error('R06 BLOQUEIO: consulta de politicas incompleta.');
  auditarAplicacao(app, policies.result);
  console.log('R06 OK: Access no hostname privado, policy Allow para 3 emails exatos.');
  return {status:'protected',hostname:HOSTNAME,app_id:app.id};
}
if (process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const mode = {'--plan':'plan','--audit':'audit','--ensure':'ensure'}[process.argv[2]||'--plan'];
  if (!mode) throw Error('Modo: --plan | --audit | --ensure');
  await gerenciarAccess({mode});
}
