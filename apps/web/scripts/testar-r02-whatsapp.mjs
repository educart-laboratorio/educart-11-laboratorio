/**
 * EducART 1.1 | R02 — Regressão funcional do WhatsApp original (LIPE).
 *
 * Executa a própria função identificarContexto, extraída sem mudança
 * semântica de WhatsAppFlutuante.tsx, com DOM sintético. Não recria
 * o botão, não toca produção e não envia mensagens.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
  NUMERO_WHATSAPP_EDUCART,
  mensagemWhatsAppContextual,
  linkWhatsAppContextual,
} from '../src/lib/contato-whatsapp-contextual.ts';

const read = p => fs.readFileSync(p, 'utf8');
const codigo = read('src/components/WhatsAppFlutuante.tsx');
const css = read('src/app/globals.css');
const layout = read('src/app/layout.tsx');
const etapasPublicas = read('src/components/EntradaEducart.tsx');
const formulario = read('src/components/InscricaoForm.tsx');
const catalogo = read('src/app/formacao/page.tsx');
const lei = read('../../LEI_INTRANSPONIVEL_PRESERVACAO_EVOLUTIVA_AUTODEV.md');
const manifesto = JSON.parse(read('../../AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json'));

assert(lei.includes('LIPE'));
assert.equal(manifesto.production.gitCommit, '5844b0408a8e53c4c283916ef1a1310b753350c9');
// R02 deve continuar autorizado mesmo após novas alterações LIPE independentes.
const patchR02 = manifesto.laboratory.approvedChanges.find(
  x => x.workOrder === 'R02' && x.path === 'apps/web/src/components/WhatsAppFlutuante.tsx'
);
assert(patchR02, 'Patch R02 deve permanecer aprovado');
assert.equal(patchR02.productionBlobSha, 'd83ff03138e5d49f0c55bde38e25777b552b8a27');
assert.equal(patchR02.reviewedLabBlobSha, '0e405ea445c8704580dd2e21fcdac76cc893c378');

const inicio = codigo.indexOf('function identificarContexto(): ContextoWhatsApp {');
const fim = codigo.indexOf('\nexport function WhatsAppFlutuante()', inicio);
assert(inicio !== -1 && fim > inicio, 'Função do componente original não encontrada');
const funcaoReal = codigo.slice(inicio, fim)
  .replace('function identificarContexto(): ContextoWhatsApp', 'function identificarContexto()')
  .replace('const etapas: Record<string, ContextoWhatsApp>', 'const etapas');
assert(!funcaoReal.includes(': ContextoWhatsApp'), 'Não reimplementar função, adaptar só anotação TS');

// Cada caso chama a função original com um pathname e DOM de elementos
// existentes na interface real; sem simular lógica de roteamento.
const casos = [
  ['abertura original', '/', {'[data-educart-etapa]':'abertura'}, 'inicio'],
  ['escolha de área', '/', {'[data-educart-etapa]':'interesses'}, 'escolha-area'],
  ['objetivo', '/', {'[data-educart-etapa]':'objetivo'}, 'objetivo'],
  ['faixa etária', '/', {'[data-educart-etapa]':'idade'}, 'faixa-etaria'],
  ['menor de 14 anos na triagem', '/', {'[data-educart-etapa]':'idade-indisponivel'}, 'idade-indisponivel'],
  ['experiência', '/', {'[data-educart-etapa]':'experiencia'}, 'experiencia'],
  ['home antes do React', '/', {}, 'inicio'],
  ['catálogo', '/formacao', {'[data-catalog-detail-open]':'false'}, 'catalogo'],
  ['detalhes de catálogo', '/formacao/', {'[data-catalog-detail-open]':'true'}, 'catalogo-detalhes'],
  ['inscrição etapa 1', '/inscricao', {'[data-inscricao-step]':'1'}, 'inscricao-objetivo'],
  ['inscrição etapa 2', '/inscricao', {'[data-inscricao-step]':'2'}, 'inscricao-dados'],
  ['inscrição etapa 3', '/inscricao', {'[data-inscricao-step]':'3'}, 'inscricao-confirmacao'],
  ['inscrição concluída', '/inscricao', {'.form-success-card':'presente'}, 'inscricao-enviada'],
  ['inscrição sem ficha - bloqueio etário ou carregamento', '/inscricao', {}, 'generico'],
  ['inscrição com etapa desconhecida', '/inscricao', {'[data-inscricao-step]':'9'}, 'generico'],
  ['perfis de demonstração', '/niveis-demo', {}, 'perfis'],
  ['área administrativa sem dados pessoais', '/admin', {}, 'generico'],
  ['página não reconhecida', '/pagina-desconhecida', {}, 'generico'],
];
for (const [rotulo, pathname, selectors, esperado] of casos) {
  const window = {location:{pathname}};
  const document = {
    querySelector: seletor => Object.hasOwn(selectors, seletor)
      ? {getAttribute:()=>selectors[seletor]}
      : null,
  };
  const result = vm.runInNewContext(
    funcaoReal + '\nidentificarContexto();',
    {window,document},
    {timeout:1000,filename:'WhatsAppFlutuante.tsx:identificarContexto'}
  );
  assert.equal(result, esperado, rotulo);
  const mensagem = mensagemWhatsAppContextual(result);
  const url = new URL(linkWhatsAppContextual(result));
  assert.equal(url.origin, 'https://wa.me', rotulo);
  assert.equal(url.pathname, '/' + NUMERO_WHATSAPP_EDUCART, rotulo);
  assert.equal(url.searchParams.get('text'), mensagem, rotulo);
  assert(mensagem.includes('EducART'), rotulo);
  assert(!/garantida|pagamento confirmado|matrícula aprovada|vaga reservada/i.test(mensagem), rotulo);
  console.log('R02 OK:',rotulo,'→',result);
}
assert.equal(NUMERO_WHATSAPP_EDUCART, '5571996824505');
assert(mensagemWhatsAppContextual('idade-indisponivel').includes('condições de idade'));
assert(mensagemWhatsAppContextual('inscricao-confirmacao').includes('revisão e confirmação'));
assert(mensagemWhatsAppContextual('inscricao-enviada').includes('concluir'));
assert(mensagemWhatsAppContextual('catalogo-detalhes').includes('Formação de Atores'));

// O href genérico inicial é proposital; o contexto é identificado ao toque.
assert(codigo.includes("href={linkWhatsAppContextual('generico')}"));
assert(codigo.includes('evento.currentTarget.href = linkWhatsAppContextual(identificarContexto());'));
assert(codigo.includes('onClick={prepararConversa}'));
assert(codigo.includes('target="_blank"'));
assert(codigo.includes('rel="noopener noreferrer"'));
assert(codigo.includes('aria-label="Abrir WhatsApp da EducART com mensagem sobre esta página"'));

// SVG original, nunca imitação de texto/emoji no lugar da marca.
assert.equal((codigo.match(/<svg\b/g) || []).length, 1);
assert.match(codigo, /<svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor"/);
assert.match(codigo, /<path d="M20\.52 3\.48A11\.8 11\.8 0 0 0 12\.07 0/);
assert(!codigo.includes('className="wa-glyph"'));
assert(!codigo.includes('<span className="wa-glyph">'));

// Persistente na raiz real, sem renderização condicional ou overlay local.
assert.equal(layout.split('<WhatsAppFlutuante />').length, 2);
assert.match(css, /\.educart-whatsapp-persistente\s*\{[^}]*position:\s*fixed;/s);
assert.match(css, /\.educart-whatsapp-persistente\s*\{[^}]*z-index:\s*1500;/s);
assert.match(css, /bottom:\s*calc\(18px \+ env\(safe-area-inset-bottom, 0px\)\)/);
assert.match(css, /@media \(max-width: 640px\)\s*\{[\s\S]*?\.educart-whatsapp-persistente\s*\{[\s\S]*?width:\s*51px/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\.educart-whatsapp-persistente/);
assert(etapasPublicas.includes('data-educart-etapa={etapa}'));
assert(catalogo.includes('data-catalog-detail-open={detalhe ?')&&
  catalogo.includes('janela.showModal()')&&catalogo.includes('janela.close()'),
  'Contexto do WhatsApp deve identificar corretamente o modal Conhecer');
assert(formulario.includes('data-inscricao-step={step}'));
assert(formulario.includes('className="form-success-card"'));

console.log('\nR02 APROVADO: ' + casos.length + ' contextos dinamicamente executados, mensagens verificadas, SVG intacto, botão global fixo e mobile CSS preservado. Sem deploy.');
