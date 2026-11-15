import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const s=readFileSync('scripts/provisionar-r13-auth-dev.mjs','utf8');
for(const x of ["CODESPACES==='true'","R13_PERMITIR_PROVISIONAMENTO_AUTH==='sim'",
 'esjrjzyvyhtzwgihcbsc.supabase.co','R13_SUPABASE_AUTH_ADMIN_KEY',
 'r13-estudante-','@example.invalid','auth.admin.listUsers',
 'auth.admin.createUser','email_confirm:true','auth.admin.deleteUser',
 "'git',['branch','--show-current']"])
 assert(s.includes(x),'Guard ausente: '+x);
assert(!/INSERT\s+INTO\s+auth\.users|inviteUserByEmail|\.signUp\(/i.test(s));
assert(!/console\.(log|error)\([^;\n]*(?:password|senha|chave|token)/i.test(s));
const r=spawnSync(process.execPath,['scripts/provisionar-r13-auth-dev.mjs'],{
  encoding:'utf8',env:{PATH:process.env.PATH,CODESPACES:'false'},timeout:10000
});
assert.notEqual(r.status,0,'Sem flags deve recusar criação de usuários');
assert.match(r.stderr,/R13-AUTH ABORTADO/);
console.log('R13-F PASS: provisionador oficial guardado, não executado em CI.');
