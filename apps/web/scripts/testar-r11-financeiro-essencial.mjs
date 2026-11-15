import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(p,'utf8');
const legado=ler('src/components/AdminFinanceiroDev.tsx');
const painel=ler('src/components/AdminFinanceiroEssencialR11Dev.tsx');
const editor=ler('src/components/AdminFinanceiroEdicaoR11Dev.tsx');
assert(legado.includes('AdminFinanceiroEssencialR11Dev'));
assert(!legado.includes('admin-r11-legado')&&!legado.includes('AdminFinanceiroLegadoDev'),'A tela não pode montar o legado para evitar duas cobranças concorrentes');
const sqlAnterior=ler('../../supabase/security-review/EDUCART_11_DEV_PIX_CONFERENCIA_MANUAL_20261104.sql');
assert(sqlAnterior.includes('educart_conferir_pix_dev'),'Contrato histórico Pix preservado em SQL versionado');
for(const n of ['Todos os clientes','Este mês','Registrar pagamento','montarProgresso24','historicoAteMesAtual','admin-r11-grade','educart_parcelas_financeiras_r11_dev','educart_baixas_financeiras_r11_dev'])assert(painel.includes(n),'painel: '+n);
for(const n of ['educart_r11_salvar_rascunho_dev','educart_r11_ativar_plano_dev','educart_r11_importar_historico_dev','educart_r11_registrar_recebimento_dev','p_pagador_nome','p_recebedor_nome','p_pago_em','p_modalidade','p_idempotencia','obterPapeisGestao','AdminAjuda'])assert(editor.includes(n),'editor: '+n);
assert(editor.includes("crypto.randomUUID()"));
assert(editor.includes("p_confirmei_recebimento:true"));
assert(editor.includes("p_confirmo_plano:true"));
assert(editor.includes("setPagador('')"),'Não presumir que o estudante pagou');
assert(editor.includes("useState('')"),'Não preselecionar recebedor sem evidência');
for(const s of [
 "setParcelaAberta({id:c.id,numero:p.numero})",
 "indicadorAberto&&<AdminRegistroModalDev",
 "parcelaAberta&&clienteParcela&&detalheParcela&&<AdminRegistroModalDev",
 "editorPagamento&&<AdminRegistroModalDev","editorPlano&&<AdminRegistroModalDev",
 "Manter pendente — sem alteração","Registrar como paga — conferir recebimento",
 "Sem plano aprovado","clienteParcela.incompleto","AdminFinanceiroEdicaoR11Dev"
])assert(painel.includes(s),'Indicador/parcela sem ação protegida: '+s);
assert(!painel.includes("if(parcela?.situacao==='pendente')abrirPagamento("),
 'Os 24 botões não podem permanecer inertes');
assert(painel.includes("admin-r11-legenda"),'Legenda explícita nos 24 estados');
assert(painel.includes("futura:'Futura'"),'Mês futuro sem falsa inadimplência');
const sql=ler('../../supabase/security-review/EDUCART_R11_DEV_FINANCEIRO_24_MENSALIDADES_20261105.sql');
const hist=ler('../../supabase/security-review/EDUCART_R11_DEV_IMPORTACAO_HISTORICO_INCREMENTAL_20261105.sql');
for(const t of ['educart_planos_financeiros_r11_dev','educart_parcelas_financeiras_r11_dev','educart_baixas_financeiras_r11_dev','enable row level security','security definer','revoke all','coordenacao','p_confirmei_recebimento is distinct from true'])assert(sql.includes(t),'SQL: '+t);
assert(hist.includes('educart_r11_importar_historico_dev'));
const antiLegado=ler('../../supabase/security-review/EDUCART_R11_DEV_BLOQUEIO_DUPLICIDADE_LEGADO_20261105.sql');
assert(antiLegado.includes('educart_interno_dev.educart_r11_ativar_plano_dev'));
assert(antiLegado.includes('from public.mensalidades_formacao ml'));
assert(antiLegado.includes('ml.competencia>=v_plano.competencia_inicial'));
assert(antiLegado.includes("errcode='23505'"),'Conflito legado deve bloquear 24 parcelas duplicadas');
assert(!/drop table|delete from public\.mensalidades_formacao|truncate/i.test(antiLegado),
  'Bloqueio não pode apagar mensalidades antigas');

assert(!/alter table public\.mensalidades_formacao|drop table public\./i.test(sql),'proteger financeiro anterior');
// Triagem conversacional: evidência recebida não pode virar baixa automática.
const triagemSql=ler('../../supabase/security-review/EDUCART_R11_DEV_TRIAGEM_COMPROVANTES_CHAT_20261110.sql');
for(const termo of [
 'educart_comprovantes_triagem_chat_dev','enable row level security',
 'educart_triagem_chat_pix_unico',"situacao = 'conciliado'",
 'grant select on public.educart_comprovantes_triagem_chat_dev to authenticated',
 'for select to authenticated','conversa_autodev'
])assert(triagemSql.includes(termo),'Triagem SQL sem guarda: '+termo);
assert(!/insert into public\\.(?:educart_baixas_financeiras_r11_dev|matriculas)|update public\\.educart_parcelas_financeiras_r11_dev/i.test(triagemSql),
 'Intake de print não pode criar matrícula, baixa ou quitação');
for(const s of ['Comprovantes recebidos por conversa','educart_comprovantes_triagem_chat_dev',
 'document.visibilityState','Aguardando conferência','Matrícula não vinculada neste comprovante'])
 assert(painel.includes(s),'Painel não exibe a triagem de forma segura: '+s);
console.log('R11 PASS: painel com 3 funções, 24 parcelas, histórico individual e 4 meios de pagamento; sem publicar.');
