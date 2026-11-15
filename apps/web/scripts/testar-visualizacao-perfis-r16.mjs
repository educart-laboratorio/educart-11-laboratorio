/** R16: perfis docentes consentidos, janelas internas e posição inequívoca. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classificarRequisicaoPrivada, HOST_PREVIA_PRIVADA} from '../src/lib/security/preview-native-policy.ts';
const read=p=>readFileSync(p,'utf8');
const teacher=read('src/components/AdminDocentesDev.tsx');
const student=read('src/components/AdminEstudantesDev.tsx');
const modal=read('src/components/AdminRegistroModalDev.tsx');
const publicView=read('src/components/PerfilPublicoDocente.tsx');
const route=read('src/app/docentes/perfil/[token]/page.tsx');
const policy=read('src/lib/security/preview-native-policy.ts');
const sql=read('../../supabase/security-review/EDUCART_11_DEV_LINKS_DOCENTES_CONSENTIDOS_R16_20261107.sql');
const admin=read('src/app/admin/page.tsx');
const acad=read('src/components/AdminRotinaAcademicaLab.tsx');

assert(acad.indexOf('admin-academico-quick-access')<acad.indexOf('admin-kpi-grid'),
 'Acesso rápido deve estar no topo, antes dos indicadores');
assert(admin.includes('admin-secretaria-footer'));
assert(admin.indexOf('admin-secretaria-footer')>admin.indexOf('admin-table-container'),
 'As duas ferramentas devem ficar abaixo de toda a lista de inscrições');
for(const title of ['Retornos de atendimento','Conferir integridade das matrículas'])
 assert(admin.indexOf(title)>admin.indexOf('admin-secretaria-footer'),'Ferramenta fora do rodapé: '+title);
assert(modal.includes('<dialog')&&modal.includes('showModal()')&&modal.includes('aria-modal="true"'),
 'Edição deve ser modal nativa, não formulário perdido na página');
assert(teacher.includes('<AdminRegistroModalDev'));
// Regressão: cadastro docente novo fica pendente; somente Coordenação ativa depois.
assert(teacher.includes("setSituacaoEdicao('pendente_validacao')"));
assert(teacher.includes("situacao:editarId?situacaoEdicao:'pendente_validacao'"),
 'Novo docente não pode nascer ativo sem validação');
assert(teacher.includes("criado_por:user.id,situacao:'pendente_validacao'"),
 'INSERT não pode sobrescrever a pendência com ativo');
assert(!teacher.includes("criado_por:user.id,situacao:'ativo'"),
 'Reativação automática indevida no INSERT');

assert(student.includes('<AdminRegistroModalDev'));
// WhatsApp no cadastro: limite real do banco DEV é 30 caracteres.
assert(teacher.includes("c.chave==='whatsapp'?'tel':'text'"),
 'WhatsApp deve usar controle de telefone');
assert(teacher.includes("c.chave==='whatsapp'?30:150"),
 'Campo WhatsApp não pode aceitar mais caracteres do que o banco permite');
assert(teacher.includes('👁 Ver perfil')&&student.includes('👁 Ver perfil'),
 'Docente e aluno precisam de olhinho');
for(const key of ['vinculos','atuais','anteriores','turmas','formacoes'])
 assert(teacher.includes(key),'Histórico docente incompleto '+key);
for(const key of ['vinculosPessoa','atuais','anteriores','matriculas','turmas'])
 assert(student.includes(key),'Histórico discente incompleto '+key);
for(const key of ['apresentacao_publica','autorizou_divulgacao','educart_publicar_perfil_docente_dev',
                     'educart_revogar_perfil_docente_dev','navigator.clipboard.writeText'])
 assert(teacher.includes(key),'Compartilhamento incompleto '+key);
assert(teacher.includes('<PerfilPublicoDocente')&&publicView.includes('educart-perfil-publico')===false);
assert(route.includes("educart_ler_perfil_docente_compartilhado_dev"));
assert(route.includes("robots:{index:false,follow:false,noarchive:true}"));
const routeExecutavel=route.replace(/\/\/[^\n]*/g,'');
assert(!/service_role|\.telefone|\.whatsapp|\.email/i.test(routeExecutavel),
 'Página compartilhável não pode usar chave privada nem ler contatos.');
assert(sql.includes('ALTER TABLE public.educart_docentes_dev')&&sql.includes('ENABLE ROW LEVEL SECURITY'));
assert(sql.includes('REVOKE ALL ON TABLE public.educart_docente_links_dev FROM PUBLIC, anon, authenticated'));
assert(sql.includes('GRANT EXECUTE ON FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(uuid) TO anon,authenticated'));
const publicFunction=sql.split('CREATE OR REPLACE FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(p_token uuid)')[1].split('REVOKE ALL ON FUNCTION')[0];
for(const privateKey of ['d.email','d.whatsapp','d.disponibilidade','d.minibiografia','d.experiencia_profissional'])
 assert(!publicFunction.includes(privateKey),'Informação privada exposta: '+privateKey);
const host='educart-r16-3000.app.github.dev';
const context={codespaces:'true',nome:'educart-r16',dominio:'app.github.dev',hostRecebido:host};
const token='01234567-89ab-4cde-8f01-234567890abc';
assert.equal(classificarRequisicaoPrivada(host,'/docentes/perfil/'+token,'codespaces-private','development',context),'publico');
for(const path of ['/docentes/perfil/foo','/docentes/perfil/'+token+'/editar','/admin','/api/docentes','/docentes/perfil/'+token+'/lista'])
 assert.notEqual(classificarRequisicaoPrivada(host,path,'codespaces-private','development',context),'publico',
  'Rota protegida foi liberada: '+path);
assert.notEqual(classificarRequisicaoPrivada(HOST_PREVIA_PRIVADA,'/docentes/perfil/'+token,'required','production',{}),'publico',
 'O Worker não pode abrir perfil sem autorização explícita');
assert.equal(classificarRequisicaoPrivada(HOST_PREVIA_PRIVADA,'/docentes/perfil/'+token,'required','production',{perfilPublicoHabilitado:true}),'publico');
assert(policy.includes('contexto.perfilPublicoHabilitado===true'));
console.log('R16 PASS: layout, diálogos, históricos, público mínimo e portaria com flag explícita.');
