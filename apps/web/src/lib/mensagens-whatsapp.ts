/**
 * Única origem das mensagens pré-preenchidas nos botões de WhatsApp da EducART.
 * São rascunhos: apenas abrem o aplicativo; o envio depende de ação manual.
 */
export function mensagemInformacoesFormacao(): string {
  return [
    'Olá, equipe da Oficina de Atores Salvador! 🎭',
    '',
    'Conheci a *Formação de Atores* pelo portal *EducART* e gostaria de saber mais sobre a turma atual, a partir dos 14 anos.',
    '',
    'Poderiam me informar sobre horários, investimento, vagas disponíveis e próximos passos para a matrícula?',
    '',
    'Agradeço pela atenção!',
  ].join('\n');
}

export function mensagemCandidatoInscrito(dados: {
  nome: string;
  telefone: string;
  objetivo: string;
}): string {
  return [
    'Olá, equipe da Oficina de Atores Salvador! 🎭',
    '',
    'Acabei de enviar minha ficha de inscrição para a *Formação de Atores* pelo portal *EducART*.',
    '',
    '*Nome:* ' + dados.nome.trim(),
    '*WhatsApp:* ' + dados.telefone.trim(),
    '*Interesse:* ' + dados.objetivo.trim(),
    '',
    'Gostaria de receber orientações sobre a disponibilidade de vagas, as condições de matrícula e os próximos passos.',
    '',
    'Agradeço pela atenção!',
  ].join('\n');
}

export function mensagemPrimeiroContatoEquipe(nomeCompleto: string): string {
  const primeiroNome = nomeCompleto.trim().split(/\s+/)[0];
  return [
    primeiroNome ? 'Olá, ' + primeiroNome + '! Tudo bem? 🎭' : 'Olá! Tudo bem? 🎭',
    '',
    'Aqui é a equipe da *Oficina de Atores Salvador*, pelo portal *EducART*.',
    '',
    'Recebemos sua ficha de inscrição para a *Formação de Atores* e gostaríamos de conversar sobre os próximos passos, a disponibilidade de vagas e as condições de matrícula.',
    '',
    'Podemos falar por aqui?',
  ].join('\n');
}

export function mensagemAcompanhamentoInscricao(): string {
  return [
    'Olá, equipe da Oficina de Atores Salvador! 🎭',
    '',
    'Enviei minha ficha de inscrição para a *Formação de Atores* pelo portal *EducART*.',
    '',
    'Gostaria de confirmar o recebimento da ficha e saber quais são os próximos passos.',
    '',
    'Agradeço pela atenção!',
  ].join('\n');
}

/** Rascunho humanizado de cobrança. Nunca é enviado automaticamente. */
export function mensagemCobrancaMensalidadeEducart(dados: {
  nome: string;
  turma: string;
  competencia: string;
  vencimento: string;
  valor: string;
}): string {
  const primeiroNome = dados.nome.trim().split(/\s+/)[0];
  return [
    primeiroNome ? 'Olá, ' + primeiroNome + '! Tudo bem? 🎭' : 'Olá! Tudo bem? 🎭',
    '',
    'Aqui é a equipe da *EducART*.',
    'Estamos acompanhando a mensalidade da turma *' + dados.turma.trim() + '*.',
    '',
    '*Referência:* ' + dados.competencia,
    '*Valor:* ' + dados.valor,
    '*Vencimento:* ' + dados.vencimento,
    '',
    'Ainda não identificamos uma confirmação de pagamento no nosso controle.',
    'Se você já realizou o Pix, por favor nos avise para conferirmos. Caso precise de orientação, estamos à disposição.',
    '',
    'Obrigado pela atenção!',
  ].join('\n');
}

/** Link individual iniciado por clique humano, sem envio por API. */
export function linkCobrancaMensalidadeEducart(
  telefone: string,
  mensagem: string,
): string | null {
  const digitos = telefone.replace(/\D/g, '');
  const nacional = digitos.startsWith('55') && digitos.length >= 12
    ? digitos.slice(2) : digitos;
  if (!/^\d{10,11}$/.test(nacional) || nacional.startsWith('00')) return null;
  return 'https://wa.me/55' + nacional + '?text=' + encodeURIComponent(mensagem);
}
