// Resposta de compatibilidade para clientes que requisitam /favicon.ico.
export function GET() {
  return new Response(null, {
    status: 307,
    headers: {
      Location: '/images/oficina-atores-simbolo.svg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
