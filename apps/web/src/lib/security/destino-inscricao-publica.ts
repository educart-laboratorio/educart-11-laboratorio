/** TC23: o domínio oficial jamais pode enviar uma inscrição ao banco DEV.
 * A segurança do banco depende de RLS; este contrato evita erros de roteamento
 * da interface pública. Teste de igualdade exata, não prefixo/sufixo.
 */
export const URL_PROD_INSCRICOES='https://doygnsubiitencoyzjzk.supabase.co';
export const HOSTS_OFICIAIS_INSCRICOES=['educart.pro','www.educart.pro','educart-11-prod-ready.educartsuporte.workers.dev'] as const;
export function destinoPublicoInscricaoSeguro(hostname:string,url:string|undefined):boolean{
  const host=hostname.trim().toLowerCase().replace(/\.$/,'');
  if (!HOSTS_OFICIAIS_INSCRICOES.some(h=>h===host)) return true;
  return url===URL_PROD_INSCRICOES;
}
