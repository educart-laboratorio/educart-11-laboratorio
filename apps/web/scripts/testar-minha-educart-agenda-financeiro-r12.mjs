import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const x=readFileSync('src/app/minha-educart/page.tsx','utf8');
const css=readFileSync('src/app/minha-educart/minha-educart.css','utf8');
for(const s of ['.eq(\'auth_user_id\',user.id)','turmaIds','educart_aulas_dev','aulasProximas',
 'Próximas aulas','conferirExtratoR11Individual','educart_parcelas_financeiras_r11_dev',
 'matriculasComR11','me-parcelas','setParcelasR11','planosAtivosR11','mensalidades.filter'])
 assert(x.includes(s),'Minha EducART sem '+s);
assert(x.includes(".in('turma_id',turmaIds)"),'Agenda deve consultar turmas próprias e não apenas aulas com chamadas');
assert(x.includes("a.situacao==='planejada'"),'Não antecipar frequência sem aula realizada');
const extrato=readFileSync('src/lib/financeiro/extrato-individual-r11.ts','utf8');
assert(extrato.includes('montarProgresso24'),'A validação individual deve reutilizar a projeção R11 original');
assert(extrato.includes('parcelas.length!==24'),'Uma consulta parcial não pode ser exibida como extrato completo');
assert(x.includes("!matriculasComR11.has(m.matricula_id)"),'Não mostrar legadas duplicadas com R11');
assert(!x.includes("new Set(propria.map(item=>item.aula_id))"),'A agenda não depende de presença registrada');
assert(css.includes('me-parcela-vencida')&&css.includes('me-parcela-paga'));
console.log('R12 PASS: agenda pré-chamada e 24 parcelas próprias com RLS e sem duplicação legado/R11.');
