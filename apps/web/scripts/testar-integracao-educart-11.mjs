import assert from 'node:assert/strict';
import fs from 'node:fs';

const ler = path => fs.readFileSync(path, 'utf8');
const entrada = ler('src/components/EntradaEducart.tsx');
const logo = ler('src/components/EducartLogo.tsx');
const portal = ler('src/app/portal.css');
const admin = ler('src/app/admin/page.tsx');
const academia = ler('src/components/AdminRotinaAcademicaLab.tsx');
const chamadas = ler('src/components/AdminChamadasDev.tsx');
const gestao = ler('src/components/AdminGestaoInscricoesDev.tsx');
const financeiroHistorico = ler('../../supabase/security-review/EDUCART_11_DEV_PIX_CONFERENCIA_MANUAL_20261104.sql');
const financeiroAtual = ler('src/components/AdminFinanceiroDev.tsx');
const css = ler('src/app/admin/admin.css');
const sql = ler('../../supabase/security-review/EDUCART_11_DEV_AULAS_CHAMADAS_AUDITADAS_20261104.sql');

assert.match(logo, /NÚCLEO DE FORMAÇÃO DE ATORES/);
assert.match(entrada, /Seu lugar na arte começa aqui/);
assert.match(portal, /\.ec-portal/);
assert(admin.includes("useState<'academico' | 'ingressos' | 'inscricoes' | 'secretaria' | 'financeiro' | 'clientes'>('academico')"), 'A navegação inclui os destinos originais e Clientes DEV');
for (const nome of ['Acadêmico', 'Gestão de inscrições', 'Secretaria / Coordenação', 'Financeiro']) {
  assert.ok(admin.includes(nome), 'Ausente área: '+nome);
}
for (const componente of ['AdminRotinaAcademicaLab','AdminGestaoInscricoesDev','AdminFinanceiroDev','AdminMatriculaUnificadaDev']) {
  assert.ok(new RegExp('<'+componente+'\\s').test(admin), 'Componente não integrado: '+componente);
}
assert.match(admin, /className="admin-area-selector"/);
assert.doesNotMatch(admin, /<AdminImportacaoLegadoDev|<AdminVinculosDev/, 'Sem telas paralelas para o aluno');
assert.match(admin, /from\('inscricoes_oficina'\)/);
assert.match(admin, /id="filter-campanha-select"/);
assert.match(admin, /filteredInscricoes\.map/);
assert.match(academia, /<AdminPlanejamentoFormacaoTurmaDev/);
assert.match(academia, /<AdminChamadasDev/);
assert.doesNotMatch(academia, /FICTICIOS|NOMES_DEMONSTRACAO|pré-cadastros fictícios|nenhuma presença é gravada/i);
assert.match(chamadas, /from\('educart_aulas_dev'\)/);
assert.match(chamadas, /from\('educart_chamadas_dev'\)/);
assert.match(chamadas, /from\('educart_chamadas_historico_dev'\)/);
assert.match(chamadas, /obterPapeisGestao/);
assert.match(chamadas, /matricula_id: m\.id/);
assert.match(chamadas, /motivo_ajuste/);
assert.doesNotMatch(chamadas, /FICTICIOS|NOMES_DEMONSTRACAO|service_role|database-prod/);
assert.match(gestao, /classificarCampanha/);
assert.match(gestao, /inscricoes\.length/);
assert.doesNotMatch(gestao, /\.insert\(|\.update\(|localStorage|service_role/);
assert.match(financeiroHistorico, /educart_conferir_pix_dev/);
assert.match(financeiroAtual, /AdminFinanceiroEssencialR11Dev/);
assert.doesNotMatch(financeiroAtual, /educart_conferir_pix_dev|AdminFinanceiroLegadoDev/);
// Portão de liberação 1.1: preservar recursos avançados no DEV e falhar fechado em PROD.
const origemBanco=ler('src/lib/supabase/client.ts');
const vinculador=ler('src/components/AdminVincularEstudanteTurmaDev.tsx');
const wizard=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
assert(origemBanco.includes("export const ACOES_ACADEMICAS_EXCLUSIVAS_DEV") &&
  origemBanco.includes("process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://esjrjzyvyhtzwgihcbsc.supabase.co'"),
  'A liberação de fluxos R12/R14/Pix só pode ocorrer na origem DEV autorizada');
assert(admin.includes("areaAtiva === 'inscricoes' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV") &&
  admin.includes("areaAtiva === 'financeiro' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV") &&
  admin.includes("ACOES_ACADEMICAS_EXCLUSIVAS_DEV ? <>") &&
  admin.includes("areaAtiva === 'secretaria' && ACOES_ACADEMICAS_EXCLUSIVAS_DEV"),
  'PROD não deve renderizar gestão R14, financeiro, matrícula Pix/bolsa ou atendimento R12');
assert(vinculador.includes("!ACOES_ACADEMICAS_EXCLUSIVAS_DEV||!podeGerir") &&
  vinculador.includes("ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&origem==='recadastramento'") &&
  vinculador.includes("p_tipo_vinculo:origem==='novo'?'novo_pendente':situacao") &&
  vinculador.includes("salvavel"),
  'Vínculo pendente preservado; ativação histórica limitada ao DEV');
assert(wizard.includes('const bloquearSaida=rascunhoAlterado||rascunhoGerirPendente||operacaoGerirEmCurso') &&
  wizard.includes('onRascunhoPendenteChange?.(bloquearSaida)'),
  'Não permitir navegação que descarte o rascunho de Gerir alunos');

// Portão do docente e histórico: funções existentes preservadas no DEV,
// situações editáveis por Coordenação; componentes ausentes não montam em PROD.
const docentePortao=ler('src/components/AdminDocentesDev.tsx');
const estudantesPortao=ler('src/components/AdminEstudantesDev.tsx');
assert(docentePortao.includes('htmlFor="docente-situacao"') &&
  docentePortao.includes('<option value="pendente_validacao">') &&
  docentePortao.includes('<option value="ativo">') &&
  docentePortao.includes('<option value="inativo">') &&
  docentePortao.includes('situacao:editarId?situacaoEdicao') &&
  docentePortao.includes('window.confirm(') &&
  docentePortao.includes("papeis.includes('coordenacao')"),
  'A Coordenação deve confirmar alterações da situação de docentes existentes');
assert(docentePortao.includes('podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV') &&
  docentePortao.includes('if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV||!podeGerir||gerandoId)return;'),
  'Publicação e revogação de perfis não devem funcionar em PROD sem RPC');
assert(estudantesPortao.includes('podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<AdminHistoricosDev') &&
  estudantesPortao.includes('AdminVincularEstudanteTurmaDev'),
  'O histórico DEV sem suporte no PROD não pode bloquear vínculo pendente');

// Portão SQL final revisável: conta por objetos em vez de confiar em comentários.
const release11=ler('../../supabase/security-review/EDUCART_11_PROD_CANDIDATA_MIGRACAO_ADITIVA_20261111.sql');
const coordenacao11=ler('../../supabase/security-review/EDUCART_11_PROD_CANDIDATA_PAPEL_COORDENACAO_20261111.sql');
const status11=ler('src/components/AdminDocentesDev.tsx');
assert.equal((release11.match(/^CREATE TABLE public\./gm)||[]).length,13,'São necessárias 13 tabelas acadêmicas');
assert.equal((release11.match(/^CREATE POLICY /gm)||[]).length,25,'Manter 25 políticas RLS auditadas');
assert.equal((release11.match(/^CREATE TRIGGER /gm)||[]).length,6,'Manter 6 gatilhos');
assert.equal((release11.match(/^CREATE FUNCTION /gm)||[]).length,11,'Manter 11 funções');
assert(release11.includes("current_setting('educart.autorizacao_prod_11',true)") &&
 release11.includes("current_setting('educart.backup_restaurado_11',true)") &&
 release11.includes('snapshot_inscricoes_11') && release11.includes('snapshot_admins_11'),
 'Migração não pode executar sem gates e prova de preservação');
assert(release11.trimEnd().endsWith('COMMIT;') &&
 !release11.includes('INSERT INTO public.equipe_papeis'),
 'Migração é aditiva e NÃO concede Coordenação por inferência');
assert(coordenacao11.includes("current_setting('educart.coordenacao_auth_uid_11',true)") &&
 coordenacao11.includes("DIRECAO_APROVOU_IDENTIDADE") &&
 coordenacao11.includes('JOIN public.portal_admins'),
 'Concessão de Coordenação exige identidade Auth+legado verificada e autorização própria');
assert(status11.includes('htmlFor="docente-situacao"') &&
 status11.includes("situacao:editarId?situacaoEdicao:'pendente_validacao'") &&
 status11.includes('window.confirm('),
 'Alteração da situação do docente depende de escolha explícita da Coordenação');
assert(wizard.includes("ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&t.situacao==='planejada'&&"),
 'PROD não deve mostrar botão de exclusão exclusivo de DEV');

assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(sql, /CREATE TABLE public\.educart_aulas_dev/i);
assert.match(sql, /CREATE TABLE public\.educart_chamadas_dev/i);
assert.match(sql, /CREATE TABLE public\.educart_chamadas_historico_dev/i);
for (const regra of [/ENABLE ROW LEVEL SECURITY/gi,/ON DELETE RESTRICT/gi,/CREATE POLICY educart_chamadas_equipe_inserir_dev/i,/CREATE POLICY educart_chamadas_coord_corrigir_dev/i,/matricula_id.*UNIQUE|UNIQUE\(aula_id,matricula_id\)/i,/NEW\.motivo_ajuste/i,/SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp/i]) {
  assert.match(sql, regra);
}
assert.doesNotMatch(sql, /insert into public\.mensalidades_formacao|update public\.matriculas.*ativa/);
console.log('OK: EducART 1.1 com quatro áreas, dados unificados, chamadas auditadas e herança visual LIPE.');
