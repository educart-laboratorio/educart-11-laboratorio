/** EducART · contrato de unificação do dia 07/11 no mesmo HEAD avaliável.
 * Valida estrutura; não equivale ao teste autenticado no navegador.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(p,'utf8');
const wizard=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const doc=ler('src/components/AdminDocentesDev.tsx');
const acad=ler('src/components/AdminRotinaAcademicaLab.tsx');
const admin=ler('src/app/admin/page.tsx');
const sql=ler('../../supabase/security-review/EDUCART_11_DEV_SOLUCOES_DOCENTES_TURMAS_20261106.sql');
const grants=ler('../../supabase/security-review/EDUCART_11_DEV_DOCENTES_PRIVILEGIOS_MINIMOS_20261106.sql');
const copilot=ler('../../.github/copilot-instructions.md');
const agents=ler('../../AGENTS.md');
for (const step of ['1. Solução','2. Conteúdo','3. Oferta','4. Professor','5. Turma','6. Revisão'])
  assert(wizard.includes(step),'Etapa ausente: '+step);
for (const field of ['chamada_curta','formato','objetivos','disciplinas','metodologia',
 'competencias','atividades_praticas','certificacao','projeto_final',
 'materiais_inclusos','perguntas_frequentes','valor_matricula_referencia_centavos',
 'valor_mensalidade_referencia_centavos','quantidade_mensalidades_referencia']) {
 assert(wizard.includes(field),'Campo comercial fora do formulário: '+field);
 assert(sql.includes(field),'Campo comercial fora do esquema DEV: '+field);
}
assert.match(wizard,/const dadosFormacao=\(\)=>/);
assert.match(wizard,/const salvarSolucaoRascunho=async/);
assert.match(wizard,/Guardar apenas a formação \(sem turma\)/);
assert.match(wizard,/window\.confirm\(/);
assert.match(wizard,/publicada:false/);
assert.match(wizard,/educart_criar_formacao_turma_guiada_dev/);
assert.match(wizard,/docente_id:docenteId/);
assert.match(wizard,/horarios_semanais:horarios\.map/);
assert(wizard.includes('const etapas=etapasParaConcluir(modo);'));
assert(wizard.includes('avancarEtapaCadastro(modo,etapa,erroEtapa)'));
assert(wizard.includes('voltarEtapaCadastro(modo,etapa)'));
assert.equal((wizard.match(/id="pgt-docente"/g)||[]).length,1,'Professor selecionado mais de uma vez');
assert.match(doc,/Editar ficha/);
assert.match(doc,/Copiar ficha para WhatsApp/);
assert.match(doc,/navigator\.clipboard\.writeText\(PERGUNTAS_PROFESSOR\)/);
assert.match(sql,/BEFORE INSERT ON public\.turmas/);
assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
assert.match(grants,/REVOKE ALL ON TABLE public\.educart_docentes_dev FROM PUBLIC, anon, authenticated/);
assert.equal((admin.match(/<nav className="admin-area-selector" aria-label="Quatro destinos/g)||[]).length,1,
  'Deve existir somente um menu principal com quatro destinos');
assert.equal((admin.match(/<nav className="admin-area-selector admin-subarea-selector"/g)||[]).length,1,
  'Submenu único, contextual ao grupo ativo');
assert.match(admin,/GRUPOS\.map\(item=>/);
assert.match(admin,/OPCOES_PESSOAS:OPCOES_FORMACOES/);
assert.match(admin,/solicitarDestino\(item.id\)/);
assert.doesNotMatch(acad,/<nav className="admin-academico-nav"/);
assert.match(acad,/admin-academico-aux-actions/);
assert.doesNotMatch(acad,/admin-academico-quick-grid/);
assert.match(agents,/Branch única obrigatória/);
assert.match(copilot,/autodev-r07-estudantes-codespaces-private-20261106/);
assert.match(copilot,/NÃO IMPLEMENTADO\/NÃO HOMOLOGADO/);
assert.doesNotMatch(wizard,/service_role|SUPABASE_SERVICE_ROLE_KEY|\.from\('matriculas'\)\.insert/i);
console.log('OK: mesmo ramo R07, navegação acadêmica única, solução comercial, docente privado, turma, WhatsApp e LIPE.');
