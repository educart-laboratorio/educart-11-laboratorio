import assert from 'node:assert/strict';
import {resumoAcordoR11} from '../src/lib/financeiro/resumo-acordo-r11.ts';
import {readFileSync} from 'node:fs';
const a=resumoAcordoR11('2026-01',10,32000,[1,3,7],[],'2026-11-05');
assert.equal(a.linhas.length,24);
assert.equal(a.periodoFim,'2027-12');
assert.equal(a.totalCentavos,768000);
assert.equal(a.marcadasHistoricas,3);
assert.equal(a.restanteCentavos,672000);
assert.equal(a.linhas[0].situacao,'historico_a_conferir');
assert.equal(a.linhas[1].situacao,'venceria');
assert.equal(a.linhas[2].situacao,'historico_a_conferir');
assert.equal(a.linhas[10].situacao,'pendente');
assert.equal(a.linhas[11].situacao,'futura');
assert.equal(a.linhas[23].vencimento,'2027-12-10');
const b=resumoAcordoR11('2026-10',25,25000,[1,3],[1],'2026-11-05');
assert.equal(b.pagasExistentes,1);
assert.equal(b.marcadasHistoricas,1,'Não contar a mesma parcela duas vezes');
assert.equal(b.marcadoQuitadoCentavos,50000);
assert.equal(b.linhas[1].situacao,'pendente');
assert.throws(()=>resumoAcordoR11('2026-13',10,32000,[],[],'2026-11-05'));
assert.throws(()=>resumoAcordoR11('2026-11',31,32000,[],[],'2026-11-05'));
const ui=readFileSync('src/components/AdminFinanceiroEdicaoR11Dev.tsx','utf8');
for(const n of ['1. Configurar acordo financeiro','2. Conferir histórico de pagamentos',
 'Revisão antes da confirmação','revisao.linhas.map','reais(revisao.totalCentavos)',
 'reais(revisao.restanteCentavos)','p_confirmei_documentos','p_confirmo_plano',
 'acordoSemAtivacao'])assert(ui.includes(n),'Falta R11.5: '+n);
console.log('R11.5 PASS: revisão completa 24/24, valores, período, quitações divergentes e nenhuma escrita no resumo.');
