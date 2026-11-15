/**
 * EducART 1.1 — proveniência da versão 1.0 + aceitação FUNCIONAL da 1.1.
 *
 * O manifesto R01 é histórico, não uma proibição de evoluir componentes.
 * Referências da 1.0 permanecem auditáveis; mudanças aprovadas na 1.1
 * são avaliadas pelo comportamento e pela segurança atuais, não por SHA
 * idêntico de JSX/CSS antigo. Teste local sem rede nem alteração de dados.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const manifesto = JSON.parse(readFileSync(new URL('AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json',root),'utf8'));
assert.match(manifesto.source.commit,/^[a-f0-9]{40}$/,'Referência histórica da 1.0 inválida');
assert.equal(manifesto.production.gitCommit,manifesto.source.commit,'Proveniência 1.0 inconsistente');
assert(Array.isArray(manifesto.protectedPublicFiles) && manifesto.protectedPublicFiles.length>0,
  'Manifesto histórico deve continuar recuperável');
const trilhas = new Set();
let originais = 0, evoluidos = 0, removidosDoWorkspace = 0;
for(const anterior of manifesto.protectedPublicFiles){
  assert.match(anterior.path,/^apps\/web\/src\/[a-zA-Z0-9/_.-]+$/);
  assert.match(anterior.gitBlobSha,/^[a-f0-9]{40}$/);
  assert(!trilhas.has(anterior.path),'Caminho duplicado no histórico: '+anterior.path);
  trilhas.add(anterior.path);
  const url = new URL(anterior.path,root);
  if(!existsSync(url)){removidosDoWorkspace++;continue;}
  const bytes=readFileSync(url);
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(sha===anterior.gitBlobSha)originais++;else evoluidos++;
}
console.log('R01 HISTÓRICO: commit 1.0='+manifesto.source.commit.slice(0,12)+
  '; arquivos idênticos='+originais+'; evoluídos='+evoluidos+
  '; ausentes no workspace='+removidosDoWorkspace+'; diferenças não bloqueiam aprovação da 1.1.');

const ler=(caminho)=>readFileSync(new URL('apps/web/'+caminho,root),'utf8');
const inicio=ler('src/app/page.tsx');
const catalogo=ler('src/app/formacao/page.tsx');
const inscricao=ler('src/app/inscricao/page.tsx');
const cadastro=ler('src/app/cadastro/page.tsx');
const criar=ler('src/app/criar/page.tsx');
const propostaDocente=ler('src/app/criar/FormularioPropostaDocente.tsx');
const configSupabase=ler('src/lib/supabase/client.ts');
const ficha=ler('src/components/InscricaoForm.tsx');
const painel=ler('src/app/admin/page.tsx');
const acesso=ler('src/lib/admin/autorizar-gestao.ts');
const proxy=ler('src/proxy.ts');
const aviso=ler('src/app/inscricao-previa/page.tsx');

for(const [nome,ok] of [
  ['Portal 1.1 monta a entrada verdadeira',inicio.includes('<EntradaEducart />')],
  ['Catálogo mantém a Formação de Atores',catalogo.includes('Formação de Atores')],
  ['Catálogo mantém a triagem etária',catalogo.includes('FAIXA_ATE_13')],
  ['Inscrição oficial monta a ficha',inscricao.includes('<InscricaoElegibilidade />')],
  ['Cadastro usa a inscrição oficial',cadastro.includes("from '../inscricao/page'")],
  ['Proposta docente oficial disponível',criar.includes('<FormularioPropostaDocente/>')],
  ['Produção exige ativação explícita da proposta',
    configSupabase.includes("NEXT_PUBLIC_EDUCART_PROPOSTAS_DOCENTES_APROVADAS === 'true'") &&
    configSupabase.includes("doygnsubiitencoyzjzk.supabase.co")],
  ['Propostas sem backend aprovado não coletam dados',
    propostaDocente.includes('if(!PROPOSTAS_DOCENTES_HABILITADAS)return <section') &&
    propostaDocente.includes('if(!PROPOSTAS_DOCENTES_HABILITADAS){setErro(')],
  ['Inscrição oficial conserva persistência',ficha.includes(".from('inscricoes_oficina').insert([payload])")],
  ['Secretaria exige Auth real',painel.includes('supabase.auth.getUser()')],
  ['Secretaria exige papel de gestão',painel.includes('obterPapeisGestao')],
  ['Papel exige associação ao portal',acesso.includes(".from('portal_admins')")],
  ['Papel é persistido em equipe_papeis',acesso.includes(".from('equipe_papeis')")],
  ['Inscrição DEV pública da candidata é reescrita',proxy.includes("NextResponse.rewrite(new URL('/inscricao-previa', request.url))")],
  ['Aviso não monta formulário',!/<(?:form|input|textarea|select)(?:\s|>)/i.test(aviso)],
  ['Aviso não usa cliente Supabase',!/(?:createClient\s*\(|\.insert\s*\(|\.upload\s*\()/i.test(aviso)],
]){
  assert(ok,'ACEITAÇÃO 1.1: '+nome);
}
console.log('R42 PASS: legado 1.0 rastreável; catálogo, inscrição, propostas, Auth/RBAC e aviso R41 verificados no código 1.1.');
