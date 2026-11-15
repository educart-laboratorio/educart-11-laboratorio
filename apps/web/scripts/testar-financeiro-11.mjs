import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  mensagemCobrancaMensalidadeEducart,
  linkCobrancaMensalidadeEducart,
} from '../src/lib/mensagens-whatsapp.ts';

const sql = readFileSync('../../supabase/security-review/EDUCART_11_DEV_PIX_CONFERENCIA_MANUAL_20261104.sql', 'utf8');
const ui = readFileSync('src/components/AdminFinanceiroEdicaoR11Dev.tsx', 'utf8');
const academia = readFileSync('src/components/AdminRotinaAcademicaLab.tsx', 'utf8');

// A planilha não representa baixa automática e o Pix é mero registro inicial.
for (const [nome, teste] of [
  ['RLS obrigatório', /alter table public\.educart_pix_manuais enable row level security/i],
  ['RBAC Coordenação', /e\.papel='coordenacao'/],
  ['Secretaria leitura', /e\.papel in \('coordenacao','secretaria'\)/],
  ['Bloqueio público', /revoke all on public\.educart_pix_manuais from public, anon, authenticated/i],
  ['Imutabilidade', /Dados originais do Pix são imutáveis/],
  ['Autoria e data', /conferido_por=v_uid,\s*conferido_em=now\(\)/],
  ['Transição limitada', /old\.situacao <> 'registrado' or new\.situacao <> 'conferido'/],
  ['Única matrícula', /create unique index educart_pix_uma_matricula_conferida/i],
  ['Única mensalidade', /create unique index educart_pix_uma_mensalidade_conferida/i],
  ['Execução via RPC', /current_setting\('educart\.pix_conferencia_rpc',true\)/],
  ['Proteção de status legados', /educart_bloquear_status_financeiro_direto_dev/],
  ['Proteção de matriculas ativas', /educart_matricula_ativa_por_pix/],
  ['Proteção de inscrições matriculadas', /educart_inscricao_matriculada_por_pix/],
  ['Proteção de mensalidades pagas', /educart_mensalidade_paga_por_pix/],
  ['Confirmação transacional', /set_config\('educart\.pix_conferencia_rpc','true',true\)/],
  ['Função sem privilégio elevado', /security invoker/],
  ['Conferência extrato exigida', /p_conferi_extrato is distinct from true/],
  ['Ativação sob confirmação', /set situacao='ativa'/],
  ['Matrícula da inscrição', /set status='matriculado'/],
  ['Mensalidade paga por confirmação', /status='pago', pago_em=v_pix\.ocorrido_em/],
  ['Sem débito automático', /sem/],
]) { assert.match(sql, teste, nome); }
assert.doesNotMatch(sql, /security definer/i, 'não escalar privilégios');
assert.doesNotMatch(sql, /insert into public\.mensalidades_formacao/i, 'não emitir cobrança ao receber Pix');
assert.doesNotMatch(sql, /http_post|net\.http|twilio|whatsapp\.send/i, 'sem envio automático');

assert.match(ui, /educart_r11_registrar_recebimento_dev/, 'registros financeiros somente por RPC R11');
assert.match(ui, /obterPapeisGestao/, 'revalidação de papel');
assert.match(ui, /p_confirmei_recebimento:true/, 'confirmação humana obrigatória');
assert.doesNotMatch(ui, /educart_conferir_pix_dev|service_role|database-prod|sb_secret_/, 'nenhum fluxo Pix antigo na UI');
const admin = readFileSync('src/app/admin/page.tsx','utf8');
assert.match(admin, /<AdminFinanceiroDev supabase=\{supabase\} podeGerir=\{podeAlterarStatus\}/, 'financeiro em área própria do painel');
assert.match(admin, /newStatus === 'matriculado'/, 'impedir matrícula sem conferência financeira');
assert.match(admin, /value="matriculado" disabled/, 'retirar mudança de status direto');

const mensagem = mensagemCobrancaMensalidadeEducart({
  nome: 'Pessoa Exemplo', turma: 'ATORES-T1',
  competencia: '2026-11', vencimento: '10/11/2026', valor: 'R$ 320,00',
});
assert.match(mensagem, /Pessoa!/);
assert.match(mensagem, /R\$ 320,00/);
assert.match(mensagem, /Se você já realizou o Pix/, 'evitar cobrança de quem já pagou');
const link = linkCobrancaMensalidadeEducart('71 99999-8888', mensagem);
assert.ok(link?.startsWith('https://wa.me/5571999998888?text='));
assert.equal(linkCobrancaMensalidadeEducart('', mensagem), null);
assert.equal(linkCobrancaMensalidadeEducart('abc', mensagem), null);

console.log('OK: Pix manual, mensais sem cobrança automática, confirmação transacional e WhatsApp humano.');
