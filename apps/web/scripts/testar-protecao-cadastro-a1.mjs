/** A1: protege saída do rascunho; exercita a decisão real usada pelo React.
 * Inspeções estruturais acompanham o teste funcional puro, sem browser/DB.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {precisaConfirmarSaidaCadastro} from '../src/lib/academico/proteger-saida-cadastro-a1.ts';
import {avancarEtapaCadastro} from '../src/lib/academico/etapas-cadastro-turma.ts';
const ler=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const parent=ler('../src/components/AdminRotinaAcademicaLab.tsx');
const dashboard=ler('../src/app/admin/page.tsx');
const wizard=ler('../src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const modal=ler('../src/components/AdminRegistroModalDev.tsx');
const css=ler('../src/app/admin/admin.css');

// Reproduz o defeito original como contrato: antes um clique em outra área
// desmontava o componente sem escolha explícita. O guard evita isso.
const teste={aberto:false,alterado:false,etapa:0,nome:'',codigo:''};
assert.equal(precisaConfirmarSaidaCadastro(teste.aberto,teste.alterado),false);
teste.aberto=true;
assert.equal(precisaConfirmarSaidaCadastro(teste.aberto,teste.alterado),false,
  'Abrir sem editar não deve apresentar aviso');
teste.nome='Solução de ensaio';teste.codigo='ENSAIO-T1';teste.etapa=5;teste.alterado=true;
const anterior=JSON.stringify(teste);
assert.equal(precisaConfirmarSaidaCadastro(teste.aberto,teste.alterado),true);
const saidaPendente='estudantes';
assert.equal(saidaPendente,'estudantes');
assert.equal(JSON.stringify(teste),anterior,'Pedir saída não pode modificar valores');
const cancelarSaida=()=>null;
assert.equal(cancelarSaida(),null);
assert.equal(JSON.stringify(teste),anterior,'Cancelar fechamento preserva valores, contexto e revisão');
const descartarSaida=()=>({aberto:false,alterado:false,etapa:0,nome:'',codigo:''});
assert.deepEqual(descartarSaida(),{aberto:false,alterado:false,etapa:0,nome:'',codigo:''});
assert.equal(precisaConfirmarSaidaCadastro(true,false),false,'Sem edição não avisar');
assert.equal(precisaConfirmarSaidaCadastro(false,true),false,'Cadastro fechado não avisa');

// Proteção central para saída entre os quatro grupos, preservando todos os campos.
assert(dashboard.includes('const solicitarDestino=(destino:DestinoAdmin)=>'));
assert(dashboard.includes('if(pendente){setDestinoSolicitado(destino);return;}'));
assert(dashboard.includes('onClose={()=>setDestinoSolicitado(null)}'));
assert(dashboard.includes('Permanecer no formulário'));
assert(dashboard.includes('onClick={confirmarDescarteDestino}'));
assert(parent.includes('onRascunhoPendenteChange?.(rascunhoPendente||rascunhoEstudantePendente)'));
assert(parent.includes('onRascunhoPendenteChange={setRascunhoPendente}'));
assert(dashboard.includes('onRascunhoPendenteChange={setRascunhoAcademicoPendente}'));
assert(dashboard.includes('rascunhoMatriculaPendente||'));
assert(wizard.includes('precisaConfirmarSaidaCadastro(mostrarCadastro,rascunhoAlterado)'));
assert(wizard.includes('onClick={limparCadastroDescartado}'));
// Protege os próprios valores digitados por estado; reverter edição remove dirty.
assert(wizard.includes('const atualRascunho=JSON.stringify('));
assert(wizard.includes('baseRascunho!==atualRascunho'));
assert(wizard.includes('setBaseRascunho(atualRascunho)'));
assert(wizard.includes('setConfirmarFechamento(false)'));
assert(wizard.includes('setFormacao(VAZIA_FORMACAO);setTurma(VAZIA_TURMA);setHorarios([horarioVazio()])'));
assert(wizard.includes("window.addEventListener('beforeunload',aoSair)"));
assert(wizard.includes('const bloquearSaida=rascunhoAlterado||rascunhoGerirPendente||operacaoGerirEmCurso'),
  'A navegação central deve respeitar também o rascunho e a operação do modal Gerir alunos');
assert(wizard.includes('onRascunhoPendenteChange?.(bloquearSaida)'));
assert(wizard.includes('if(!bloquearSaida)return;'),
  'Recarregar a página também deve preservar a gestão dos alunos em andamento');
// Salvar continua EXPLÍCITO: continuar/voltar/navegar não escreve.
assert(wizard.includes('onSubmit={concluir}'));
assert(wizard.includes('if(!window.confirm('));
assert(!parent.includes("from('formacoes').insert("));
assert(!parent.includes("from('turmas').insert("));
// Teste separado do relato de clique fora: a janela nativa P0 NÃO tem
// handler de backdrop e preserva Escape (não atribuir causa não reproduzida).
assert(modal.includes('if(!dialog.open)dialog.showModal()'));
assert(modal.includes('onCancel={e=>{e.preventDefault();onClose();}}'));
assert(!/onClick=\{[^}]*\bdialog\.close\(\)/.test(modal));
assert(!/onPointerDown=|onMouseDown=/.test(modal));
// Regressão do defeito de abertura: a referência deve ser fixada no evento
// ANTES da primeira digitação, e não depender do efeito posterior ao render.
const estadoInicial={modo:'nova',formacaoExistenteId:'',formacao:{nome:''},
  turma:{codigo:''},horarios:[{dia:'',inicio:'',fim:''}],docenteId:''};
const referenciaAbertura=JSON.stringify(estadoInicial);
const primeiraDigitacao={...estadoInicial,formacao:{nome:'TESTE A1 NAO SALVAR'}};
assert(precisaConfirmarSaidaCadastro(true,
  referenciaAbertura!==JSON.stringify(primeiraDigitacao)),
  'A primeira digitação já deve exigir confirmação de saída');
assert(!precisaConfirmarSaidaCadastro(true,
  referenciaAbertura!==JSON.stringify(estadoInicial)),
  'Abertura sem alteração não deve exibir confirmação');
assert(wizard.includes('setBaseRascunho(atualRascunho);setEtapa(0);pedirFoco();'),
  'O botão Criar deve capturar a referência síncrona antes de montar o formulário');
assert(wizard.includes("setBaseRascunho(JSON.stringify({modo:'existente',formacaoExistenteId:id,formacao,turma,horarios,docenteId}))"),
  'O atalho Criar turma nesta formação deve capturar a referência após escolher o ID');
assert(wizard.includes('Alterações não salvas — use Fechar cadastro'),
  'O usuário precisa de sinal visual de que a proteção contra descarte está ativa');
// Regressão da falha visual: antes Fechar cadastro ficava distante acima
// de duas listagens. Agora o formulário abre no modal com X sempre visível.
const inicioPopup=wizard.indexOf('{mostrarCadastro&&<AdminRegistroModalDev');
const listas=wizard.indexOf('aria-label="Turmas existentes"');
assert(inicioPopup>listas,'As listas continuam na página; o cadastro abre em popup');
assert(wizard.includes('onClose={solicitarFechamento} amplo cadastro>'));
assert(wizard.includes("descricao={'Etapa '+(etapa+1)+' de 6"));
assert(wizard.includes('admin-academico-wizard-actions'));
assert(modal.includes('cadastro?:boolean')&&modal.includes("cadastro?' admin-registro-dialog-cadastro'"));
assert(modal.includes('onCancel={e=>{e.preventDefault();onClose();}}'),
  'Escape deve acionar o mesmo pedido de fechamento do botão X');
assert(modal.includes('onClick={onClose}'),'X deve usar o fechamento protegido A1');
assert(!/onPointerDown=|onMouseDown=/.test(modal),
  'Não introduzir fechamento no backdrop do P0');
assert(css.includes('.admin-registro-dialog-cadastro[open]') &&
  css.includes('.admin-registro-dialog-cadastro .admin-registro-dialog-body') &&
  css.includes('overflow-y: auto') &&
  css.includes('.admin-registro-dialog-cadastro .admin-academico-wizard-actions') &&
  css.includes('position: sticky'),
  'Header, rolagem interna e ações acessíveis no modal');
for(const [modo,caminho] of Object.entries({
  nova:[0,1,2,3,4,5],existente:[0,3,4,5]
})){
  for(let i=0;i<caminho.length-1;i++){
    const next=avancarEtapaCadastro(modo,caminho[i],()=>'' );
    assert.equal(next.etapa,caminho[i+1],'Revisão acessível no modal: '+modo);
  }
}
assert(wizard.includes('confirmarFechamento&&<AdminRegistroModalDev') &&
  wizard.includes('onClick={()=>setConfirmarFechamento(false)}') &&
  wizard.includes('onClick={limparCadastroDescartado}'),
  'Confirmação independente do modal principal; permanecer não desmonta formulário');
console.log('A1 MODAL PASS: X, Escape, rolagem interna, revisão nos dois modos, P0 e dados preservados.');
console.log('A1 PASS: abrir, preencher, cancelar saída, mudança de área protegida, descarte explícito e modal P0 preservado (sem escrita).');
