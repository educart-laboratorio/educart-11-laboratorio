import assert from 'node:assert/strict';
import {TOTAL_PARCELAS_FORMACAO,somarMeses,montarProgresso24,historicoAteMesAtual} from '../src/lib/financeiro/progresso-24.ts';
assert.equal(TOTAL_PARCELAS_FORMACAO,24);
assert.equal(somarMeses('2026-11',1),'2026-12');
assert.equal(somarMeses('2026-11',2),'2027-01');
assert.equal(somarMeses('2024-02',23),'2026-01');
const semPlano=montarProgresso24(null,[],'2026-11-05');
assert.equal(semPlano.parcelas.length,24);
assert.equal(semPlano.pagas,0);
assert.equal(semPlano.vencidas,0);
assert(semPlano.parcelas.every(p=>p.estado==='sem_plano'));
assert.deepEqual(historicoAteMesAtual(semPlano,'2026-11-05'),[]);
const p=montarProgresso24('2026-09',[
 {competencia:'2026-09-01',vencimento_em:'2026-09-10',status:'pago',confirmado_em:'2026-09-11T14:00:00Z'},
 {competencia:'2026-10-01',vencimento_em:'2026-10-10',status:'pendente',confirmado_em:null},
 {competencia:'2026-11-01',vencimento_em:'2026-11-20',status:'pendente',confirmado_em:null},
 {competencia:'2026-12-01',vencimento_em:'2026-12-10',status:'cancelado',confirmado_em:null},
],'2026-11-05');
assert.equal(p.parcelas.length,24);
assert.equal(p.parcelas[0].estado,'paga');
assert.equal(p.parcelas[1].estado,'vencida');
assert.equal(p.parcelas[2].estado,'pendente');
assert.equal(p.parcelas[3].estado,'cancelada');
assert.equal(p.parcelas[4].estado,'sem_lancamento');
assert.deepEqual([p.pagas,p.vencidas,p.pendentes,p.semLancamento],[1,1,1,20]);
assert.equal(historicoAteMesAtual(p,'2026-11-05').length,3);
const naoComprovada=montarProgresso24('2026-11',[
 {competencia:'2026-11-01',vencimento_em:'2026-11-01',status:'pago',confirmado_em:null}
],'2026-11-05');
assert.equal(naoComprovada.pagas,0,'Nunca mostrar verde sem confirmação persistida');
assert.equal(naoComprovada.vencidas,0,'Não presumir dívida sem dado confiável');
assert.throws(()=>montarProgresso24('2026-11',[
 {competencia:'2026-11-01',vencimento_em:'2026-11-10',status:'pendente',confirmado_em:null},
 {competencia:'2026-11-01',vencimento_em:'2026-11-10',status:'pendente',confirmado_em:null}
],'2026-11-05'));

const alunoA=montarProgresso24('2025-01',[
 {competencia:'2025-01-01',vencimento_em:'2025-01-10',status:'pago',confirmado_em:'2025-01-09T12:00:00Z'},
 {competencia:'2025-02-01',vencimento_em:'2025-02-10',status:'pendente',confirmado_em:null},
 {competencia:'2025-03-01',vencimento_em:'2025-03-10',status:'pago',confirmado_em:'2025-03-08T12:00:00Z'},
 {competencia:'2025-04-01',vencimento_em:'2025-04-10',status:'pendente',confirmado_em:null},
 {competencia:'2025-05-01',vencimento_em:'2025-05-10',status:'pago',confirmado_em:'2025-05-07T12:00:00Z'},
],'2026-11-05');
const alunoB=montarProgresso24('2026-10',[
 {competencia:'2026-10-01',vencimento_em:'2026-10-20',status:'pago',confirmado_em:'2026-10-20T12:00:00Z'},
 {competencia:'2026-11-01',vencimento_em:'2026-11-20',status:'pendente',confirmado_em:null},
],'2026-11-05');
assert.equal(alunoA.pagas,3);
assert.equal(alunoA.vencidas,2);
assert.equal(alunoA.parcelas[1].estado,'vencida');
assert.equal(alunoA.parcelas[2].estado,'paga');
assert.equal(alunoA.parcelas[5].estado,'sem_lancamento');
assert.equal(alunoB.pagas,1);
assert.equal(alunoB.vencidas,0);
assert.equal(alunoB.parcelas[1].estado,'pendente');
assert.equal(alunoB.parcelas[2].estado,'sem_lancamento');
assert.equal(historicoAteMesAtual(alunoB,'2026-11-05').length,2);
assert.equal(historicoAteMesAtual(alunoA,'2026-11-05').length,23);


const comFutura=montarProgresso24('2026-10',[
 {competencia:'2026-10-01',vencimento_em:'2026-10-20',status:'pago',confirmado_em:'2026-10-20T10:00:00Z'},
 {competencia:'2026-11-01',vencimento_em:'2026-11-25',status:'pendente',confirmado_em:null},
 {competencia:'2026-12-01',vencimento_em:'2026-12-25',status:'pendente',confirmado_em:null}
],'2026-11-05');
assert.equal(comFutura.parcelas[0].estado,'paga');
assert.equal(comFutura.parcelas[1].estado,'pendente');
assert.equal(comFutura.parcelas[2].estado,'futura','Competência futura não deve aparecer como cobrança atual');
assert.equal(comFutura.vencidas,0,'Futuro não cria atraso');

console.log('R11 PASS: 24 parcelas, virada de ano, atraso real, status desconhecido e histórico até mês atual.');
