import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ui=readFileSync('src/components/AdminAtendimentoR12Dev.tsx','utf8');
const admin=readFileSync('src/app/admin/page.tsx','utf8');
const sql=readFileSync('../../supabase/security-review/EDUCART_11_DEV_R12_HISTORICO_ATENDIMENTO_20261105.sql','utf8');
for(const s of ['Fila de retornos','Histórico de atendimento','proximo_retorno_em','registrado_por:user.id',
 'canal,resultado','obterPapeisGestao','supabase.from(\'educart_atendimentos_r12_dev\')','sem dados sensíveis'])
 assert(ui.includes(s),'Contato incompleto: '+s);
assert(admin.includes('modo="fila"')&&admin.includes('modo="ficha"'),'Fila e ficha devem coexistir');
assert(admin.includes('inscricaoId={selectedInscricao.id}'),'Contato deve usar a mesma inscrição');
// Na Secretaria, ferramentas complementares ficam APÓS os KPIs, filtros e tabela.
const indiceTabela=admin.indexOf('{/* TABELA DE INSCRIÇÕES */}');
const indiceRetornos=admin.indexOf('Retornos de atendimento');
const indiceIntegridade=admin.indexOf('Conferir integridade das matrículas');
const indiceModal=admin.indexOf('{/* MODAL DETALHES COMPLETOS DA FICHA */}');
assert(indiceTabela>=0&&indiceTabela<indiceRetornos&&indiceRetornos<indiceIntegridade&&indiceIntegridade<indiceModal,
  'Retornos e integridade devem aparecer abaixo da lista principal, nessa ordem');

for(const s of ['ENABLE ROW LEVEL SECURITY','REVOKE ALL','WITH CHECK','registrado_por=(SELECT auth.uid())','ON DELETE RESTRICT'])
 assert(sql.includes(s),'RLS obrigatório: '+s);
assert(!/fetch\(['"]https|\.signIn|\.signUp|\.rpc\(|\.update\(|\.delete\(/.test(ui),'Sem contatos automáticos ou mudanças retroativas');
console.log('Q11 PASS: histórico privado imutável, fila de retornos e nenhum envio automático.');
