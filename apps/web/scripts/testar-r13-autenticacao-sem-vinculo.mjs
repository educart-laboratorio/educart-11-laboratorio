import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const s=readFileSync('scripts/homologar-r13-duas-sessoes-sem-vinculo.mjs','utf8');
for(const x of ['CODESPACES', 'R13_PERMITIR_TESTE_AUTENTICADO',
  'esjrjzyvyhtzwgihcbsc.supabase.co',
  'r13-estudante-', '@example.invalid',
  'signInWithPassword', 'auth.getUser()', 'auth.signOut()',
  "'pessoas'","'matriculas'","'turmas'","'educart_aulas_dev'",
  "'educart_chamadas_dev'","'educart_planos_financeiros_r11_dev'",
  "'educart_parcelas_financeiras_r11_dev'",
  "'educart_fotos_consentimento_dev'", "'mensalidades_formacao'",
  'R13-B segue pendente'])assert(s.includes(x),'R13-B0 requisito ausente '+x);
const semComentarios=s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,'');
assert(!/auth\.admin|createUser|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.remove\(|\.upload\(|signUp\(|resetPasswordForEmail|inviteUserByEmail/.test(semComentarios),
 'O teste sem vínculo deve ser somente leitura e signOut');
const r=spawnSync(process.execPath,['scripts/homologar-r13-duas-sessoes-sem-vinculo.mjs'],{
 encoding:'utf8',env:{PATH:process.env.PATH,CODESPACES:'false'},timeout:10000
});
assert.notEqual(r.status,0);
assert.match(r.stderr,/R13-B0 BLOQUEADO/);
console.log('R13-B0 CONTRACT PASS: negação sem flags e nenhuma operação de escrita.');
