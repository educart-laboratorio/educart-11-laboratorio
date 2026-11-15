/** R15: organização de 6 áreas sem regressão LIPE, R12, aulas e docente obrigatório. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(p,'utf8');
const ac=ler('src/components/AdminRotinaAcademicaLab.tsx');
const wizard=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const docentes=ler('src/components/AdminDocentesDev.tsx');
const estudantes=ler('src/components/AdminEstudantesDev.tsx');
const chamadas=ler('src/components/AdminChamadasDev.tsx');
const admin=ler('src/app/admin/page.tsx');
const css=ler('src/app/admin/admin.css');
for(const nome of ['Visão geral','Formações e turmas','Estudantes e vínculos','Docentes','Agenda','Frequência'])
 assert(admin.includes("nome:'"+nome+"'"),'Menu contextual ausente: '+nome);
assert(ac.includes('<AdminPlanejamentoFormacaoTurmaDev'));
assert(ac.includes('<AdminDocentesDev'));
assert(ac.includes('<AdminEstudantesDev'));
assert(ac.includes('modo="agenda"')&&ac.includes('modo="frequencia"'));
for(const s of ["'formacoes'","'turmas'","'matriculas'","'educart_aulas_dev'","'educart_chamadas_dev'"])
 assert(ac.includes(s),'Indicador ausente: '+s);
for(const s of ['Turmas existentes','mostrarCadastro','Nova formação e turma',
 'educart_criar_formacao_turma_guiada_dev','setMostrarCadastro(false)',
 'id="pgt-docente"','docente_id:docenteId','educart_docentes_dev'])
 assert(wizard.includes(s),'Cadastro guiado ou lista ausente: '+s);
const validador=ler('src/lib/academico/etapas-cadastro-turma.ts');
assert(validador.includes("d.docentesAtivos.includes(d.docenteId)") &&
 wizard.includes('validarEtapaCadastro(numero,{'),
 'Docente ativo deve continuar obrigatório no validador compartilhado e no assistente');
assert(wizard.indexOf('Turmas existentes')<wizard.indexOf('Nova formação e turma'),'Turmas devem anteceder formulário');

// Legendas são do menu por tarefas; o formulário continua com seis etapas.
for(const nome of ['Indicadores e aulas','Inscrições e vínculos','Turmas e frequência'])
 assert(admin.includes("descricao:'"+nome+"'"),'Legenda ausente: '+nome);
assert(wizard.includes("' de 6")&&!wizard.includes('cadastro guiado de quatro etapas'),
 'A ajuda e o formulário devem corresponder às seis etapas reais');
assert(admin.includes('AdminAjuda titulo={item.nome}'),'Ajuda dos quatro grupos preservada');
assert(ac.includes("secao==='visao'&&<button") && ac.includes('Atualizar indicadores'),
 'Atualização dos indicadores deve aparecer somente na visão acadêmica');
assert(!ac.includes('Prévia com teste autenticado ainda pendente'),
 'Rodapé não pode negar genericamente uma vistoria já realizada');
for(const texto of ['Criar formação ou turma','Turmas existentes','Atualizar turmas',
 'educart-turma-card-heading','educart-turma-card-meta','educart-turma-card-actions',
 'horariosLegiveis(t.horarios_semanais)','nomeTurmaSemHorario(t.codigo)'])
 assert(wizard.includes(texto),'Melhoria textual ou layout ausente: '+texto);
assert(wizard.includes('situacaoLegivel(t.situacao)')&&
 wizard.includes("t.capacidade===null?'Não informada':t.capacidade")&&
 wizard.includes("docentes.find(d=>d.id===t.docente_id)?.nome_completo"),
 'Situação, capacidade e docente precisam permanecer no cartão responsivo de turma');
assert(wizard.includes("t.situacao==='planejada'&&"),
 'Não oferecer exclusão de turmas ativas');
assert(!wizard.includes(''+ 'vagas: {t.capacidade'), 'Não confundir vagas com situação acadêmica');

const vinculador=ler('src/components/AdminVincularEstudanteTurmaDev.tsx');
assert(wizard.includes('setGerirTurmaId(t.id)') &&
 wizard.includes('origemGerirRef.current=e.currentTarget') &&
 wizard.includes('turmaInicialId={gerirTurmaId}') && wizard.includes('<AdminRegistroModalDev'),
 'Gerir alunos deve abrir o fluxo R12 existente na turma selecionada');
assert(vinculador.includes('turmaInicialId?:string') &&
 vinculador.includes('useState(turmaInicialId??') &&
 vinculador.includes('Alunos vinculados') &&
 vinculador.includes('matriculas.filter(m=>m.turma_id===turmaId)'),
 'Turma escolhida deve mostrar seus vínculos existentes');
assert(vinculador.includes("supabase.rpc('educart_r12_vincular_estudante_turma_dev'") &&
 vinculador.includes("papeis.includes('coordenacao')"),
 'A vinculação precisa manter a RPC auditada e revalidar Coordenação');
assert(!/\.delete\(|\.update\(/.test(vinculador),
 'Gerir alunos não deve apagar ou editar matrículas diretamente');


for(const s of ['educart_docentes_dev','nome_completo','nome_artistico','areas_atuacao',
 'formacao_profissional','disponibilidade','minibiografia','autorizou_divulgacao',
 'obterPapeisGestao','coordenacao',".insert(",".update("])
 assert(docentes.includes(s),'Docente não integrado: '+s);
assert(!/\.delete\(|deleteUser\(|service_role|SUPABASE_SERVICE_ROLE_KEY/i.test(docentes),'Não excluir docentes nem usar chave privilegiada');
for(const s of ['AdminVincularEstudanteTurmaDev',"'pessoas'","'matriculas'","'turmas'",
 'setMostrarVinculo','nome_completo','situacao','origem','todas<Matricula>'])
 assert(estudantes.includes(s),'Estudantes ausente: '+s);
for(const s of ["modo==='agenda'","modo==='frequencia'",'criarAula','ajustarAgenda',
 'registrar(m)','motivo_ajuste','educart_chamadas_historico_dev','Confirmar que a aula foi realizada'])
 assert(chamadas.includes(s),'Agenda/Frequência ausente: '+s);
assert(!admin.includes('<AdminVincularEstudanteTurmaDev'),'Sem ficha acadêmica duplicada na Secretaria');
assert(css.includes('.admin-area-selector')&&css.includes('.admin-subarea-selector'),'Navegação visual por tarefa preservada');
// Seis destinos acadêmicos preservados em dois grupos e uma visão geral.
for(const destino of ["id:'visao'","id:'turmas'","id:'estudantes'","id:'docentes'","id:'agenda'","id:'frequencia'"])
 assert(admin.includes(destino),'Destino R15 ausente: '+destino);
assert(admin.includes('GRUPOS.map(item=>')&&admin.includes('admin-subarea-selector')&&
 admin.includes("grupoAtivo==='pessoas'?OPCOES_PESSOAS:OPCOES_FORMACOES"),'Navegação contextual ausente');
assert(admin.includes('setDestinoSolicitado(destino)')&&
 admin.includes('onClick={confirmarDescarteDestino}')&&
 admin.includes('Permanecer no formulário'),'Confirmacao de descarte obrigatória');
assert(ac.includes('onRascunhoPendenteChange?.(rascunhoPendente||rascunhoEstudantePendente)')&&
 ac.includes('onSolicitarSecao(')&&!ac.includes('setSecao('),'Guarda de navegação centralizada');
assert(ac.includes('admin-academico-panels-single'),'Agenda deve manter toda a largura');
assert.equal((ac.match(/role="group" aria-label="Ações auxiliares do Acadêmico"/g)||[]).length,1,
  'Contrato e atualização devem ser ações auxiliares, não navegação paralela');
assert(ac.includes('onClick={()=>setMinutaAberta(true)}')&&ac.includes('onClick={()=>void atualizarIndicadores()}'),
  'Preservar MINUTA e atualização dos indicadores');
assert(ac.includes('minutaAberta&&<AdminRegistroModalDev')&&ac.includes('Baixar PDF')&&ac.includes('Ler PDF'),
  'Preservar modal, leitura e download da MINUTA');
for(const cssClass of ['.admin-subarea-selector','.admin-academico-aux-actions',
 '.admin-academico-panels-single'])assert(css.includes(cssClass),'CSS ausente: '+cssClass);
assert(css.includes('button:focus-visible')&&css.includes('font-size:13px'),'Foco e tipografia preservados');
// ABRACADABRA R16: quatro KPIs inteiros acionam modal, sem substituir a navegação existente.
const modal=ler('src/components/AdminKpiDetalhesDev.tsx');
const turmaNome=ler('src/lib/academico/nome-grupo-turma.ts');
const vinculos=ler('src/components/AdminVincularEstudanteTurmaDev.tsx');
const planejamento=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
assert.equal((ac.match(/<button type="button" className="admin-kpi-card/g)||[]).length,4,
  'Os quatro cartões devem ser botões inteiros');
for(const tipo of ['formacoes','turmas','matriculas','chamadas'])
 assert(ac.includes("abrirDetalhe('"+tipo+"', event.currentTarget)"),'Card sem ação/modal: '+tipo);
assert(ac.includes('aoFechar={fecharDetalhe}')&&ac.includes('acionadorDetalhe.current = acionador')&&
  ac.includes('if (acionador?.isConnected) acionador.focus()'),
  'Fechar o detalhe deve devolver o foco ao cartão que o abriu');
assert(ac.includes('<AdminKpiDetalhesDev') && modal.includes('AdminRegistroModalDev'),
  'Modal acadêmica deve reutilizar diálogo nativo existente');
const dialogCompartilhado=ler('src/components/AdminRegistroModalDev.tsx');
const fichaHistorica=ler('src/components/AdminHistoricosDev.tsx');
assert(fichaHistorica.includes('<AdminRegistroModalDev')&&modal.includes('<AdminRegistroModalDev'),
  'KPIs e ficha histórica devem utilizar o mesmo diálogo existente');
assert(dialogCompartilhado.includes('dialog.showModal()')&&dialogCompartilhado.includes('dialog.close()'),
  'Preservar a semântica de abertura e limpeza do diálogo nativo');
assert(dialogCompartilhado.includes('onCancel={e=>{e.preventDefault();onClose();}}')&&
  dialogCompartilhado.includes('onClick={onClose}'),
  'Preservar Escape e botão de fechamento');
assert(!/<dialog\b[^>]*\bonClose=/.test(dialogCompartilhado),
  'Não ouvir evento close nativo: cleanup React em StrictMode pode fechar modal remontado');
assert(modal.includes("NEXT_PUBLIC_SUPABASE_URL!==DEV"),'Modal somente Supabase DEV');
for(const tabela of ['formacoes','turmas','matriculas','educart_chamadas_dev'])
 assert(modal.includes("from('"+tabela+"')"),'Consulta real ausente: '+tabela);
assert(!/\.insert\(|\.update\(|\.delete\(/.test(modal),'Modal não deve alterar registros');
for(const t of ['T1','T2','T3','T4','T5'])
 assert(turmaNome.includes(t+':'), 'Nome oficial ausente: '+t);
assert(chamadas.includes('nomeGrupoTurma(t.codigo)'),'Dropdown de chamadas deve ter nome completo');
assert(vinculos.includes('nomeGrupoTurma(t.codigo)'),'Dropdown de vínculos deve ter nome completo');
assert(planejamento.includes('nomeTurmaSemHorario(t.codigo)') && planejamento.includes('nomeGrupoTurma(codigo)'),
 'Lista de turmas deve preservar o nome oficial e evitar repetir o horário');
assert(css.includes('button.admin-kpi-card:hover')&&css.includes('button.admin-kpi-card:focus-visible'),
 'Cursor de mão, hover e foco são obrigatórios');
// Ciclo 1: quatro formações reais têm acesso individual por ID, sem criar novos registros.
assert(modal.includes("onClick={()=>aoGerirFormacao(item.id)}") &&
  modal.includes("tipo==='formacoes'&&aoGerirFormacao"),
  'Cada formação do indicador deve ter Gerir formação usando item.id');
assert(modal.includes('>Abrir gestão</button>'),
  'A ação geral Abrir gestão deve continuar disponível');
assert(ac.includes('aoGerirFormacao={id=>{setTurmaInicialId(null);setFormacaoInicialId(id);') &&
  ac.includes('formacaoInicialId={formacaoInicialId}'),
  'O ID selecionado deve chegar à gestão sem reconstrução de cadastro');
// Formações e Turmas: dois botões abrem listas em diálogos com rolagem interna.
for (const trecho of [
  "const [listaAberta,setListaAberta] = useState<'formacoes'|'turmas'|null>(null)",
  "onClick={()=>setListaAberta('formacoes')}",
  "onClick={()=>setListaAberta('turmas')}",
  "listaAberta==='formacoes'&&<AdminRegistroModalDev",
  "listaAberta==='turmas'&&<AdminRegistroModalDev",
  "aria-haspopup=\"dialog\""
]) assert(wizard.includes(trecho),'Lista não está acessível pelo diálogo: '+trecho);
assert(wizard.includes("setFiltroFormacaoId(formacaoFicha.id);setFichaFormacaoId(null);setListaAberta('turmas');"),
  'Filtrar as turmas de uma formação precisa abrir a lista correspondente');
assert(css.includes('.admin-layout-root .admin-registro-dialog')&&css.includes('overflow: auto;'),
  'A lista deve usar o modal existente com rolagem interna');

for(const trecho of ['Formações existentes','formacoes.map(f=>','onClick={()=>abrirFicha(f.id)}',
  'Formação · ','formacaoFicha&&<AdminRegistroModalDev',
  'turmas.filter(t=>t.formacao_id===fichaFormacaoId)',
  'Filtrar turmas por formação','value={filtroFormacaoId}',
  'turmasFiltradas.map(t=>','setFiltroFormacaoId(formacaoFicha.id)',
  'onClick={()=>iniciarTurmaDaFormacao(formacaoFicha.id)}',
  "setModo('existente');setFormacaoExistenteId(id)",
  'onClose={()=>setFichaFormacaoId(null)}','botoesFormacao.current[id]?.focus()']) {
  assert(wizard.includes(trecho),'Ciclo 1: ausente '+trecho);
}
assert(wizard.includes("const fichaJaFoiAberta=useRef(false)") &&
  wizard.includes("if(fichaFormacaoId!==null){fichaJaFoiAberta.current=true;return;}") &&
  wizard.includes("if(fichaJaFoiAberta.current&&ultimaFicha.current)"),
  'Foco só pode retornar após uma ficha realmente aberta; não no carregamento do KPI');
assert(wizard.includes("supabase.from('formacoes').select('id,nome,tipo,descricao") &&
  wizard.includes("supabase.from('turmas').select('id,formacao_id"),
  'Fichas e turmas precisam consultar dados reais do DEV');
assert(!wizard.includes('Editar formação') &&
  !wizard.includes("supabase.from('formacoes').update("),
  'Edição só entra no ciclo 2 após operação auditada');

const blocoTurmas=modal.slice(modal.indexOf("tipo==='turmas'&&aoGerirTurma"),modal.indexOf('</li>)}'));
assert(modal.includes("tipo==='turmas'&&aoGerirTurma") &&
  blocoTurmas.includes("onClick={()=>aoGerirTurma(item.id)}") &&
  blocoTurmas.includes(">Gerir turma</button>"),
  'Cada turma da janela KPI deve oferecer gestão pelo ID real');
assert(ac.includes('aoGerirTurma={id=>{setFormacaoInicialId(null);setTurmaInicialId(id);') &&
  ac.includes('turmaInicialId={turmaInicialId}'),
  'O ID da turma deve chegar à mesma área de gestão existente');
assert(wizard.includes('turmaInicialId?:string|null') &&
  wizard.includes('turmas.some(t=>t.id===turmaInicialId)') &&
  wizard.includes('setFichaTurmaId(turmaInicialId)') &&
  wizard.includes('turmas.find(t=>t.id===fichaTurmaId)'),
  'A ficha da turma deve ser resolvida por ID da consulta DEV');
assert(wizard.includes("onClick={()=>abrirFichaTurma(t.id)}") &&
  wizard.includes("turmaFicha&&<AdminRegistroModalDev") &&
  wizard.includes("onClose={()=>setFichaTurmaId(null)}"),
  'A gestão individual deve usar o diálogo existente e fechar corretamente');
assert(wizard.includes("botoesTurma.current[id]?.focus()") &&
  wizard.includes('fichaTurmaJaFoiAberta.current&&ultimaTurma.current&&!gerirTurmaId'),
  'O retorno de foco só pode ocorrer depois da ficha e da gestão de alunos');
assert(wizard.includes('abrirGestaoAlunosDaFicha(turmaFicha.id)') &&
  wizard.includes('podeGerir&&<div className="admin-academico-actions">') &&
  wizard.includes('turmaInicialId={gerirTurmaId}'),
  'Gerir alunos deve continuar vinculado à turma selecionada e à permissão real');
assert(!wizard.includes("supabase.from('turmas').update("),
  'Não habilitar edição de turma sem operação auditada');
console.log('R15 PASS: seis áreas, docente obrigatório em turma, lista primeiro, vínculos únicos, agenda/chamada sem duplicação.');
