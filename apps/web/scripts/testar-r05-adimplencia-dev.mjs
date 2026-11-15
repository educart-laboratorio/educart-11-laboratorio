/** R05: cenários financeiros sintéticos; sem acessar dados reais. */
import assert from 'node:assert/strict';
import {classificarAdimplencia} from '../src/lib/financeiro/adimplencia-dev.ts';

const hoje = '2026-11-05';
const confirmado = {
  competencia:'2026-11-01', vencimento_em:'2026-11-10',
  status:'pago', confirmado_em:'2026-11-05T10:00:00Z',
  confirmado_por:'00000000-0000-4000-8000-000000000001',
};
const pendente = {
  ...confirmado, status:'pendente', confirmado_em:null, confirmado_por:null,
};
const cenário = (titulo, parcelas, esperado, completo=true) => {
  assert.equal(classificarAdimplencia(parcelas, hoje, completo), esperado, titulo);
  console.log('OK: '+titulo);
};
cenário('verde exige confirmação E competência atual', [confirmado], 'regular');
cenário('vermelho se há pendência vencida', [
  confirmado, {...pendente,competencia:'2026-10-01',vencimento_em:'2026-10-10'}
], 'vencido');
cenário('amarelo se pendente a vencer', [pendente], 'pendente');
cenário('pagamento sem autor não é verde', [{...confirmado,confirmado_por:null}], 'conferencia');
cenário('pagamento sem data de confirmação não é verde', [{...confirmado,confirmado_em:null}], 'conferencia');
cenário('pagamento antigo sem competência atual não é verde', [
  {...confirmado, competencia:'2026-10-01'}
], 'sem_competencia');
cenário('sem cobrança cadastrada é neutro', [], 'sem_lancamento');
cenário('somente cobranças canceladas é neutro', [{...pendente,status:'cancelado'}], 'sem_lancamento');
cenário('amostra potencialmente truncada é neutra', [confirmado], 'amostra_incompleta', false);
assert.equal(classificarAdimplencia([confirmado], 'x', true), 'amostra_incompleta');
console.log('OK: data inválida é neutra');
console.log('R05 financeiro: 10 cenários de regressão conservadora aprovados.');
