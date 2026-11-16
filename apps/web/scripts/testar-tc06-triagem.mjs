// TC-06: mapeamento semântico e anti-injeção de respostas da triagem.
import assert from 'node:assert/strict';
import { mapearTriagemInscricao } from '../src/lib/triagem-inscricao.ts';
const cases = [
  ['Atuação profissional', 'Ser Ator/Atriz profissional', ''],
  ['Oratória e comunicação', 'Aprimorar comunicação e oratória', ''],
  ['Desinibição e confiança', 'Desinibição e desenvolvimento pessoal', ''],
  ['Arte e descoberta', 'Outro', 'Arte e descoberta'],
];
for (const [origem, objetivo, outro] of cases) {
  const mapped = mapearTriagemInscricao('?objetivo='+encodeURIComponent(origem));
  assert.equal(mapped?.objetivo, objetivo);
  assert.equal(mapped?.objetivoOutro, outro);
}
const exps = [
  ['Estou começando','Não'],
  ['Já participei de aulas ou oficinas','Sim'],
  ['Já tenho experiência em cena','Sim'],
];
for (const [origem, esperado] of exps) {
  assert.equal(mapearTriagemInscricao('?experiencia='+encodeURIComponent(origem))?.experienciaPrevia, esperado);
}
assert.equal(mapearTriagemInscricao('?objetivo=administrador&experiencia=injetado'),null,
  'Parametrizacao nao pode criar resposta desconhecida');
assert.equal(mapearTriagemInscricao('?objetivo=Ser%20Ator%2FAtriz%20profissional'),null,
  'Nao aceitar valores de formulário disfarçados de triagem');
assert.equal(mapearTriagemInscricao('?faixa='+encodeURIComponent('Até 13 anos'))?.faixaRotulo,'Até 13 anos',
  'O bloqueio de menores de 14 anos continua delegado a InscricaoElegibilidade/validacao');
assert.equal(mapearTriagemInscricao('?faixa=999%20anos'),null,'Faixa arbitraria recusada');
console.log('TC-06: 4 objetivos, 3 experiencias e negativas de URL: PASS');
