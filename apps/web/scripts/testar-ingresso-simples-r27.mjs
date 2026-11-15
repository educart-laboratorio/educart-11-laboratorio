import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync('src/app/admin/page.tsx','utf8');
const ui=readFileSync('src/components/AdminIngressosSimplesDev.tsx','utf8');
const css=readFileSync('src/app/admin/admin.css','utf8');
assert(page.includes("id:'ingressos',nome:'Matrículas e mensalidades'"));
assert(page.includes('<AdminIngressosSimplesDev')&&page.includes('setRascunhoIngressosPendente'));
assert(ui.includes("supabase.rpc('educart_matricular_simples_dev'"));
assert(ui.includes('pessoaId:p.id')&&ui.includes('pessoaId:m?.pessoa_id??null'),
 'Cadastros de pessoas devem conservar seu ID sem depender de inscrição');
assert(ui.includes('const botaoMatricular=(c:ContatoView)=>')&&
 ui.includes('{botaoMatricular(c)}')&&ui.includes('{botaoMatricular(contatoSelecionado)}'),
 'Todos os cadastros devem ter o mesmo atalho de matrícula na lista e na ficha');
assert(ui.includes("popup==='vincularPessoa'&&pessoaVinculoId")&&
 ui.includes('pessoaInicialId={pessoaVinculoId}')&&
 ui.includes('<AdminVincularEstudanteTurmaDev'),
 'Cadastro de pessoa sem inscrição deve reutilizar vínculo R12');
assert(ui.includes('operacaoVinculoEmCurso')&&ui.includes('rascunhoVinculoPendente')&&
 ui.includes('void carregar();')&&ui.includes('admin-btn-vinculo-inativo'),
 'Ação precisa bloquear vínculos ativos e proteger cadastro não salvo');
assert(ui.includes("supabase.rpc('educart_sincronizar_mensalidades_simples_dev'"));
assert(ui.includes("supabase.rpc('educart_definir_pagamento_simples_dev'"));
assert(ui.includes('value="28000"')&&ui.includes('value="30000"')&&ui.includes('value="32000"'));
assert(ui.includes("['nenhuma','Sem bolsa']")&&ui.includes("['integral','Bolsa integral']"));
assert(ui.includes("['meia','Meia bolsa']")&&ui.includes("['outra','Outra bolsa']"));
assert(ui.includes("supabase.from('turmas')")&&ui.includes("supabase.from('educart_docentes_dev')"));
assert(ui.includes("LOCAIS=['Casa Gameleira','Nomads Hostel']"));
assert(!/pix|comprovante|upload|storage\.from/i.test(ui.replace(/sem interface Pix|Sem comprovantes ou meios de pagamento/gi,'')));
assert(css.includes('.educart-ingresso-grid')&&css.includes('@media(max-width:680px)'));
assert(ui.includes('titulo="Professores e locais das turmas"')&&
 !ui.includes('Professor e local de cada turma')&&
 !ui.includes('As cinco turmas existentes usam o mesmo banco de professores.'),
 'Modal de professores e locais não pode ter títulos duplicados ou contagem fixa');
assert(ui.includes('educart-ingresso-turma-campos')&&ui.includes('turmas.map(t=>')&&
 ui.includes('edicoes[t.id]')&&ui.includes('onClick={()=>void salvarTurma(t)}'),
 'Todas as turmas precisam ter professor, local e salvamento individual preservados');
assert(css.includes('repeat(auto-fit,minmax(min(100%,230px),1fr))')&&
 !css.includes('grid-template-columns:75px minmax(0,1fr) minmax(0,1fr) auto'),
 'Formulário de turma não pode distribuir labels e selects fora da largura do modal');
console.log('R27 OK: cadastro -> matricula -> mensalidade; bolsa e professores; nenhum formulario Pix.');
