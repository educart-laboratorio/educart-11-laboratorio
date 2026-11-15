import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync('../../supabase/security-review/EDUCART_11_R13_DEV_NEGATIVO_DUAS_IDENTIDADES_ROLLBACK_20261106.sql','utf8');
const script=readFileSync('scripts/homologar-r13-dois-estudantes.mjs','utf8');
const rls=readFileSync('../../supabase/security-review/EDUCART_11_R13_DEV_TURMAS_PRIVADAS_RLS_20261106.sql','utf8');
const negativo=readFileSync('../../supabase/security-review/EDUCART_11_R13_DEV_TURMAS_PRIVADAS_NEGATIVO_20261106.sql','utf8');
assert.match(sql,/BEGIN READ ONLY;/);
assert.match(sql,/SET LOCAL ROLE authenticated/);
assert.match(sql,/educart\.r13\.a/);
assert.match(sql,/educart\.r13\.b/);
assert.match(sql,/ROLLBACK;/);
assert.match(rls,/DROP POLICY turmas_ler_autenticados ON public\.turmas/);
assert.match(rls,/CREATE POLICY educart_turmas_equipe_titular_r13_dev/);
assert.match(rls,/ep\.papel IN \('secretaria','coordenacao'\)/);
assert.match(rls,/m\.turma_id=turmas\.id/);
assert.match(rls,/p\.auth_user_id=\(SELECT auth\.uid\(\)\)/);
assert.doesNotMatch(rls,/ON public\.turmas FOR SELECT TO authenticated\s+USING\s*\(true\)/i);
assert.match(negativo,/BEGIN READ ONLY;/);
assert.match(negativo,/SET LOCAL ROLE authenticated/);
assert.match(negativo,/ROLLBACK;/);
for(const tabela of ['pessoas','matriculas','educart_aulas_dev','educart_chamadas_dev',
 'educart_parcelas_financeiras_r11_dev','educart_fotos_consentimento_dev','storage.objects']){
 assert(sql.includes(tabela),'R13-A esqueceu '+tabela);
}
for(const texto of ['URL_DEV','@example.invalid',"process.env.CODESPACES==='true'",
 'R13_PERMITIR_TESTE_AUTENTICADO','signInWithPassword','auth.getUser()',
 "'pessoas'","'matriculas'","'educart_aulas_dev'","'educart_chamadas_dev'",
 "'educart_parcelas_financeiras_r11_dev'","'educart_fotos_consentimento_dev'",
 'mensalidades_formacao','createSignedUrl','negarCruzamento','auth.signOut()']){
 assert(script.includes(texto),'R13-B sem guarda: '+texto);
}
const executavel=script.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
assert(script.includes("['turmas','id',outro.turmaId]"),'R13-B não consulta turma alheia');
assert(script.includes("['educart_planos_financeiros_r11_dev','matricula_id',outro.matriculaId]"),'R13-B não consulta plano alheio');
assert(script.includes("planos[0].situacao==='ativo'"),'R13-B deve confirmar leitura positiva do próprio plano ativo');
assert(!/auth\.admin|\.signUp\(|createUser\(|service_role|resetPasswordForEmail|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.remove\(|\.upload\(/.test(executavel),
 'R13-B não pode criar usuários, enviar e-mails nem escrever registros');
assert(!/console\.(log|error)\([^)]*(password|token|email|signedUrl)/.test(executavel),
 'Não incluir dados sensíveis nos logs');
console.log('R13 contrato PASS: SQL somente leitura, duas identidades sintéticas, e teste Auth privado sem escrita.');
