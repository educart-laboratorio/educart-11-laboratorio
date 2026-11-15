/** EducART 1.1 — prova de consolidacao INTERNA: heranca 1.0 + R07.4. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// LIPE: a portaria R07.5 permanece protegida. Exceção R16 autorizada
// para URL UUID de perfil docente consentido; dois hashes exatos abaixo.
// Nenhuma alteração genérica de identidade ou desbloqueio de /admin.
const branchAtual=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||
  execFileSync('git',['branch','--show-current'],{cwd:'../..',encoding:'utf8'}).trim();
const reparoR075=branchAtual==='autodev-r07-estudantes-codespaces-private-20261106';
const hashesReparoR075=Object.freeze({
  'apps/web/src/proxy.ts':'20cfc912e3901a8aad6902d81be03fc06edcb57c',
  // R33, autorização Direção 14/11: no Worker candidato, somente início, formação
  // e inscrição são públicos. /admin, dados, RSC e API preservam Auth + RLS.
  // Hash anterior R07 (041aa3ef80510d35c7276c03d30f81f81fa6a801) preservado
  // no histórico Git; a prova HTTP pós-deploy confirmou a nova separação.
  // R37, solicitação expressa da Direção: entradas exatas /cadastro e /criar;
  // subrotas, APIs, histórico e /admin continuam protegidos, conforme testes R07.
  'apps/web/src/lib/security/preview-native-policy.ts':'739dc466ba71d66767604046697c960ad6ae882c',
});
const root=path=>readFileSync('../../'+path);
const app=path=>readFileSync('src/'+path,'utf8');
const blobSha=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
for(const [path,sha] of [
  ['.devcontainer/devcontainer.json','ed5a23e91131b7929e93434e859c97df0fec7e6c'],
  ['apps/web/src/app/layout.tsx','0a7336098f7a454516c13a31ec5870a2a1eac6bc'],
  ['apps/web/src/app/inscricao/page.tsx','38e61070b33b2e37afa05b4fe85ea99a4005e14c'],
  ['apps/web/src/proxy.ts','acc79853b73ad568ef56532da5a99bfca4438847'],
  ['apps/web/src/lib/security/preview-native-policy.ts','1e422158ea64ac1c4ac8511f847862afaac11cf4'],
  ['apps/web/scripts/deploy-preview-publico.mjs','2637e73bc09d01ace0c51b1ace616b7333c81c79'],
  ['apps/web/scripts/preparar-homologacao-cloudflare.mjs','ad4d9e7dc89b56e325281bf36e5fdd409819852d'],
  ['apps/web/scripts/deploy-worker.mjs','ae78c946aee41c20d4655bbd9b53c0dd3c77d289']
]){
  // Nesta branch isolada somente, exigir hashes exatos do reparo R07.5.
  // Em todas as demais, manter os hashes originais R07.4.
  const esperado=reparoR075&&Object.prototype.hasOwnProperty.call(hashesReparoR075,path)
    ? hashesReparoR075[path] : sha;
  assert.equal(blobSha(root(path)),esperado,'LIPE/R07: arquivo protegido alterado: '+path);
}
assert(!existsSync('../../.github/workflows/deploy-educart-11-preview-dev.yml'),
  'Publicador da PR #7 nunca pode entrar na consolidacao');
const start=root('.devcontainer/start-r074.mjs').toString('utf8');
assert(start.includes('branchesPermitidas.has(git.stdout.trim())'));
assert(start.includes("'autodev-educart-11-consolidacao-interna-2026-11-05'"));
assert(start.includes('origensPermitidas.includes(origin)'));
assert(!start.includes('wrangler')&&!start.includes('cloudflared'));
const admin=app('app/admin/page.tsx');
const academia=app('components/AdminRotinaAcademicaLab.tsx');
const layout=app('app/layout.tsx');
const inscricao=app('app/inscricao/page.tsx');
const portal=app('app/minha-educart/page.tsx');
for(const x of ['Acadêmico','Gestão de inscrições','Secretaria / Coordenação','Financeiro'])assert(admin.includes(x));
for(const x of ['<AdminRotinaAcademicaLab','<AdminGestaoInscricoesDev','<AdminFinanceiroDev','<AdminMatriculaUnificadaDev'])assert(admin.includes(x));
assert(admin.includes('linkPrimeiroContatoSecretaria'));
assert(admin.includes('gerarCsvExcel(headers, rows)'));
assert(admin.includes('<option value="matriculado" disabled>'));
assert(admin.includes("newStatus === 'matriculado'"));
assert(!admin.includes('<AdminRotinaAcademicaLab />'));
assert(!academia.includes('FICTICIOS')&&!academia.includes('NOMES_DEMONSTRACAO'));
assert(academia.includes('<AdminChamadasDev')&&academia.includes('<AdminPlanejamentoFormacaoTurmaDev'));
assert(portal.includes('educart_fotos_consentimento_dev'));
assert(!layout.includes('<AcessoGestaoPublica'));
assert(inscricao.includes('InscricaoElegibilidade'));
// R37: evolução isolada em duas rotas novas, sem reescrever o /inscricao protegido.
const politica=app('lib/security/preview-native-policy.ts');
const cadastro=app('app/cadastro/page.tsx');
const criar=app('app/criar/page.tsx');
assert(politica.includes("pathname === '/cadastro'") && politica.includes("pathname === '/criar'"));
assert(!politica.includes("pathname.startsWith('/cadastro')") && !politica.includes("pathname.startsWith('/criar')"));
// R38: descartar a jornada experimental do estudante; preservar formulário oficial original.
assert(cadastro.includes("export { default, metadata } from '../inscricao/page'"),
 'R38: /cadastro deve reutilizar /inscricao oficial, sem ficha paralela');
for(const descartado of [
 'apps/web/src/app/cadastro/CadastroGuiadoR37.tsx',
 'apps/web/src/components/InscricaoGuiadaEducart.tsx',
 'apps/web/src/components/AtualizacaoGuiadaEducart.tsx',
 'apps/web/src/components/AdminAtualizacoesCadastrosDev.tsx'
]) assert(!existsSync('../../'+descartado),'R38: componente estudante descartado não pode permanecer: '+descartado);
const alunos=app('components/AdminEstudantesDev.tsx');
assert(!alunos.includes('AdminAtualizacoesCadastrosDev'),
 'R38: não expor convites experimentais ao cadastro legado');
// Professor permanece integralmente na candidata, inclusive recebimento restrito à Coordenação.
const docente=app('components/AdminDocentesDev.tsx');
const propostaDocente=app('app/criar/FormularioPropostaDocente.tsx');
assert(criar.includes('FormularioPropostaDocente') && docente.includes('AdminPropostasDocentesDev'),
 'R38: preservar formulário remoto docente e a caixa de propostas');
// R40: adição única de foto ao formulário R35 já aprovado, mantendo as seis etapas.
assert.equal(blobSha(root('apps/web/src/app/criar/FormularioPropostaDocente.tsx')),
  '1733afe99f5cbbe3c12f3cd4da47ce9d9d6d2385',
  'R40: campo de foto na primeira ficha docente deve permanecer sem mudanças não aprovadas');
assert.equal(blobSha(root('apps/web/src/app/criar/criar.css')),
  '435d9ae494714e7bbc92ac2c1fb025b8ad6f3981',
  'R40: CSS original mais prévia de foto precisa permanecer sem mudanças não aprovadas');
assert(propostaDocente.includes('Etapa {etapa+1} de 6') &&
       propostaDocente.includes("educart_propostas_solucoes_docentes_dev") &&
       propostaDocente.includes('origem:\'educart_formulario_docente_r35\''),
 'R40: manter seis etapas, recepção DEV e revisão antes do envio');
assert(propostaDocente.includes('accept="image/jpeg,image/png,image/webp"') &&
       propostaDocente.includes('LIMITE_FOTO=8*1024*1024') &&
       propostaDocente.includes('Math.min(w,h)<1000') &&
       propostaDocente.includes("supabase.storage.from(BUCKET_FOTOS)") &&
       propostaDocente.includes('proposta.foto_professor_storage_path=path') &&
       propostaDocente.includes('fotoPreview'),
 'R40: imagem precisa ser validada em alta resolução, enviada ao bucket privado e associada à proposta');
const adminPropostasDocentes=app('components/AdminPropostasDocentesDev.tsx');
assert(adminPropostasDocentes.includes("createSignedUrl(path,120)") &&
       adminPropostasDocentes.includes('foto_professor_storage_path'),
 'R40: visualização da foto somente com autorização temporária pela Coordenação');

assert(admin.includes('aria-label="Abrir WhatsApp do candidato com mensagem de primeiro contato"'));
assert(admin.includes('<div className="admin-container">'));
assert(!admin.includes('<main className="admin-container">'));
console.log('OK: consolidacao interna funcional; heranca publica, portaria e publicadores protegidos.');
