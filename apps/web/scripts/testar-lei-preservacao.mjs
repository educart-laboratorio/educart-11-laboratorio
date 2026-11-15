import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const home = read('src/app/page.tsx');
const entrada = read('src/components/EntradaEducart.tsx');
const layout = read('src/app/layout.tsx');
const css = read('src/app/globals.css');
const whats = read('src/components/WhatsAppFlutuante.tsx');
const contato = read('src/lib/contato-whatsapp-contextual.ts');
const formacao = read('src/app/formacao/page.tsx');
const inscricao = read('src/app/inscricao/page.tsx');
const ficha = read('src/components/InscricaoForm.tsx');
const admin = read('src/app/admin/page.tsx');
const csvSeguro = read('src/lib/csv-seguro.ts');
const marca = read('src/components/EducartLogo.tsx');

const checks = [
  // Testes de CONTINUIDADE FUNCIONAL 1.1: leis antigas não são veto de lançamento.
  ['portal mantém entrada real', home.includes('<EntradaEducart />')],
  ['painel valida sessão e papéis', admin.includes('supabase.auth.getUser()') && admin.includes('obterPapeisGestao')],
  ['home importa a entrada verdadeira', home.includes("import { EntradaEducart } from '@/components/EntradaEducart'")],
  ['home renderiza entrada da aplicação real', home.includes('<EntradaEducart />')],
  ['jornada de entrada preservada', entrada.includes('data-educart-etapa={etapa}')],
  ['layout monta componente original do WhatsApp', layout.includes('<WhatsAppFlutuante />')],
  ['WhatsApp mantém ícone acessível', whats.includes('<svg') && whats.includes('aria-')],
  ['WhatsApp utiliza link contextual', whats.includes('linkWhatsAppContextual(identificarContexto())')],
  ['WhatsApp persistente não perde classe', whats.includes('className="educart-whatsapp-persistente"')],
  ['WhatsApp persistente não perde fixed', /\.educart-whatsapp-persistente\s*\{[^}]*position:\s*fixed/s.test(css)],
  ['contexto do catálogo preservado', contato.includes("'catalogo-detalhes':")],
  ['contexto da inscrição preservado', contato.includes("'inscricao-confirmacao':")],
  ['número de contato original preservado', contato.includes("NUMERO_WHATSAPP_EDUCART = '5571996824505'")],
  ['marca oficial permanece centralizada', marca.includes('NÚCLEO DE FORMAÇÃO DE ATORES')],
  ['formação preserva Casa Gameleira', formacao.includes('CasaGameleiraLink')],
  ['formação preserva faixa etária', formacao.includes('FAIXA_ATE_13')],
  ['formação preserva horário existente', formacao.includes('HORARIO_TURMA_FORMACAO')],
  ['inscrição usa formulário original', inscricao.includes('<InscricaoElegibilidade />')],
  ['envio real preservado no formulário', ficha.includes(".from('inscricoes_oficina').insert([payload])")],
  ['painel real mantém autenticação', admin.includes('supabase.auth.getUser()')],
  ['painel preserva campanhas', admin.includes('classificarCampanha')],
  ['painel preserva a gestão existente', admin.includes("areaAtiva === 'inscricoes'")],
  ['painel incorpora módulo acadêmico', admin.includes('<AdminRotinaAcademicaLab supabase={supabase}')],
  ['CSV original protegido', admin.includes('gerarCsvExcel(headers, rows)') && csvSeguro.includes('campos.map(csvCellSeguro)')],
];
let errors = 0;
for (const [name, ok] of checks) {
  if (!ok) { console.error('REGRESSÃO FUNCIONAL 1.1:', name); errors++; }
  else console.log('OK:', name);
}
assert.equal(errors, 0, `Regressões funcionais encontradas: ${errors}. Corrigir o comportamento atual sem restaurar vetos históricos.`);
console.log('R42 PASS: continuidade funcional da EducART 1.1 verificada por invariantes atuais, sem veto de UI da 1.0.');
