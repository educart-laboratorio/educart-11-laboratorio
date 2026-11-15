/**
 * EducART R07 — decisão de acesso nativa, sem efeitos colaterais.
 * Fonte de autoridade: Supabase Auth + RLS + tabelas portal_admins/equipe_papeis.
 * Só controla o Worker isolado de prévia, nunca o portal público EducART 1.0.
 */
export const HOST_PREVIA_PRIVADA = 'educart-11-homologacao.educartsuporte.workers.dev';
export const HOST_PREVIA_CANDIDATA = 'educart-11-candidate.educartsuporte.workers.dev';
export const URL_SUPABASE_DEV = 'https://esjrjzyvyhtzwgihcbsc.supabase.co';

/**
 * R43 — classificação exclusiva do FUTURO portal oficial 1.1.
 * Este código só opera na branch candidata até publicação autorizada.
 * Não usa o modo de homologação, não concede papéis e não toca na 1.0.
 */
export const URL_SUPABASE_PROD = 'https://doygnsubiitencoyzjzk.supabase.co';
export const HOSTS_PORTAL_OFICIAL_11 = [
  'educart.pro',
  'www.educart.pro',
  'educart-production.educartsuporte.workers.dev',
] as const;

export function classificarRotaOficial11(
  hostname: string,
  pathname: string,
  hostRecebido: string,
  metodoHttp: string,
  modo: string | undefined,
): ResultadoPortaria | null {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const recebido = hostRecebido.toLowerCase().split(':')[0].replace(/\.$/, '');
  const hostOficial = HOSTS_PORTAL_OFICIAL_11.some((permitido) => permitido === host);
  const recebidoOficial = HOSTS_PORTAL_OFICIAL_11.some((permitido) => permitido === recebido);
  // Next pode normalizar o hostname interno; o Host externo deve continuar
  // EXATAMENTE na allowlist, e somente em um deploy 1.1 explicitamente ativo.
  const hostInterno = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  if (modo === 'required' && (!recebidoOficial || (!hostOficial && !hostInterno)))
    return 'negado';
  if (!hostOficial && !recebidoOficial) return null;
  const acessoPrivado =
    /^\/admin(?:\/|$)/.test(pathname) ||
    /^\/api\/(?:admin|secretaria)(?:\/|$)/.test(pathname) ||
    /^\/_next\/data\/[^/]+\/admin(?:\/.*)?\.json$/.test(pathname);
  // Vitrine pública, catálogo, inscrição e propostas permanecem acessíveis.
  if (!acessoPrivado) return 'publico';
  // Nunca aceitar Host contraditório nem liberar a área privada sem portaria.
  if (!recebidoOficial || (!hostOficial && !hostInterno) || modo !== 'required') return 'negado';
  // Página de login precisa carregar antes do Auth; sem POST/API anônima.
  if (/^\/admin\/login\/?$/.test(pathname) &&
      (metodoHttp === 'GET' || metodoHttp === 'HEAD')) return 'publico';
  return 'avaliar';
}

export function configuracaoSupabaseOficial11Valida(
  url: string | undefined,
  chave: string | undefined,
): boolean {
  return url === URL_SUPABASE_PROD &&
    typeof chave === 'string' &&
    chave.startsWith('sb_publishable_') &&
    chave.length > 'sb_publishable_'.length;
}

const contasInstitucionais = new Set([
  'educartsuporte@gmail.com',
  'felipe.jdtc@gmail.com',
  'alinenepomuceno85@gmail.com',
]);

export type ResultadoPortaria = 'publico' | 'negado' | 'avaliar';

/**
 * R07.5: escopo fechado de rotas do estudante para HOMOLOGAÇÃO LOCAL.
 * Login, recuperação e a TELA de convite não exigem sessão.
 * A ativação (RPC) exige usuário confirmado, matrícula ativa e convite válido;
 * o histórico exige JWT validado no servidor e permanece sob RLS.
 * Não autoriza acesso ao /admin nem libera Workers ou domínios públicos.
 */
export function identificarRotaEstudantePrivada(
  pathname: string,
): 'publica' | 'autenticada' | null {
  if (/^\/minha-educart\/(?:login|recuperar|ativar)\/?$/.test(pathname)) return 'publica';
  if (/^\/minha-educart\/?$/.test(pathname)) return 'autenticada';
  return null;
}

export type ContextoCodespacePrivado = {
  codespaces?: string;
  nome?: string;
  dominio?: string;
  hostRecebido?: string;
  metodoHttp?: string;
  perfilPublicoHabilitado?: boolean;
};

/** Portas encaminhadas em Codespaces são privadas por padrão (autenticação GitHub).
 * A URL esperada deve combinar exatamente com a instância atual.
 * Este não é um bypass de login: Auth, membership e RLS continuam obrigatórios.
 */
export function validarHostCodespacePrivado(
  hostname: string,
  ambiente: string | undefined,
  contexto: ContextoCodespacePrivado = {},
): boolean {
  if (ambiente !== 'development' || contexto.codespaces !== 'true') return false;
  const nome = contexto.nome?.toLowerCase() || '';
  const dominio = contexto.dominio?.toLowerCase() || '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(nome) ||
      !/^(?:[a-z0-9-]+\.)*github\.dev$/.test(dominio)) return false;
  const esperado = nome + '-3000.' + dominio;
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const recebido = (contexto.hostRecebido || '').toLowerCase().split(':')[0].replace(/\.$/, '');
  // Next dev pode normalizar nextUrl.hostname para "localhost" mesmo quando
  // o proxy GitHub recebeu o domínio de porta encaminhada.
  // Com --hostname 0.0.0.0, Next dev pode normalizar nextUrl.hostname
  // para o endereco de bind, mesmo quando o Host HTTP e o loopback correto.
  // Aceitar 0.0.0.0 APENAS como hostname normalizado, nunca como Host recebido.
  const hostEsperado = host === esperado || host === 'localhost' ||
    host === '127.0.0.1' || host === '0.0.0.0';
  const recebidoEsperado = recebido === esperado || recebido === 'localhost' || recebido === '127.0.0.1';
  // Ambos devem ser conhecidos: nao confiar em um Host recebido que contradiga
  // o endereco normalizado. Nunca aceitar educart.pro ou dominio arbitrario.
  return hostEsperado && recebidoEsperado;
}


export function classificarRequisicaoPrivada(
  hostname: string,
  pathname: string,
  modo: string | undefined,
  ambiente: string | undefined = 'production',
  contexto: ContextoCodespacePrivado = {},
): ResultadoPortaria {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  // R07.2: modo local apenas no Next em development + loopback.
  const local = modo === 'local' && ambiente === 'development' &&
    (host === 'localhost' || host === '127.0.0.1');
  // R07.4: ambiente GitHub Codespaces autenticado e porta PRIVADA.
  // Nao existe modo de Codespaces em Worker de producao.
  const codespacePrivado = modo === 'codespaces-private' &&
    validarHostCodespacePrivado(host, ambiente, contexto);
  if (modo === 'codespaces-private' && !codespacePrivado) return 'negado';
  // Nunca permitir bypass por hostname alternativo quando o modo da previa
  // esta ativo. Fora dele a EducART 1.0 continua inalterada.
  if (!local && !codespacePrivado && host !== HOST_PREVIA_PRIVADA && host !== HOST_PREVIA_CANDIDATA) {
    return (modo === 'required' || modo === 'local' ||
      modo === 'codespaces-private') ? 'negado' : 'publico';
  }
  // Credencial ou modo ausentes: negar mesmo a tela de login do hostname privado.
  if (!local && !codespacePrivado && modo !== 'required') return 'negado';
  // Candidata 1.1: VITRINE PUBLICA, PAINEL PRIVADO.
  // Exceções EXATAS, somente no hostname candidato com modo obrigatório:
  // não incluem APIs, RSC privadas, dados acadêmicos ou sub-rotas arbitrárias.
  // A homologação isolada e a área administrativa permanecem privadas.
  // Preserva a vitrine e os formularios aprovados, mas nunca concede
  // permissao publica a escrita HTTP ou Host divergente do Worker candidato.
  const hostRecebido = (contexto.hostRecebido || '').toLowerCase().split(':')[0].replace(/\.$/, '');
  const metodoHttp = (contexto.metodoHttp || '').toUpperCase();
  if (host === HOST_PREVIA_CANDIDATA && modo === 'required' &&
      hostRecebido === HOST_PREVIA_CANDIDATA &&
      (metodoHttp === 'GET' || metodoHttp === 'HEAD') &&
      (pathname === '/' ||
       pathname === '/formacao' || pathname === '/formacao/' ||
       pathname === '/inscricao' || pathname === '/inscricao/' ||
       pathname === '/inscricao-previa' || pathname === '/inscricao-previa/' ||
       pathname === '/cadastro' || pathname === '/cadastro/' ||
       pathname === '/criar' || pathname === '/criar/')) return 'publico';
  // Recursos estritamente estáticos não carregam dados de usuário nem RSC.
  if (pathname.startsWith('/_next/static/') ||
      pathname === '/_next/image' ||
      pathname.startsWith('/images/')) return 'publico';
  // O formulário de autenticação precisa carregar sem sessão.
  if (pathname === '/admin/login' || pathname === '/admin/login/') return 'publico';
  // Somente Codespaces privado: login/recuperação/convite sem sessão.
  // O convite é apenas uma página: ativação real exige RPC + Auth no servidor.
  // Apenas token UUID e consentimento validado por RPC; sem acesso direto a tabelas privadas.
  // Na prévia Codespaces, o encaminhamento da porta 3000 continua PRIVADO no GitHub.
  // Na homologação Worker, habilitação pública requer ENV explícita e deploy autorizado.
  const rotaPerfilDocente=/^\/docentes\/perfil\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(pathname);
  if (rotaPerfilDocente && (codespacePrivado ||
      (host===HOST_PREVIA_PRIVADA && modo==='required' && contexto.perfilPublicoHabilitado===true)))
    return 'publico';
  // Histórico e rotas futuras seguem protegidos.
  if (codespacePrivado && identificarRotaEstudantePrivada(pathname) === 'publica')
    return 'publico';
  // RSC, páginas, handlers HTTP, rotas futuras, querystrings e endpoints:
  // todos passam pela verificação; nenhum bypass por extensão ".js" ou cabeçalho.
  return 'avaliar';
}

export function identidadeHomologacaoPermitida(email: string | undefined | null): boolean {
  return typeof email === 'string' && contasInstitucionais.has(email.trim().toLowerCase());
}

export function configuracaoSupabaseDevValida(
  url: string | undefined,
  chave: string | undefined,
): boolean {
  return url === URL_SUPABASE_DEV &&
    typeof chave === 'string' &&
    chave.startsWith('sb_publishable_') &&
    chave.length > 'sb_publishable_'.length;
}
