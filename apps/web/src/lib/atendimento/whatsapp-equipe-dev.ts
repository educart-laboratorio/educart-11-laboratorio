/**
 * EducART 1.1 — R07.1: link do primeiro contato da Secretaria.
 * O texto é rascunho; nenhuma mensagem é enviada automaticamente.
 * Isolado do botão WhatsApp flutuante e da experiência pública 1.0.
 */
import { mensagemPrimeiroContatoEquipe } from '../mensagens-whatsapp';

export function linkPrimeiroContatoSecretaria(telefoneBruto: string, nomeCompleto: string): string {
  const numero = telefoneBruto.replace(/\D/g, '');
  const numeroInternacional = numero.startsWith('55') ? numero : '55' + numero;
  return 'https://wa.me/' + numeroInternacional +
    '?text=' + encodeURIComponent(mensagemPrimeiroContatoEquipe(nomeCompleto));
}
