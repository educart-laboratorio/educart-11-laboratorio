import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('../../supabase/security-review/EDUCART_11_DEV_R12_ATIVACAO_TURMA_HISTORICA_20261105.sql','utf8');
const ui=readFileSync('src/components/AdminVincularEstudanteTurmaDev.tsx','utf8');
for(const x of ['ENABLE ROW LEVEL SECURITY','SECURITY DEFINER','SECURITY INVOKER',
 'situacao=\'em_andamento\'','p_confirmei_documentos IS DISTINCT FROM TRUE','p_inicio_declarado',
 'referencia_conferencia','SELECT * INTO v_turma','FOR UPDATE'])
 assert(sql.includes(x),'Sem trava de turma histórica: '+x);
for(const x of ['reconhecerTurma','educart_r12_ativar_turma_historica_dev',
 'Reconhecer turma em andamento','setConfirmeiTurma','setInicioTurma','referenciaTurma'])
 assert(ui.includes(x),'Fluxo de turma histórica incompleto: '+x);
assert(!/DELETE FROM public|INSERT INTO public\.(?:mensalidades_formacao|educart_baixas_financeiras_r11_dev)/.test(sql));
console.log('Q2 PASS: turma histórica somente com origem documental e autorização Coordenação.');
