import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  mensagemInformacoesFormacao,
  mensagemCandidatoInscrito,
  mensagemPrimeiroContatoEquipe,
  mensagemAcompanhamentoInscricao,
} from '../src/lib/mensagens-whatsapp.ts';

const cases = [
  mensagemInformacoesFormacao(),
  mensagemCandidatoInscrito({ nome:'Pessoa Exemplo',telefone:'(71) 99999-0000',objetivo:'Atuação profissional' }),
  mensagemPrimeiroContatoEquipe('Pessoa Exemplo'),
  mensagemAcompanhamentoInscricao(),
];
for(const msg of cases) {
  assert(msg.includes('Oficina de Atores Salvador'));
  assert(msg.includes('EducART'));
  assert(msg.includes('Formação de Atores'));
  assert(msg.includes('\n\n'));
  assert(!/Turma de Outubro|confirmar minha vaga|garantir sua vaga/i.test(msg));
  const href='https://wa.me/5571996824505?text='+encodeURIComponent(msg);
  assert.equal(decodeURIComponent(new URL(href).searchParams.get('text')),msg);
}
assert(cases[0].includes('a partir dos 14 anos'));
assert(cases[1].includes('Pessoa Exemplo'));
assert(cases[1].includes('Atuação profissional'));
assert(cases[1].includes('(71) 99999-0000'));
assert(cases[2].includes('Olá, Pessoa!'));
for(const p of ['src/app/admin/page.tsx','src/app/formacao/page.tsx','src/components/InscricaoForm.tsx']){
  assert(fs.readFileSync(p,'utf8').includes('mensagem'),p+' must use centralized draft');
}
console.log('OK: four prefilled WhatsApp drafts, dynamic fields, manual wa.me links and no obsolete promises.');
