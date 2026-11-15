/** R14: contrato de gestão da inscrição, testado com dados sintéticos e SEM gravar no banco. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {idsPossivelmenteDuplicados} from '../src/lib/inscricoes/duplicidades.ts';
const ler=p=>readFileSync(p,'utf8');
const gestao=ler('src/components/AdminGestaoInscricoesDev.tsx');
const admin=ler('src/app/admin/page.tsx');
const atendimento=ler('src/components/AdminAtendimentoR12Dev.tsx');
const csv=ler('src/lib/csv-seguro.ts');
const sql=ler('../../supabase/security-review/EDUCART_11_R14_GESTAO_INSCRICOES_DEV_20261106.sql');
const curso=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const amostra=[
{id:'1',email:' Lia@Educart.Pro ',telefone_whatsapp:'(71) 98888-0000'},
{id:'2',email:'lia@educart.pro',telefone_whatsapp:'+55 71 90000-0001'},
{id:'3',email:'ana@educart.pro',telefone_whatsapp:'71 98888-0000'},
{id:'4',email:'nina@educart.pro',telefone_whatsapp:'(71) 91111-3333'},
{id:'5',email:'',telefone_whatsapp:''},
{id:'6',email:'',telefone_whatsapp:''},
];
assert.deepEqual([...idsPossivelmenteDuplicados(amostra)].sort(),['1','2','3'],'Repetição por e-mail ou telefone, sem falsos vazios');
assert.equal(idsPossivelmenteDuplicados(amostra.slice(3)).size,0);
assert(gestao.includes("idsPossivelmenteDuplicados(inscricoes)"));
for(const s of ['Gestão de inscrições','Apenas possíveis duplicados','Exportar CSV filtrado',
 'Selecionar','Arquivar selecionadas','Cancelar selecionadas','Desarquivar selecionadas',
 'Corrigir','Histórico','Analisar exclusão','onAbrirFicha','AdminAtendimentoR12Dev',
 "onExportar(filtrados.map(i=>i.id))","p_esperados","p_motivo","p_edicao","p_antes",
 "obterPapeisGestao","podeGerir","setConfirmacao","motivo.trim().length<8","carregarEstado"])
 assert(gestao.includes(s),'Gestão R14 não inclui: '+s);
for(const s of [
 "import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';",
 "{op&&<AdminRegistroModalDev","onClose={fecharOperacao}",
 "{historicoId&&<AdminRegistroModalDev","{analise&&<AdminRegistroModalDev",
 "noValidate onSubmit={e=>void gravar(e)}","e.currentTarget.reportValidity()",
 "motivo.trim().length<8","Faltam ","setOperacaoConcluida(true)",
 "Operação concluída","Concluir e voltar à lista",
 "window.confirm('Descartar a justificativa"]) {
 assert(gestao.includes(s),'Confirmação R14 em modal e feedback ausentes: '+s);
}
assert(!gestao.includes('{op&&<form className="admin-academico-panel"'),
 'Ação de inscrição não deve aparecer após a lista exigindo rolagem');
assert(!gestao.includes("disabled={salvando||!confirmacao||motivo.trim().length<8}"),
 'Botão precisa responder visualmente ao clique inválido');
assert(!/\.delete\(|\.remove\(|deleteUser\(|DROP TABLE|DELETE FROM/i.test(gestao),'A interface não deve efetuar exclusão');
const kpis=ler('src/components/AdminIndicadoresInscricoesDev.tsx');
assert(gestao.includes('AdminIndicadoresInscricoesDev')&&admin.includes('AdminIndicadoresInscricoesDev'));
for(const x of ['<button type="button" key={card.tipo}','aria-haspopup="dialog"',
 '{aberto&&<AdminRegistroModalDev','onAbrirFicha(i.id)','onExibirLista(tipo)',
 'Nenhuma inscrição nesta categoria.'])assert(kpis.includes(x),'Indicador não acionável: '+x);
assert(!gestao.includes('<div className="admin-kpi-card kpi-total">'));
assert(gestao.includes("data.exclusao_habilitada!==false"),'Não aceitar autorização de exclusão na UI');
assert(admin.includes('onAtualizar={atualizarFichaGestao}'));
assert(admin.includes('onExportar={ids => exportarInscricoes('));
assert(admin.includes('gerarCsvExcel(headers, rows)')&&csv.includes("csvCellSeguro"));
assert(admin.includes('handleExportCSV = () => exportarInscricoes(filteredInscricoes)'));
assert(atendimento.includes('modo')&&atendimento.includes('onAbrirFicha'));
assert(atendimento.includes("registrado_por:user.id"));
for(const v of ['educart_inscricoes_estado_r14_dev','educart_inscricoes_eventos_r14_dev',
 'ENABLE ROW LEVEL SECURITY','SECURITY DEFINER SET search_path =',
 'REVOKE ALL','GRANT EXECUTE','educart_r14_gerir_inscricoes_dev',
 'educart_r14_analisar_exclusao_dev','registrado_por',
 "e.papel='coordenacao'","p_esperados","FOR UPDATE","ON DELETE RESTRICT",
 "p_operacao='cancelar'","p_operacao='editar'",
 'v_total<>cardinality(p_ids)','sem_vinculos_conhecidos','exclusao_habilitada',"'exclusao_habilitada',false"])
 assert(sql.includes(v),'Contrato R14 ausente: '+v);
assert(!/DELETE\s+FROM\s+public\.|TRUNCATE\s+TABLE|DROP\s+TABLE/i.test(sql),'Nenhuma exclusão de registros no SQL');
assert(!/GRANT\s+(?:DELETE|UPDATE|INSERT)\s+ON\s+public\.educart_inscricoes_/i.test(sql),'Tabelas R14 só podem ser alteradas pela RPC auditada');
assert(curso.includes('educart_criar_formacao_turma_guiada_dev'),'Cadastro guiado intocado');
console.log('R14 OK: duplicidade sintética, formulário auditado, ações em lote transacionais, CSV original e exclusão apenas leitura.');
