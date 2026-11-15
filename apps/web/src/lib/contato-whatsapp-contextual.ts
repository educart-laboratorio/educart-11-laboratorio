/**
 * Contexto seguro e não sensível para abrir uma conversa de WhatsApp.
 * Nunca inclui nomes, respostas pessoais ou campos do formulário.
 * O usuário revisa e envia a mensagem manualmente no WhatsApp.
 */
export type ContextoWhatsApp =
  | 'inicio'
  | 'escolha-area'
  | 'objetivo'
  | 'faixa-etaria'
  | 'idade-indisponivel'
  | 'experiencia'
  | 'catalogo'
  | 'catalogo-detalhes'
  | 'inscricao-objetivo'
  | 'inscricao-dados'
  | 'inscricao-confirmacao'
  | 'inscricao-enviada'
  | 'perfis'
  | 'generico';

export const NUMERO_WHATSAPP_EDUCART = '5571996824505';

const descricoes: Record<ContextoWhatsApp, string> = {
  inicio: 'Estou na página inicial, conhecendo a EducART.',
  'escolha-area': 'Estou escolhendo uma área do portal EducART e quero entender as possibilidades.',
  objetivo: 'Estou na etapa em que escolho o que desejo desenvolver com a formação artística.',
  'faixa-etaria': 'Estou na etapa de escolha da faixa etária para a Formação de Atores.',
  'idade-indisponivel': 'Estou consultando as condições de idade para participar da formação.',
  experiencia: 'Estou na etapa sobre experiência prévia com atuação.',
  catalogo: 'Estou explorando o *catálogo de soluções* da EducART e quero conhecer melhor as opções.',
  'catalogo-detalhes': 'Estou no *catálogo de soluções* e abri os detalhes da *Formação de Atores*.',
  'inscricao-objetivo': 'Estou preenchendo a *inscrição* e cheguei à etapa sobre meus objetivos.',
  'inscricao-dados': 'Estou preenchendo a *inscrição* e cheguei à etapa dos meus dados de contato.',
  'inscricao-confirmacao': 'Estou na etapa final de *revisão e confirmação da inscrição*.',
  'inscricao-enviada': 'Acabei de concluir a ficha de *inscrição para a Formação de Atores* e quero conversar sobre os próximos passos.',
  perfis: 'Estou conhecendo os *perfis artísticos* e suas possibilidades na EducART.',
  generico: 'Estou navegando pelo portal *EducART* e gostaria de tirar uma dúvida.',
};

export function mensagemWhatsAppContextual(contexto: ContextoWhatsApp): string {
  return [
    'Olá! Tudo bem? 🎭',
    '',
    '*Meu contato vem do portal EducART.*',
    '',
    descricoes[contexto],
    '',
    'Gostaria de conversar diretamente com a coordenação sobre isso.',
    '',
    'Podemos falar por aqui?',
  ].join('\n');
}

export function linkWhatsAppContextual(contexto: ContextoWhatsApp): string {
  return 'https://wa.me/' + NUMERO_WHATSAPP_EDUCART +
    '?text=' + encodeURIComponent(mensagemWhatsAppContextual(contexto));
}
