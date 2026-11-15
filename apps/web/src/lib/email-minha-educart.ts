/**
 * EducART 1.2 — modelo editorial de boas-vindas, ainda NÃO aprovado para envio.
 * Gera HTML e texto puro sem acessar API, sem enviar mensagens e sem expor tokens.
 * O remetente e a entrega serão configurados exclusivamente no backend.
 */
export type DadosBoasVindas = {
  nomeCompleto: string;
  nomeTurma: string;
  acessoUrl: string;
  jaPossuiConta: boolean;
};

export type EmailPreparado = {
  assunto: string;
  preCabecalho: string;
  texto: string;
  html: string;
};

function escaparHtml(valor: string): string {
  return valor.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function validarUrlEducart(valor: string): string {
  const u = new URL(valor);
  if (u.protocol !== 'https:' ||
      !(u.hostname === 'educart.pro' || u.hostname.endsWith('.educart.pro') ||
        u.hostname.endsWith('.educartsuporte.workers.dev')) ||
      !['/minha-educart', '/minha-educart/ativar'].includes(u.pathname) ||
      u.username || u.password || u.hash) {
    throw new Error('Endereço de acesso à Minha EducART não autorizado.');
  }
  if (u.pathname === '/minha-educart/ativar' &&
      !/^[0-9a-f-]{36}$/i.test(u.searchParams.get('convite') ?? '')) {
    throw new Error('Convite individual inválido.');
  }
  return u.toString();
}

export function prepararEmailBoasVindasMinhaEducart(dados: DadosBoasVindas): EmailPreparado {
  const nome = dados.nomeCompleto.trim().split(/\s+/)[0] || 'estudante';
  const turma = dados.nomeTurma.trim();
  if (turma.length < 2 || turma.length > 140 || nome.length > 150) {
    throw new Error('Identificação da matrícula inválida.');
  }
  const url = validarUrlEducart(dados.acessoUrl);
  const assunto = 'Sua matrícula foi confirmada. Boas-vindas à Minha EducART!';
  const preCabecalho = 'Sua turma está confirmada. Conheça seu espaço de estudante na EducART.';
  const acao = dados.jaPossuiConta ? 'ACESSAR MINHA EDUCART' : 'ATIVAR MINHA EDUCART';
  const passo = dados.jaPossuiConta
    ? 'Sua conta continua a mesma: a nova turma será exibida no seu histórico.'
    : 'Crie seu acesso com o e-mail usado na inscrição e personalize seu perfil.';
  const futuro = 'Estamos construindo possibilidades para a comunidade, como acesso gratuito a eventos selecionados, descontos em futuras formações e iniciativas ligadas à agência artística em uma etapa posterior. Esses benefícios ainda não estão disponíveis nem garantidos e serão anunciados quando forem oficialmente lançados.';
  const texto = [
    'EDUCART · NÚCLEO DE FORMAÇÃO DE ATORES',
    '',
    'Sua jornada agora faz parte da EducART.',
    '',
    'Olá, ' + nome + '!',
    '',
    'Sua matrícula na turma ' + turma + ' foi confirmada.',
    'Você já tem direito ao acesso básico da Minha EducART: seu ambiente pessoal de estudante.',
    'Consulte suas turmas, frequência, trajetória e registros acadêmicos disponibilizados pela equipe.',
    '',
    passo,
    '',
    acao + ': ' + url,
    '',
    'E tem mais pela frente.',
    futuro,
    '',
    'A arte nos conecta. A EducART nos reúne.',
    'Equipe EducART',
    '',
    'Caso não reconheça esta matrícula, procure os canais oficiais. Nunca informe sua senha por e-mail.',
  ].join('\n');
  const nomeSeguro = escaparHtml(nome);
  const turmaSegura = escaparHtml(turma);
  const urlSegura = escaparHtml(url);
  const acaoSegura = escaparHtml(acao);
  const passoSeguro = escaparHtml(passo);
  const futuroSeguro = escaparHtml(futuro);
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escaparHtml(assunto)}</title></head>
<body style="margin:0;padding:0;background-color:#edf1f7;color:#162138;font-family:Arial,Helvetica,sans-serif">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escaparHtml(preCabecalho)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#edf1f7;padding:26px 10px">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#081c46;padding:32px 36px 26px;text-align:left">
<div style="font-size:23px;font-weight:800;letter-spacing:2px;color:#ffffff">EDUC<span style="color:#e6b65f">ART</span></div>
<div style="margin-top:9px;font-size:11px;letter-spacing:1.4px;color:#d9e4f7">NÚCLEO DE FORMAÇÃO DE ATORES</div>
<h1 style="font-size:29px;line-height:1.2;font-weight:700;color:#ffffff;margin:30px 0 0">Sua jornada agora faz parte da EducART<span style="color:#e6b65f">.</span></h1>
</td></tr>
<tr><td style="padding:33px 36px 25px;font-size:16px;line-height:1.65">
<p style="margin:0 0 16px">Olá, <strong>${nomeSeguro}</strong>!</p>
<p style="margin:0 0 20px">Sua matrícula foi confirmada. É uma alegria receber você na nossa comunidade de formação artística.</p>
<div style="background:#f1f5fb;border-left:4px solid #e6b65f;padding:14px 18px;margin:0 0 23px;border-radius:6px">
<div style="font-size:12px;color:#425673;letter-spacing:1px">MATRÍCULA CONFIRMADA</div>
<div style="font-size:19px;font-weight:700;color:#102c63">${turmaSegura}</div>
</div>
<h2 style="font-size:21px;color:#102c63;margin:0 0 10px">Conheça a Minha EducART</h2>
<p style="margin:0 0 16px">Sua matrícula garante o <strong>acesso básico à Minha EducART</strong>, seu espaço privado para acompanhar turmas, frequência, trajetória e registros acadêmicos disponibilizados pela equipe.</p>
<p style="margin:0 0 22px">${passoSeguro}</p>
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 24px"><tr><td style="background:#113777;border-radius:9px;text-align:center">
<a href="${urlSegura}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:16px 26px;letter-spacing:.3px">${acaoSegura}</a>
</td></tr></table>
<p style="font-size:13px;word-break:break-all;text-align:center;color:#536784">Se o botão não abrir, copie este endereço:<br/><a href="${urlSegura}" style="color:#16447f">${urlSegura}</a></p>
<hr style="border:0;border-top:1px solid #e2e8f2;margin:28px 0 22px"/>
<h2 style="font-size:20px;color:#102c63;margin:0 0 10px">E tem mais pela frente</h2>
<p style="margin:0 0 18px">${futuroSeguro}</p>
<p style="font-size:17px;font-weight:700;color:#102c63;margin:25px 0 5px">A arte nos conecta. A EducART nos reúne.</p>
<p style="margin:0">Com carinho,<br/><strong>Equipe EducART</strong></p>
</td></tr>
<tr><td style="background:#f6f8fc;padding:20px 36px;font-size:12px;line-height:1.6;color:#52637f">
Esta comunicação é sobre sua matrícula na EducART. Se não reconhece a matrícula, procure os canais oficiais. Nunca pediremos sua senha por e-mail.
</td></tr>
</table></td></tr></table>
</body></html>`;
  return { assunto, preCabecalho, texto, html };
}
