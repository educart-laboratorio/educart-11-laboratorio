/** R12: contratos estáticos para vinculação sem contabilidade. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(p,'utf8');
const adm=ler('src/components/AdminRotinaAcademicaLab.tsx');
const painel=ler('src/app/admin/page.tsx');
const estudantes=ler('src/components/AdminEstudantesDev.tsx');
const clientes=ler('src/components/AdminClientesDev.tsx');
const turmas=ler('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const estilo=ler('src/app/admin/admin.css');
for(const campo of ['educart-turma-card-heading','educart-turma-card-meta','educart-turma-card-actions',
 'onClick={()=>abrirFichaTurma(t.id)}','onClick={()=>void excluirTurma(t)}'])
 assert(turmas.includes(campo),'Lista de turmas deve preservar os detalhes e ações sem corte: '+campo);
assert(estilo.includes('grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr))'),
 'Lista de turmas precisa ajustar suas colunas à largura do modal, não à tela inteira');
assert(!estilo.includes('grid-template-columns:minmax(130px,.95fr) minmax(180px,1.45fr)'),
 'Grade antiga com largura mínima maior que a janela foi preservada indevidamente');
assert(estilo.includes('.educart-turma-card-actions')&&estilo.includes('flex-wrap: wrap;'),
 'Botões de gerenciar alunos e turmas precisam ficar visíveis sem rolagem horizontal');
const ui=ler('src/components/AdminVincularEstudanteTurmaDev.tsx');
const sql=ler('../../supabase/security-review/EDUCART_11_DEV_R12_VINCULO_ESTUDANTE_TURMA_20261105.sql');
const modal=ler('src/components/AdminRegistroModalDev.tsx');
const novoSql=ler('../../supabase/security-review/EDUCART_12_DEV_R12_NOVO_INGRESSO_PENDENTE_20261110.sql');
for(const s of ['AdminEstudantesDev','secao===\'estudantes\''])
 assert(adm.includes(s),'Acadêmico não mostra área Estudantes: '+s);
for(const s of ['AdminVincularEstudanteTurmaDev','Adicionar pessoa à turma','podeGerir={podeGerir}'])
 assert(estudantes.includes(s),'Estudantes não integra módulo R12: '+s);
assert(estudantes.includes('Pessoas cadastradas ({pessoas.length})')&&
 estudantes.includes('iniciarVinculoPessoa(pessoaVisualizada.id)')&&
 estudantes.includes('pessoaInicialId={pessoaParaVinculoId??undefined}'),
 'Pessoas devem aparecer mesmo sem matrícula e ir direto da ficha para turma');
for(const s of ["atuais.length>0?'Já vinculado':'Vincular à turma'",
 "disabled={atuais.length>0||carregando||!!erro}",
 "className={'admin-btn '+(atuais.length>0?'admin-btn-vinculo-inativo':'admin-btn-primary')}"])
 assert(estudantes.includes(s),'Botão da ficha deve desativar para pessoa já vinculada: '+s);
for(const s of ["matriculasPessoaId===selecionado.pessoa_id",
 "count>(data??[]).length","disabled={vinculoIndisponivel}",
 "jaVinculado?'Já vinculado'"])
 assert(clientes.includes(s),'Ficha de clientes não bloqueia corretamente o atalho: '+s);
assert(ler('src/app/admin/admin.css').includes('.admin-btn-vinculo-inativo'),
 'Botão cinza desativado precisa de estilo próprio');
assert(clientes.includes('setSelecionado(atual=>atual?{...atual}:null)'),
 'Após um vínculo, a ficha de cliente precisa atualizar matrículas');
assert(clientes.includes('pessoaInicialId={contatoParaVinculo.pessoa_id??undefined}')&&
 clientes.includes('contatoInicial={contatoParaVinculo.pessoa_id?undefined:{')&&
 clientes.includes('onRascunhoPendenteChange={setRascunhoVinculoPendente}'),
 'Ficha de Clientes deve reutilizar vínculo R12 para pessoa vinculada ou contato a conferir');
for(const s of ['Selecionar cadastro existente','Recadastrar estudante antigo','pessoa_id','turma_id','educart_r12_vincular_estudante_turma_dev','p_confirmei_identidade','p_confirmei_documentos','p_ingresso_em','p_tipo_vinculo','obterPapeisGestao'])
 assert(ui.includes(s),'UI R12 incompleta: '+s);
for(const s of ['ENABLE ROW LEVEL SECURITY','SECURITY DEFINER','SECURITY INVOKER','public.portal_admins','public.equipe_papeis','pessoa_id','matricula_id','vinculo_pendente','legado_ativo','pg_advisory_xact_lock','recadastramento','FOR UPDATE','p_confirmei_identidade'])
 assert(sql.includes(s),'SQL R12 sem guarda: '+s);
assert.match(sql,/REVOKE ALL ON public\.educart_vinculos_manuais_r12_dev FROM PUBLIC,anon,authenticated/);
assert.match(sql,/REFERENCES public\.matriculas\(id\)/);
assert.match(sql,/p_confirmei_documentos IS DISTINCT FROM TRUE/);
assert(!/INSERT INTO public\.(?:mensalidades_formacao|educart_baixas_financeiras_r11_dev|educart_pix_manuais)|UPDATE public\.inscricoes_oficina/i.test(sql));
assert(!/service_role|sb_secret_|NEXT_PUBLIC.*SERVICE_ROLE|db_password/i.test(ui));
// Portão visual do botão amarelo: reaproveita a janela nativa e não desmonta o formulário.
for(const s of ['onClose={confirmarSaida?()=>setConfirmarSaida(false):solicitarFechamentoVinculo}',
 'onRascunhoPendenteChange={setRascunhoPendente}','onOperacaoEmCursoChange={setOperacaoEmCurso}',
 'Permanecer no cadastro','Descartar alterações e sair','aria-haspopup="dialog"','amplo cadastro'])
 assert(estudantes.includes(s),'Abertura protegida R12 ausente: '+s);
assert(!estudantes.includes('setMostrarVinculo(v=>!v)'), 'Botão não pode alternar e desmontar o formulário diretamente.');
assert(estudantes.includes("style={confirmarSaida?{display:'none'}:undefined}"),
 'Confirmar descarte deve conservar o formulário montado.');
assert(adm.includes('onRascunhoPendenteChange?.(rascunhoPendente||rascunhoEstudantePendente)')&&
 painel.includes('rascunhoAcademicoPendente')&&
 painel.includes('if(pendente){setDestinoSolicitado(destino);return;}')&&
 painel.includes('onClick={confirmarDescarteDestino}')&&
 painel.includes('Permanecer no formulário'),
 'Navegação central não pode desmontar rascunho R12 sem confirmação.');
assert(adm.includes('onRascunhoPendenteChange={setRascunhoEstudantePendente}'),
 'Mudança de seção exige guarda do rascunho R12.');
for(const s of ['baseRascunho','rascunhoAtual!==baseRascunho','beforeunload',
 'onOperacaoEmCursoChange?.(gravando||ativandoTurma)','Voltar ao vínculo sem perder os dados',
 "style={visualizada?{display:'none'}:undefined}",'onClick={voltarDaFicha}',
 "role=\"region\" aria-label={'Ficha de '+visualizada.nome_completo}"])
 assert(ui.includes(s),'Proteção R12 ausente: '+s);
assert(!ui.includes('<AdminRegistroModalDev'), 'Ficha R12 não pode abrir modal sobre modal.');
assert(modal.includes('if(!dialog.open)dialog.showModal()') &&
 modal.includes('onCancel={e=>{e.preventDefault();onClose();}}'),
 'Reutilizar modal acessível nativo, sem mexer no backdrop.');
assert(!/INSERT INTO|\.rpc\(/i.test(estudantes),
 'Apenas UI de Estudantes: não pode criar chamadas de escrita.');
// A segunda entrada R12 deve proteger o mesmo rascunho e a mesma operação.
for(const s of [
 'onClose={confirmarSaidaGerir?()=>setConfirmarSaidaGerir(false):solicitarFechamentoGerirAlunos}',
 'onRascunhoPendenteChange={setRascunhoGerirPendente}',
 'onOperacaoEmCursoChange={setOperacaoGerirEmCurso}',
 'precisaConfirmarSaidaCadastro(!!gerirTurmaId,rascunhoGerirPendente)',
 'if(operacaoGerirEmCurso)',
 "style={confirmarSaidaGerir?{display:'none'}:undefined}",
 'Permanecer no cadastro','Descartar alterações e sair',
 'origemGerirRef.current?.focus()'
]) assert(turmas.includes(s),'Entrada Turmas sem proteção R12: '+s);
assert(!turmas.includes('onClose={()=>setGerirTurmaId(null)} amplo>'),
 'Turmas não pode desmontar R12 diretamente.');
console.log('R12 MODAL PASS: acionamento imediato, rascunho, navegação, ficha integrada, estado vazio e sem SQL novo.');
for(const s of ["type Origem = 'novo'|'recadastramento'",'name="r12-origem"',
  'Novo ingresso — cadastrar aluno com vínculo pendente','Recadastramento histórico',
  "p_tipo_vinculo:origem==='novo'?'novo_pendente':situacao",
  'origem,situacao','setIngresso(\'\')'])
 assert(ui.includes(s),'Novo ingresso ausente: '+s);
for(const s of ["p_tipo_vinculo NOT IN ('legado_ativo','vinculo_pendente','novo_pendente')",
  "THEN 'novo' ELSE 'recadastramento'",
  "THEN 'vinculo_pendente' ELSE p_tipo_vinculo",
  'p_ingresso_em IS NOT NULL OR p_confirmei_documentos IS TRUE',
  'public.portal_admins','public.equipe_papeis','pg_advisory_xact_lock','FOR UPDATE'])
 assert(novoSql.includes(s),'Nova migração sem guarda: '+s);
assert(!novoSql.includes('CREATE TABLE')&&!novoSql.includes('DROP TABLE')&&!novoSql.includes('DELETE FROM'),
 'Patch SQL deve preservar tabelas e matrículas');
assert(sql.includes("VALUES(v_pessoa,p_turma_id,'recadastramento',v_situacao,p_ingresso_em)"),
 'SQL histórico precisa ser preservado');
console.log('R12 NOVO INGRESSO PASS: tipo novo_pendente, origem correta, pendente e auditoria.');
console.log('R12 PASS: cadastro manual auditado, proteção contra duplicidade, sem matrícula financeira ou envio.');
