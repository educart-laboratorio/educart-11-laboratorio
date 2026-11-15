/** Portão A — exercita as funções usadas pelo assistente nos dois caminhos.
 * É teste funcional de lógica, não E2E em navegador ou escrita no banco.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {avancarEtapaCadastro,voltarEtapaCadastro,etapasParaConcluir,validarEtapaCadastro}
  from '../src/lib/academico/etapas-cadastro-turma.ts';
const fonte=readFileSync(new URL('../src/components/AdminPlanejamentoFormacaoTurmaDev.tsx',import.meta.url),'utf8');
function bloco(n){
  const marca='{etapa==='+n+'&&<div';
  const ini=fonte.indexOf(marca);
  assert(ini>=0,'Etapa ausente: '+n);
  const fim=fonte.indexOf('{etapa===',ini+marca.length);
  return fonte.slice(ini,fim<0?undefined:fim);
}
assert.match(bloco(0),/Que formação vamos oferecer/);
assert.match(bloco(1),/funciona pedagogicamente/);
assert.match(bloco(2),/Como apresentaremos a oferta comercial/);
assert.match(bloco(3),/Professor responsável/);
assert.match(bloco(3),/id="pgt-docente"/);
assert.match(bloco(4),/Código identificador da turma/);
assert.match(bloco(4),/Horários próprios desta turma/);
assert.match(bloco(5),/Revise os dados antes de salvar/);
assert(!bloco(4).includes('Preço de matrícula'));
assert(!bloco(2).includes('Código identificador da turma'));
assert.equal((fonte.match(/id="pgt-docente"/g)||[]).length,1);
assert(fonte.includes('avancarEtapaCadastro(modo,etapa,erroEtapa)'));
assert(fonte.includes('setEtapa(voltarEtapaCadastro(modo,etapa))'));
assert(fonte.includes('const etapas=etapasParaConcluir(modo);'));
assert(fonte.includes("supabase.rpc('educart_criar_formacao_turma_guiada_dev'"));
assert(fonte.includes("p_formacao_existente:modo==='existente'?formacaoExistenteId:null"));
assert(fonte.includes("p_formacao:modo==='nova'?dadosFormacao():{}"));
const regras=readFileSync(new URL('../src/lib/academico/etapas-cadastro-turma.ts',import.meta.url),'utf8');
assert(regras.includes('if(etapaAtual===4)')&&regras.includes('d.horarios.length<1'));
assert(regras.includes('if(etapaAtual===3)')&&regras.includes('d.docentesAtivos.includes(d.docenteId)'));
// Teste de comportamento da navegação efetivamente importada pelo componente.
function percorre(modo,caminho){
  const validadas=new Set();let etapa=0;const visitadas=[etapa];
  const validar=(n)=>validadas.has(n)?'':'Preencha a etapa '+n;
  for(const proxima of caminho.slice(1)){
    const bloqueio=avancarEtapaCadastro(modo,etapa,validar);
    assert.deepEqual(bloqueio,{etapa,erro:'Preencha a etapa '+etapa},
      'Avanço indevido sem informação obrigatória');
    validadas.add(etapa);
    const passou=avancarEtapaCadastro(modo,etapa,validar);
    assert.deepEqual(passou,{etapa:proxima,erro:''});
    etapa=passou.etapa;visitadas.push(etapa);
  }
  assert.deepEqual(visitadas,caminho);
  assert.equal(avancarEtapaCadastro(modo,5,()=>'' ).etapa,5);
  const retorno=[etapa];
  while(etapa!==0){etapa=voltarEtapaCadastro(modo,etapa);retorno.push(etapa);}
  assert.deepEqual(retorno,[...caminho].reverse());
  assert.equal(voltarEtapaCadastro(modo,0),0);
  return visitadas.join(' → ');
}
assert.deepEqual(etapasParaConcluir('nova'),[0,2,3,4]);
assert.deepEqual(etapasParaConcluir('existente'),[0,3,4]);
const nova=percorre('nova',[0,1,2,3,4,5]);
const existente=percorre('existente',[0,3,4,5]);
console.log('PORTÃO A PASS: nova '+nova+' | existente '+existente+
  ' (bloqueio, avanço, retorno, revisão e correspondência JSX; sem gravar dados).');

// Teste de validação de dados sintéticos, sem Supabase, não só inspeção de strings.
const entrada={
  modo:'nova',formacaoExistente:false,
  formacao:{
    nome:'Teatro Sintético para Teste',idade_minima:'14',duracao_meses:'12',carga_horaria_horas:'80',
    valor_matricula_reais:'50,00',valor_mensalidade_reais:'320,00',quantidade_mensalidades_referencia:'6',
  },
  turma:{codigo:'TESTE-2026-T1',capacidade:'20',inicio_em:'2026-11-14',termina_em:'2027-06-14',
    inscricoes_abrem_em:'',inscricoes_encerram_em:''},
  docenteId:'docente-sintetico-ativo',docentesAtivos:['docente-sintetico-ativo'],
  horarios:[{dia:'6',inicio:'10:00',fim:'12:00'}],
};
for(const modo of ['nova','existente']){
  const d={...entrada,modo,formacaoExistente:modo==='existente'};
  const caminho=modo==='nova'?[0,1,2,3,4,5]:[0,3,4,5];
  for(const numero of caminho){
    assert.equal(validarEtapaCadastro(numero,d),null,'Dado válido recusado: '+modo+' '+numero);
  }
  let atual=0;for(const destino of caminho.slice(1)){
    const resultado=avancarEtapaCadastro(modo,atual,n=>validarEtapaCadastro(n,d)?.mensagem??'');
    assert.deepEqual(resultado,{etapa:destino,erro:''});
    atual=resultado.etapa;
  }
}
function invalida(d,etapa,campo,mensagem){
  const falha=validarEtapaCadastro(etapa,d);
  assert(falha,'Validação não identificou falha: '+campo);
  assert.equal(falha.campo,campo);
  assert.match(falha.mensagem,new RegExp(mensagem,'i'));
  const bloqueio=avancarEtapaCadastro(d.modo,etapa,n=>validarEtapaCadastro(n,d)?.mensagem??'');
  assert.equal(bloqueio.etapa,etapa,'Falha não pode avançar etapa '+etapa);
}
invalida({...entrada,turma:{...entrada.turma,codigo:''}},4,'pgt-codigo','Código');
invalida({...entrada,turma:{...entrada.turma,capacidade:'1000'}},4,'pgt-vagas','vagas');
invalida({...entrada,turma:{...entrada.turma,termina_em:'2026-10-01'}},4,'pgt-fim','término');
invalida({...entrada,docenteId:''},3,'pgt-docente','docente');
invalida({...entrada,horarios:[{dia:'6',inicio:'12:00',fim:'10:00'}]},4,'pgt-hora-fim-0','posterior');
invalida({...entrada,horarios:[{dia:'6',inicio:'10:00',fim:'12:00'},{dia:'6',inicio:'13:00',fim:'15:00'}]},4,'pgt-dia-1','já aparece');
invalida({...entrada,formacao:{...entrada.formacao,valor_mensalidade_reais:'xx'}},2,'pgt-mensalidade-preco','mensalidade');
invalida({...entrada,modo:'existente',formacaoExistente:false},0,'pgt-formacao-existente','selecione');
assert(fonte.includes('aria-invalid={Boolean(erro)}')&&fonte.includes('aria-describedby={erro?id'),
  'Campos comuns devem exibir erro associado');
assert(fonte.includes("setCampoErro(falha);setEtapa(numero);pedirFoco(falha.campo)"),
  'Erro deve apontar para etapa e campo sem limpar a entrada');
assert(fonte.includes('onSubmit={concluir} className="admin-academico-panel" noValidate'),
  'Validação deve passar pelo código que revela o motivo e foca o campo');
assert(fonte.includes('destinoFoco.campo?document.getElementById(destinoFoco.campo)')&&
  fonte.includes('alvo.scrollIntoView')&&fonte.includes('alvo.focus({preventScroll:true})'),
  'Abertura, Continuar, Voltar e erros devem levar o foco e rolar até a etapa');
assert(fonte.includes('if(!window.confirm(')&&fonte.includes('Guardar apenas a formação (sem turma)'),
  'Rascunho sem turma deve pedir confirmação antes de gravar');
assert(fonte.includes('disabled={!podeGerir||salvando}'),
  'O botão de revisão não pode ocultar ausência de docente por disabled silencioso');
console.log('PORTÃO A UX: validador real com dados sintéticos, foco e confirmação sem escrita — PASS.');
