/** Q2/Q4: contrato local do cadastro guiado, sem autenticação, dados ou deploy. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=(p)=>readFileSync(p,'utf8');
const guiado=src('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const academia=src('src/components/AdminRotinaAcademicaLab.tsx');
const sql=src('../../supabase/security-review/EDUCART_11_DEV_PLANEJAMENTO_FORMACAO_TURMA_GUIADA_20261105.sql');
assert.match(academia, /<AdminPlanejamentoFormacaoTurmaDev/);
assert.doesNotMatch(academia, /<AdminTurmasDev/);
for (const campo of [
  'nome','tipo','descricao','publico_alvo','idade_minima','exige_experiencia',
  'duracao_meses','carga_horaria_horas','ementa','modulos_planejados',
  'avaliacao','criterios_conclusao','inicio_em','termina_em','capacidade',
  'responsavel_nome','local_nome','local_endereco','inscricoes_abrem_em',
  'inscricoes_encerram_em','horarios_semanais'
]) {
  assert(guiado.includes(campo), 'Campo ausente no formulário: '+campo);
  assert(sql.includes(campo), 'Campo ausente do SQL: '+campo);
}
for (const etapa of ['Que formação vamos oferecer','funciona pedagogicamente',
  'Horários próprios desta turma','Revise os dados antes de salvar']) {
  assert(guiado.includes(etapa),'Etapa ausente: '+etapa);
}
assert(guiado.includes('avancarEtapaCadastro(modo,etapa,erroEtapa)'));
assert(guiado.includes('const etapas=etapasParaConcluir(modo);'));
assert(guiado.includes('educart-formacao-card')&&guiado.includes('educart-turma-card'));
assert(guiado.includes('Gerir formação')&&guiado.includes('Gerir alunos')&&guiado.includes('Excluir turma'));
assert(guiado.includes("onClick={()=>abrirFichaTurma(t.id)}")&&guiado.includes("onClick={()=>void excluirTurma(t)}"));
assert(!guiado.includes("supabase.from('turmas').update("),'Ajuste visual não autoriza edição de turmas');
assert.match(guiado,/supabase\.auth\.getUser\(\)/);
assert.match(guiado,/papeis\.includes\('coordenacao'\)/);
assert.match(guiado,/supabase\.rpc\('educart_criar_formacao_turma_guiada_dev'/);
assert.match(sql,/SECURITY INVOKER SET search_path=''/);
assert.match(sql,/REVOKE ALL ON FUNCTION .* FROM PUBLIC, anon/);
assert.match(sql,/GRANT EXECUTE ON FUNCTION .* TO authenticated/);
assert.match(sql,/EXISTS\(SELECT 1 FROM public\.portal_admins/);
assert.match(sql,/EXISTS\(SELECT 1 FROM public\.equipe_papeis/);
assert.match(sql,/FOR v_item IN SELECT value FROM jsonb_array_elements\(v_horarios\)/);
assert.match(sql,/v_dia=ANY\(v_dias\)/);
assert.match(sql,/v_inicio >= v_fim/);
assert.match(sql,/'planejada'/);
assert.match(sql,/v_nome,v_tipo,false/);
assert.doesNotMatch(guiado,/service_role|SUPABASE_SERVICE_ROLE_KEY|\.from\('inscricoes_oficina'\)/i);
assert.doesNotMatch(guiado,/deploy|window\.location\.href|fetch\('https:\/\//i);
console.log('OK: etapas, grade por turma, persistência transacional e segurança RLS (contrato estático).');
