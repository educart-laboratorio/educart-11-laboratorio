import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FORMATOS_EXTRAS, obterFormatoExtra, simularInvestimentoExtra,
  moedaBRL, MAX_PARTICIPANTES_CENARIO,
} from '../src/lib/comercial/formatos-extras.ts';

assert.equal(FORMATOS_EXTRAS.length,6);
assert.deepEqual(FORMATOS_EXTRAS.map(f=>f.codigo),['F01','F02','F03','F04','F05','F06']);
assert.deepEqual(FORMATOS_EXTRAS.map(f=>f.externoCentavos),[30000,40000,50000,60000,90000,100000]);
assert.deepEqual(FORMATOS_EXTRAS.map(f=>f.atorEducartCentavos),[15000,20000,25000,30000,45000,50000]);
for(const f of FORMATOS_EXTRAS){
  assert.equal(f.atorEducartCentavos*2,f.externoCentavos);
  assert(f.encontros>=1&&f.horasPorEncontro>=2);
  assert.equal(simularInvestimentoExtra(f.codigo,0,0).potencialBrutoCentavos,0);
}
assert.equal(obterFormatoExtra('F07'),null);
const cenario=simularInvestimentoExtra('F03',2,3);
assert.deepEqual([cenario.totalPessoas,cenario.horasTotais,cenario.investimentoExternoCentavos,cenario.investimentoAtorCentavos,cenario.potencialBrutoCentavos],
  [5,4,100000,75000,175000]);
assert.equal(moedaBRL(175000), 'R$ 1.750,00');
for(const valores of [[-1,0],[1.5,0],[NaN,0],[Infinity,0],[10001,0],[0,-1],[0,10001]])
  assert.throws(()=>simularInvestimentoExtra('F01',...valores),RangeError);
assert.throws(()=>simularInvestimentoExtra('F00',1,1),RangeError);
assert.equal(simularInvestimentoExtra('F06',MAX_PARTICIPANTES_CENARIO,MAX_PARTICIPANTES_CENARIO).potencialBrutoCentavos,1500000000);
const front=readFileSync('src/components/AdminComercialFinanceiroExtras.tsx','utf8');
const parent=readFileSync('src/components/AdminFinanceiroDev.tsx','utf8');
for(const term of ['DC-093','Potencial bruto hipotético','Não são receitas','Formações em planejamento','onChange','aria-pressed'])
  assert(front.includes(term),'Interface incompleta: '+term);
assert(!/\.rpc\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(|fetch\(/.test(front),'Painel de extras não pode gravar operações financeiras');
assert(front.includes("head:true") && front.includes("pendente_analise"),'Propostas docentes devem ser contadas por leitura agregada');
assert(front.includes("não são manifestações de interesse de estudantes"),'Propostas docentes não são leads estudantis');
assert(front.includes("Não foi possível consultar"),'Falha de leitura não pode virar zero fictício');
assert(parent.includes("supabase={supabase}"),'Fonte de dados do painel deve ser o cliente autorizado');
assert(parent.includes('AdminFinanceiroEssencialR11Dev') && parent.includes('AdminComercialFinanceiroExtras'));
assert(parent.includes('rascunhoPendente'),'Mudança de frente deve proteger rascunhos não salvos');
console.log('PASS: 6 formatos DC-093, simulação hipotética, validações, isolamento e integração visual.');
