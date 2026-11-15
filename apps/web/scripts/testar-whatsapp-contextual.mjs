import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  mensagemWhatsAppContextual,
  linkWhatsAppContextual,
  NUMERO_WHATSAPP_EDUCART,
} from '../src/lib/contato-whatsapp-contextual.ts';

const contextos = [
  'inicio','escolha-area','objetivo','faixa-etaria','idade-indisponivel','experiencia',
  'catalogo','catalogo-detalhes','inscricao-objetivo','inscricao-dados',
  'inscricao-confirmacao','inscricao-enviada','perfis','generico'
];

for (const contexto of contextos) {
  const mensagem = mensagemWhatsAppContextual(contexto);
  const url = new URL(linkWhatsAppContextual(contexto));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/' + NUMERO_WHATSAPP_EDUCART);
  assert.equal(url.searchParams.get('text'), mensagem);
  assert(mensagem.includes('EducART'));
  assert(mensagem.includes('\n\n'));
  assert(!/garantimos? vaga|sua vaga est[aá] confirmada|enviamos? automaticamente/i.test(mensagem));
}

assert(mensagemWhatsAppContextual('catalogo').includes('catálogo de soluções'));
assert(mensagemWhatsAppContextual('catalogo-detalhes').includes('Formação de Atores'));
assert(mensagemWhatsAppContextual('inscricao-confirmacao').includes('confirmação da inscrição'));

const read = p => fs.readFileSync(p, 'utf8');
const entrada = read('src/components/EntradaEducart.tsx');
const catalogo = read('src/app/formacao/page.tsx');
const formulario = read('src/components/InscricaoForm.tsx');
const layout = read('src/app/layout.tsx');
const flutuante = read('src/components/WhatsAppFlutuante.tsx');
const css = read('src/app/globals.css');

assert(entrada.includes('data-educart-etapa={etapa}'));
assert(catalogo.includes('data-catalog-detail-open={detalhe ?')&&
  catalogo.includes('janela.showModal()')&&catalogo.includes('janela.close()'),
  'Contexto do WhatsApp deve identificar corretamente o modal Conhecer');
assert(formulario.includes('data-inscricao-step={step}'));
assert(layout.includes('<WhatsAppFlutuante />'));
assert(flutuante.includes('linkWhatsAppContextual(identificarContexto())'));
assert(flutuante.includes('target="_blank"'));
assert(flutuante.includes('aria-label='));
assert(css.includes('position: fixed;'));
assert(css.includes('.educart-whatsapp-persistente'));
assert(catalogo.includes('<CasaGameleiraLink />'));
assert.equal(formulario.split('<CasaGameleiraLink />').length, 3);
assert.equal(formulario.split('{HORARIO_TURMA_FORMACAO}').length, 3);
assert(!formulario.includes('A confirmar com a coordenação'));

const casa = read('src/components/CasaGameleiraLink.tsx');
assert(casa.includes('15h às 17h'));
assert(casa.includes('https://www.instagram.com/acasagameleira/'));

console.log('OK: mensagens por 14 contextos, link correto, horário, Casa Gameleira e botão global persistente.');
