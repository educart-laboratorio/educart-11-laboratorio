/** EducART R07.1 — contrato de papeis, finance/WhatsApp mobile, sem rede ou deploy. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { classificarAdimplencia } from '../src/lib/financeiro/adimplencia-dev.ts';

const read=p=>readFileSync(p,'utf8');
const page=read('src/app/admin/page.tsx');
const financeiro=read('src/components/AdminFinanceiroEssencialR11Dev.tsx');
const turma=read('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const css=read('src/app/admin/admin.css');
const proxy=read('src/proxy.ts');
const login=read('src/app/admin/login/page.tsx');
const original=read('src/components/WhatsAppFlutuante.tsx');
const lei=read('scripts/preparar-homologacao-cloudflare.mjs');
const publicadorProd=read('scripts/deploy-worker.mjs');
const publicadorPreview=read('scripts/deploy-preview-publico.mjs');
const sql=read('../../supabase/security-review/R07_1_DEV_FINANCEIRO_COORDENACAO_LEITURA_MINIMA_20261105.sql');

// Aline: a politica de leitura do banco deve restringir a gestao a coordenacao.
// Estudantes continuam autorizados a consultar suas proprias mensalidades.
assert(sql.includes('ALTER POLICY "mensalidades_admin_select"'));
assert(sql.includes("ep.papel='coordenacao'"));
assert(!sql.includes("ep.papel IN ('secretaria','coordenacao')"));
assert(sql.includes('educart_estudante_ler_mensalidades_proprias_dev'));
assert(sql.includes('NAO APLICAR EM PRODUCAO'));

// Permissões atuais: financeiro exige Coordenação, turmas só via planejamento guiado.
assert(page.includes("areaAtiva === 'financeiro'"));
assert(page.includes("podeGerir={podeAlterarStatus}"));
assert(financeiro.includes("if(!podeGerir)"));
assert(financeiro.includes("educart_planos_financeiros_r11_dev"));
assert(turma.includes("papeis.includes('coordenacao')"));
assert(turma.includes("educart_criar_formacao_turma_guiada_dev"));
// A classificacao conservadora nao exibe quitacao falsa.
const hoje='2026-11-05';
const parcela={competencia:'2026-11-01',vencimento_em:'2026-11-10',
  status:'pago',confirmado_em:'2026-11-05T10:00:00Z',confirmado_por:'00000000-0000-4000-8000-000000000001'};
assert.equal(classificarAdimplencia([parcela],hoje,true),'regular');
assert.equal(classificarAdimplencia([{...parcela,confirmado_por:null}],hoje,true),'conferencia');
assert.equal(classificarAdimplencia([{...parcela,competencia:'2026-10-01'}],hoje,true),'sem_competencia');
assert.equal(classificarAdimplencia([parcela],hoje,false),'amostra_incompleta');
assert.equal(classificarAdimplencia([],hoje,true),'sem_lancamento');

// Exercer o código REAL de WhatsApp (sem API nem disparo da mensagem).
const context=vm.createContext({encodeURIComponent,console});
const makeModule=(path,name)=>new vm.SourceTextModule(
  ts.transpileModule(read(path),{compilerOptions:{
    module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,
  {context,identifier:name});
const msg=makeModule('src/lib/mensagens-whatsapp.ts','mensagens');
const wa=makeModule('src/lib/atendimento/whatsapp-equipe-dev.ts','atendimento');
await wa.link(specifier=>{
  if(specifier!=='../mensagens-whatsapp')throw Error('Import inesperado: '+specifier);
  return msg;
});
await wa.evaluate();
const link=wa.namespace.linkPrimeiroContatoSecretaria;
const nome='Lia Fictícia';
const esperado='5571999999999';
const linkLocal=link('(71) 99999-9999',nome);
const linkInternacional=link('+55 (71) 99999-9999',nome);
assert.equal(linkLocal,linkInternacional,'Prefixo 55 nao deve duplicar');
const url=new URL(linkLocal);
assert.equal(url.protocol,'https:');
assert.equal(url.host,'wa.me');
assert.equal(url.pathname,'/'+esperado);
const mensagem=url.searchParams.get('text');
assert(mensagem?.includes('Olá, Lia!'),'Saudacao com primeiro nome');
assert(mensagem?.includes('Recebemos sua ficha de inscrição'),'Mensagem contextual de atendimento');
assert(!mensagem?.includes('32000') && !mensagem?.includes('pendência financeira'),
  'Atendimento nao deve divulgar finanças');
assert(page.includes('linkPrimeiroContatoSecretaria(item.telefone_whatsapp, item.nome_completo)'));
assert(page.includes('target="_blank"')&&page.includes('rel="noopener noreferrer"'),
  'WhatsApp deve abrir separadamente com rel seguro');
assert(page.includes('aria-label="Abrir WhatsApp do candidato com mensagem de primeiro contato"'));

// Em <=720px, tabela vira cartões; botões de primeiro contato ampliados para toque.
assert(css.includes('@media (max-width: 720px)'));
const mediaMobile=css.split('@media (max-width: 720px)')[1].split('@media (max-width: 350px)')[0];
assert(mediaMobile.includes('.admin-table tbody { display: grid;'));
assert(mediaMobile.includes('.admin-table thead { display: none;'));
assert(mediaMobile.includes('.quick-action-btn { min-width: 44px; min-height: 44px; }'));
assert(mediaMobile.includes('.admin-modal-box .admin-btn { min-height: 44px; }'));

// R07 ainda nega sem sessão; LIPE de acessibilidade e WhatsApp flutuante intactos.
assert(proxy.includes('supabase.auth.getClaims()')&&proxy.includes('supabase.auth.getUser()'));
assert(proxy.includes("return erro(403)")&&proxy.includes("return erro(503)"));
assert(login.includes('obterPapeisGestao'));
assert(original.includes('identificarContexto()')&&original.includes('educart-whatsapp-persistente'));
assert(lei.includes("throw Error('R07 BLOQUEIO:"));
assert(lei.indexOf("throw Error('R07 BLOQUEIO:")<lei.indexOf('const config={'),
  'Deploy deve falhar antes de qualquer chamada Wrangler');
assert(publicadorProd.includes('if (!dryRun) {')&&publicadorProd.includes('R07.1 BLOQUEIO:'));
assert(publicadorPreview.includes('if (deploy) {')&&publicadorPreview.includes('R07.1 BLOQUEIO:'));


console.log('R07.1 OK: Aline financeiro exclusivo na gestao; Felipe secretaria e WhatsApp em celular.');
console.log('R07.1 OK: 44px toque, mensagem manual, RLS DEV, sem verde falso, deploy bloqueado.');
console.log('PENDENTE: browser real + HTTP real + sessoes reais. Nenhum deploy nesta auditoria.');
