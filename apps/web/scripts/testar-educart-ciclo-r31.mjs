import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {competenciaValida,proximoMesSeguro,podeRegistrarPagamento,podeMatricularCadastro} from '../src/lib/admin/ingressos-coesao.ts';
assert(competenciaValida('2026-11'));
for (const mes of ['','2026-00','2026-13','2026-1','00-01','2026-nov','2026-11-01']) assert(!competenciaValida(mes),mes);
assert.equal(proximoMesSeguro('2026-12',1,'2026-11'),'2027-01');
assert.equal(proximoMesSeguro('2026-01',-1,'2026-11'),'2025-12');
assert.equal(proximoMesSeguro('',1,'2026-11'),'2026-11');
assert.equal(proximoMesSeguro('2026-13',1,'2026-11'),'2026-11');
assert.equal(proximoMesSeguro('2026-11',1.5,'2026-11'),'2026-11');
for(const status of ['pago','pendente']){
  assert(podeRegistrarPagamento('ativa',status,28000));
  for(const situacao of ['pendente','cancelada','trancada','inativa']){
    assert(!podeRegistrarPagamento(situacao,status,28000),situacao);
  }
}
for(const status of ['cancelado','isento','outro','']){
  assert(!podeRegistrarPagamento('ativa',status,28000),status);
}
assert(!podeRegistrarPagamento('ativa','pendente',0));
assert(!podeRegistrarPagamento('ativa','pago',undefined));
assert(podeMatricularCadastro('inscrito',false));
assert(podeMatricularCadastro('pendente',false));
assert(!podeMatricularCadastro('cancelado',false));
assert(!podeMatricularCadastro('matriculado',false));
assert(!podeMatricularCadastro('inscrito',true));
const ui=readFileSync('src/components/AdminIngressosSimplesDev.tsx','utf8');
assert(ui.includes("podeRegistrarPagamento(m.situacao,v.status,condicao?.valor_devido_centavos)"));
assert(ui.includes("v&&!podeRegistrarPagamento(m.situacao,v.status,c?.valor_devido_centavos)"));
assert(ui.includes("m.situacao!=='ativa'?<span>Vínculo"));
assert(ui.includes('proximoMesSeguro(s,d,competenciaHoje())'));
assert(ui.includes('competenciaValida(e.target.value)'));
assert(ui.includes('candidaturasDisponiveis=inscricoes.filter(i=>podeMatricularCadastro('));
console.log('R31 OK: competência robusta, pagamentos apenas para matrícula ativa e inscrição elegível.');
