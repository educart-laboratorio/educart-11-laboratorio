/**
 * AutoDEV / EducART 1.1 — R05: teste REAL de Cloudflare Access, fail-closed.
 * Chamada somente antes de deploy privado. Não envia cookies, JWT ou segredo.
 * Retorno HTTP 200 da aplicação significa BLOQUEIO, nunca aprovação.
 */
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const URL_PRIVADA = 'https://educart-11-homologacao.educartsuporte.workers.dev/';

export function redirecionaParaAccess(status, location) {
  if (![301, 302, 303, 307, 308].includes(status) || !location) return false;
  let destino;
  try { destino = new URL(location, URL_PRIVADA); }
  catch { return false; }
  if (destino.protocol !== 'https:') return false;
  const isCloudflare = destino.hostname.endsWith('.cloudflareaccess.com');
  const isWorker = destino.hostname === new URL(URL_PRIVADA).hostname;
  const isLogin = destino.pathname.startsWith('/cdn-cgi/access/login');
  return isLogin && (isCloudflare || isWorker);
}

export async function verificarAccess(fetcher = fetch) {
  const retorno = await fetcher(URL_PRIVADA, {
    method: 'GET',
    redirect: 'manual',
    cache: 'no-store',
    headers: { 'accept': 'text/html', 'cache-control': 'no-cache' },
    signal: AbortSignal.timeout(12000)
  });
  const location = retorno.headers.get('location');
  if (!redirecionaParaAccess(retorno.status, location)) {
    throw Error('R05 BLOQUEIO: Access não comprovado no hostname privado (HTTP ' +
      retorno.status + '). Não publicar.');
  }
  console.log('R05: redirecionamento de visitante sem cookies para Cloudflare Access verificado.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  await verificarAccess();
}
