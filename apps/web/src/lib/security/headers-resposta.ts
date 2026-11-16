/** TC-14: cabeçalhos de defesa proporcionais. Apenas host oficial recebe HSTS.
 * A política CSP é deliberadamente estreita: não restringe ainda script-src
 * (o bootstrap de tema usa script inline) ou connect-src (Auth externo).
 * Arquivos estáticos não recebem Cache-Control HTML, preservando assets.
 */
export type RequisicaoCabecalhos = {
  method: string;
  headers: { get(nome: string): string | null };
  nextUrl: { protocol: string };
};
export type RespostaCabecalhos = { headers: Headers };

export function reforcarCabecalhos(
  response: RespostaCabecalhos,
  request: RequisicaoCabecalhos,
  hostOficial: boolean,
): void {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  const rsc = request.headers.get('rsc') === '1';
  const documento = !rsc && /text\/html/i.test(request.headers.get('accept') ?? '');
  if (documento || rsc) {
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Content-Security-Policy',
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
    if (!response.headers.has('Cache-Control') &&
        (request.method === 'GET' || request.method === 'HEAD')) {
      response.headers.set('Cache-Control', rsc
        ? 'private, no-store, max-age=0'
        : 'private, no-cache, max-age=0, must-revalidate');
    }
  }
  // Adotar janela curta, sem includeSubDomains ou preload. Nada no host DEV.
  if (hostOficial && request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=86400');
  }
}
