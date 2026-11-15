import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('../../supabase/security-review/EDUCART_11_DEV_R12_AJUSTES_AULAS_AUDITADOS_20261105.sql','utf8');
const reparo=readFileSync('../../supabase/security-review/EDUCART_11_DEV_R12_REPARO_REMARCACAO_IMUTAVEL_20261105.sql','utf8');
const ui=readFileSync('src/components/AdminChamadasDev.tsx','utf8');
const me=readFileSync('src/app/minha-educart/page.tsx','utf8');
for(const str of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','SECURITY DEFINER','SECURITY INVOKER',
  "v_aula.situacao<>'planejada'",'educart_chamadas_dev','p_confirmo IS DISTINCT FROM TRUE','p_motivo','data_anterior','registrado_por'])
 assert(sql.includes(str),'Ajuste sem guarda: '+str);
for(const str of ['Remarcar ou cancelar esta aula','educart_r12_ajustar_aula_dev','setConfirmoAgenda','Ajuste de aula registrado e auditado','Histórico de remarcações e cancelamentos'])
 assert(ui.includes(str),'Interface de ajuste incompleta: '+str);
assert(me.includes('Aulas canceladas na sua turma'));
assert(me.includes("a.situacao==='cancelada'"));
assert(!sql.includes('DELETE FROM public.educart_aulas_dev'));
assert(reparo.includes('aula_substituta_id'),'Remarcação exige elo de substituição auditado');
assert(reparo.includes("SET situacao='cancelada'"),'Aula original deve permanecer cancelada');
assert(reparo.includes('INSERT INTO public.educart_aulas_dev'),'Nova aula deve receber identidade própria');
assert(!reparo.includes('SET data_aula='),'Não reescrever a identidade da aula');
assert(ui.includes('aula_substituta_id'),'Interface identifica aula substituta');
console.log('Q10 PASS: aulas auditadas, cancelamento/remarcação e informação individual sem envio automático.');
