/** TC23: o domínio oficial jamais pode enviar uma inscrição ao banco DEV.
 * A segurança do banco depende de RLS; este contrato evita erros de roteamento
 * da interface pública. Teste de igualdade exata, não prefixo/sufixo.
 */
export const URL_PROD_INSCRICOES='https://doygnsubiitencoyzjzk.supabase.co';
export const HOSTS_OFICIAIS_INSCRICOES=['educart.pro','www.educart.pro','educart-11-prod-ready.educartsuporte.workers.dev'] as const;
export function destinoPublicoInscricaoSeguro(hostname:string,url:string|undefined,liberacao?:string):boolean{
  const host=hostname.trim().toLowerCase().replace(/\.$/,'');
  // No standby Workers.dev jamais habilitar envio, mesmo com URL PROD.
  if (host==='educart-11-prod-ready.educartsuporte.workers.dev' ||
      host==='educart-11-candidate.educartsuporte.workers.dev') return false;
  if (!HOSTS_OFICIAIS_INSCRICOES.some(h=>h===host)) return true;
  // Manter captacao fechada ate backup/restauracao e RLS homologados.
  return url===URL_PROD_INSCRICOES && liberacao==='approved';
}
