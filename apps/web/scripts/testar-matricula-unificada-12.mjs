import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const f=(path)=>readFileSync(path,'utf8');
const sql=f('../../supabase/security-review/EDUCART_12_DEV_MATRICULA_UNIFICADA_CONVITES_20261105.sql');
const admin=f('src/app/admin/page.tsx');
const adm=f('src/components/AdminMatriculaUnificadaDev.tsx');
const login=f('src/app/minha-educart/login/page.tsx');
const portal=f('src/app/minha-educart/page.tsx');
const ativar=f('src/app/minha-educart/ativar/page.tsx');
const academia=f('src/components/AdminRotinaAcademicaLab.tsx');
for(const name of ['educart_ingressos_dev','educart_convites_dev','educart_emails_outbox_dev']){
  assert.match(sql,new RegExp('CREATE TABLE public\\.'+name),'Tabela institucional '+name);
}
for(const pattern of [
 /ALTER TABLE public\.educart_ingressos_dev ENABLE ROW LEVEL SECURITY/,
 /ALTER TABLE public\.educart_convites_dev ENABLE ROW LEVEL SECURITY/,
 /ALTER TABLE public\.educart_emails_outbox_dev ENABLE ROW LEVEL SECURITY/,
 /educart-comprovantes-pix-dev/,
 /private|false,5242880/i,
 /modalidade='pix'/,
 /modalidade='bolsa'/,
 /p_modalidade='bolsa' AND NOT v_coord/,
 /p_comprovante_path !~/,
 /FROM storage\.objects o/,
 /p_confirmei_documentacao IS DISTINCT FROM true/,
 /from public\.equipe_papeis e/i,
 /e\.papel IN \('secretaria','coordenacao'\)/,
 /v_t\.capacidade/,
 /FOR UPDATE/,
 /pg_advisory_xact_lock/,
 /Pessoa possivelmente existente/,
 /UPDATE public\.matriculas SET situacao='ativa'/,
 /UPDATE public\.inscricoes_oficina SET status='matriculado'/,
 /INSERT INTO public\.educart_ingressos_dev/,
 /INSERT INTO public\.educart_convites_dev/,
 /INSERT INTO public\.educart_emails_outbox_dev/,
 /'aguarda_integracao'/,
 /educart_interno_dev\.efetivar_matricula_unificada/,
 /SECURITY DEFINER/,
 /SECURITY INVOKER/,
 /email_confirmed_at/,
 /v_conv\.expira_em<=now\(\)/,
 /p\.auth_user_id/,
 /NOT EXISTS\(SELECT 1 FROM public\.matriculas/,
 /REVOKE ALL ON public\.educart_ingressos_dev/,
]) assert.match(sql,pattern,'Contrato SQL: '+pattern);
assert.doesNotMatch(sql,/http_post|net\.http|resend\.com|service_role|database-prod/,'Sem envio externo/bypass de produção');
assert.match(admin, /<AdminMatriculaUnificadaDev/);
assert.match(admin, /const registrarMatriculaConfirmada = useCallback/);
assert.match(admin, /aoMatricular=\{registrarMatriculaConfirmada\}/);
assert.doesNotMatch(admin, /aoMatricular=\{loadDashboardData\}/);
assert.doesNotMatch(admin, /<AdminImportacaoLegadoDev|<AdminVinculosDev/);
assert.match(academia, /<AdminPlanejamentoFormacaoTurmaDev/);
assert.doesNotMatch(academia, /<AdminTurmasDev/);
for(const pattern of [
 /storage\.from\(BUCKET\)\.upload/,
 /crypto\.randomUUID\(\)/,
 /comprovantePath/,
 /educart_efetivar_matricula_unificada_dev/,
 /p_confirmei_documentacao:true/,
 /p_pessoa_existente_id/,
 /podeAutorizarBolsa/,
 /obterPapeisGestao/,
 /Enviar acesso pelo WhatsApp/,
 /Copiar link Minha EducART/,
 /aguardando integração do serviço de envio/,
]) assert.match(adm,pattern,'Contrato ficha: '+pattern);
assert.doesNotMatch(adm,/\.from\('matriculas'\)\.insert/,'UI não deve criar matrículas diretamente');
assert.doesNotMatch(adm,/\.from\('pessoas'\)\.insert/,'UI não deve criar pessoas diretamente');
assert.match(adm, /aoMatricular\(inscricao\.id\)/, 'Depois da RPC, a ficha notifica o pai sem sair da tela');
assert.match(login,/voltarAoConvite/);
assert.match(login,/emailRedirectTo:window\.location\.origin\+voltarAoConvite\(convite\)/);
assert.match(ativar,/educart_ativar_convite_dev/);
assert.match(portal,/Ative seu convite de matrícula/);
assert.doesNotMatch(portal,/onSubmit=\{solicitarVinculo\}/);
console.log('OK: matrícula unificada 1.2 isolada, sem incorporação/solicitação manual, Pix privado, bolsa auditada, convite e outbox DEV.');
