import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { obterPapeisGestao } from './lib/admin/autorizar-gestao';
import { reforcarCabecalhos } from './lib/security/headers-resposta';
import { destinoPublicoInscricaoSeguro } from './lib/security/destino-inscricao-publica';
import {
  classificarRequisicaoPrivada,
  HOST_PREVIA_CANDIDATA,
  HOST_PROD_READY,
  identidadeHomologacaoPermitida,
  configuracaoSupabaseDevValida,
  configuracaoSupabaseOficial11Valida,
  classificarRotaOficial11,
  identificarRotaEstudantePrivada,
} from './lib/security/preview-native-policy';

/**
 * R07 — portaria da prévia privada, antes de renderização Next/Vinext.
 *
 * O login continua visível para anônimos; todo o restante exige:
 *  1. Worker/host dedicado com modo explicitamente habilitado;
 *  2. Supabase DEV correto, chave publishable (nunca service role);
 *  3. token JWT verificado por getClaims + usuário atual por getUser;
 *  4. e-mail institucional permitido E portal_admins E papel de equipe persistido.
 *
 * A autorização do banco segue sujeita a RLS. Qualquer falha é negada.
 * Na futura EducART 1.1 oficial, uma classificação separada R43 exige
 * Auth e papéis no servidor para /admin. Sem a ENV de lançamento, falha fechada.
 * Nenhum código da 1.0 publicada é alterado nesta PR.
 */
export async function proxy(request: NextRequest) {
  const classificacaoOficial = classificarRotaOficial11(
    request.nextUrl.hostname,
    request.nextUrl.pathname,
    request.headers.get('host') || '',
    request.method,
    process.env.EDUCART_OFFICIAL_11_MODE,
  );
  const portalOficial = classificacaoOficial !== null;
  const classificacao = classificacaoOficial ?? classificarRequisicaoPrivada(
    request.nextUrl.hostname,
    request.nextUrl.pathname,
    process.env.EDUCART_PRIVATE_PREVIEW_MODE,
    process.env.NODE_ENV,
    {
      codespaces: process.env.CODESPACES,
      nome: process.env.CODESPACE_NAME,
      dominio: process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
      // Host real da requisicao, independente da URL normalizada pelo Next.
      // Nunca usar um segundo nextUrl.hostname como falsa prova de origem.
      hostRecebido: request.headers.get('host') || '',
      metodoHttp: request.method,
      perfilPublicoHabilitado: process.env.EDUCART_PERFIL_DOCENTE_PUBLICO === 'autorizado',
    },
  );

  // R07.5: estudante só em Codespaces PRIVATE, nunca no Worker de homologação.
  // Acesso individual é governado por JWT real + RLS, sem papel de gestão.
  const rotaEstudante = process.env.EDUCART_PRIVATE_PREVIEW_MODE === 'codespaces-private'
    ? identificarRotaEstudantePrivada(request.nextUrl.pathname)
    : null;

  if (classificacao === 'publico') {
    // R41: só o host candidato (validado pela portaria) usa aviso em vez
    // de formulários de inscrição, cadastro ou proposta docente.
    const hostPublico=(request.headers.get('host')||'').toLowerCase().split(':')[0];
    const avisoCandidata = hostPublico === HOST_PREVIA_CANDIDATA &&
      request.nextUrl.hostname.toLowerCase() === HOST_PREVIA_CANDIDATA &&
      process.env.EDUCART_PRIVATE_PREVIEW_MODE === 'required' &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      /^\/(?:inscricao|cadastro|criar)\/?$/.test(request.nextUrl.pathname);
    // TC23 P0: mesmo com a vitrine pública acessível, jamais renderizar
    // formulário que aponte a DEV no domínio oficial. Nada coleta PII.
    const formularioOficial = portalOficial &&
      (request.method === 'GET' || request.method === 'HEAD') &&
      /^\/(?:inscricao|cadastro|criar)\/?$/.test(request.nextUrl.pathname);
    const destinoOficialSeguro = process.env.EDUCART_OFFICIAL_11_MODE === 'required' &&
      destinoPublicoInscricaoSeguro(hostPublico, process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      configuracaoSupabaseOficial11Valida(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
    // Worker de homologação oficial: nunca coleta dados pela URL workers.dev.
    // Só o dominio oficial, após futuro corte autorizado, poderá exibir o form.
    const standby = hostPublico === HOST_PROD_READY &&
      request.nextUrl.hostname.toLowerCase() === HOST_PROD_READY;
    const rotaInscricao = /^\/(?:inscricao|cadastro|criar)\/?$/.test(request.nextUrl.pathname);
    const avisoStandby = standby && rotaInscricao &&
      (request.method === 'GET' || request.method === 'HEAD');
    const bloqueioStandbyPost = standby && rotaInscricao &&
      request.method !== 'GET' && request.method !== 'HEAD';
    const avisoOficial = formularioOficial && !destinoOficialSeguro;
    const response = bloqueioStandbyPost
      ? NextResponse.json({erro:'Inscricoes indisponiveis na homologacao'}, {status:405})
      : avisoOficial || avisoStandby
        ? NextResponse.rewrite(new URL('/inscricao-indisponivel', request.url))
        : avisoCandidata
          ? NextResponse.rewrite(new URL('/inscricao-previa', request.url))
          : NextResponse.next();
    // A prévia em workers.dev não é produção: inclusive o login público
    // não deve entrar em mecanismos de busca nem em cache compartilhado.
    if (hostPublico===HOST_PREVIA_CANDIDATA) {
      response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      response.headers.set('Cache-Control','private, no-store, max-age=0');
    }
    if (avisoOficial || standby) {
      response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
      response.headers.set('Cache-Control','private, no-store, max-age=0');
    }
    if (portalOficial && /^\/admin\/login\/?$/.test(request.nextUrl.pathname)) {
      response.headers.set('Cache-Control','private, no-store, max-age=0');
      response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    }
    if(request.nextUrl.pathname.startsWith('/docentes/perfil/')){
      response.headers.set('Cache-Control','private, no-store, max-age=0');
      response.headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
    }
    reforcarCabecalhos(response, request, portalOficial);
    return response;
  }

  // Cada resposta privada deve evitar cache compartilhado no navegador e CDN.
  const refreshedCookies: Array<{
    name: string;
    value: string;
    options: Parameters<NextResponse['cookies']['set']>[2];
  }> = [];
  const finalizar = (response: NextResponse) => {
    for (const item of refreshedCookies) {
      response.cookies.set(item.name, item.value, item.options);
    }
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Vary', 'Cookie');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    reforcarCabecalhos(response, request, portalOficial);
    return response;
  };

  const erro = (codigo: number) => finalizar(NextResponse.json(
    { erro: codigo === 503 ? 'Prévia indisponível' : 'Acesso restrito' },
    { status: codigo },
  ));
  if (classificacao === 'negado') return erro(503);
  const configuracaoValida = portalOficial
    ? configuracaoSupabaseOficial11Valida(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      )
    : configuracaoSupabaseDevValida(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
  if (!configuracaoValida) return erro(503);

  const naoAutenticado = () => {
    const isHtmlGet = request.method === 'GET' &&
      (request.headers.get('accept') || '').includes('text/html') &&
      request.headers.get('rsc') !== '1';
    if (!isHtmlGet) return erro(401);
    // Redirecionamento local, nunca URL informada pelo usuário.
    const destino = new URL(rotaEstudante === 'autenticada' ? '/minha-educart/login' : '/admin/login', request.url);
    return finalizar(NextResponse.redirect(destino, { status: 303 }));
  };

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet) => {
            for (const { name, value, options } of cookiesToSet) {
              request.cookies.set(name, value);
              refreshedCookies.push({ name, value, options });
            }
          },
        },
      },
    );

    // Nunca confiar em cookies fornecidos pelo cliente sem validar JWT.
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || !claimsData?.claims?.sub) return naoAutenticado();

    // Consulta atual ao Auth evita depender somente de claims potencialmente obsoletas.
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user || user.is_anonymous || user.id !== claimsData.claims.sub)
      return naoAutenticado();

    // Área estudantil PRIVADA: UID validado, sem conceder qualquer acesso admin.
    // RLS Supabase limita os dados à titularidade; convite exige RPC autorizada.
    if (rotaEstudante === 'autenticada') {
      return finalizar(NextResponse.next({ request }));
    }

    // Allowlist NÃO concede permissão: membership e papel com RLS são obrigatórios.
    if (!portalOficial && !identidadeHomologacaoPermitida(user.email)) return erro(403);
    const papeis = await obterPapeisGestao(supabase, user.id);
    if (papeis.length === 0) return erro(403);

    return finalizar(NextResponse.next({ request }));
  } catch {
    return erro(503);
  }
}

// Também intercepta RSC/HTML, rotas futuras e APIs; somente os assets públicos
// estritamente necessários à renderização são liberados pelo classificador.
export const config = { matcher: ['/:path*'] };
