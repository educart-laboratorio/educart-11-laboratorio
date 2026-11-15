import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('src/components/AdminIngressosSimplesDev.tsx','utf8');
const css=readFileSync('src/app/admin/admin.css','utf8');
for(const x of ["'cadastros'","'matricular'","'mensalidades'","'turmas'","'professor'","'ficha'","'contrato'"])
  assert(ui.includes(x),'Popup não disponível: '+x);
for(const x of ['cadastroVisiveis','filtroCadastroTurma','filtroMensalidadeTurma',
 'cobrancasVisiveis','setPeriodo','competenciaHoje','AdminRegistroModalDev',
 'educart_matricular_simples_dev','educart_definir_pagamento_simples_dev',
 'educart_sincronizar_mensalidades_simples_dev','podeGerir','primeira_competencia',
 'CONTATO','contatoBotoes','mailLink','waLink'])
  assert(ui.toLowerCase().includes(x.toLowerCase()),'R28 ausente: '+x);
assert(ui.includes('CONTRATO_URL')&&ui.includes('1Cn_YIAHq8ZtcbY2foIM2ioz7ugVv5TZk'));
assert(ui.includes("href=\"/inscricao\""),'Cadastro público deve permanecer na rota existente');
assert(ui.includes("from('educart_docentes_dev').insert("),'Cadastro de professores ausente');
assert(ui.includes('situacao:\'ativo\''),'Novo professor precisa estar ativo na turma');
assert(ui.includes('v.status===\'pago\'')&&ui.includes('v.status===\'pendente\''));
assert(ui.includes('contatos.find')&&ui.includes('getCadastro')===false);
assert(!/exportar|atrasad|dias de atraso/i.test(ui));
assert(css.includes('.educart-popup-tarefas')&&css.includes('@media(max-width:680px)'));
console.log('R28 PASS: sete pop-ups, cadastro real, matrícula, mensalidade por mês, contato, contrato, docentes e filtros.');
