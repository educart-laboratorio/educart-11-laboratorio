import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=readFileSync('src/app/minha-educart/recuperar/page.tsx','utf8');
const l=readFileSync('src/app/minha-educart/login/page.tsx','utf8');
for(const text of ['resetPasswordForEmail','redirectTo:window.location.origin+\'/minha-educart/recuperar\'',
 'PASSWORD_RECOVERY','supabase.auth.updateUser({password:nova})','supabase.auth.getUser()',
 'nova.length<12','senha atualizada','Se houver uma conta associada','createClient'])
 assert(p.toLowerCase().includes(text.toLowerCase()),'Recuperação incompleta: '+text);
assert(l.includes('href="/minha-educart/recuperar"'),'Login deve mostrar link de recuperação');
assert(!/service_role|sb_secret_|window.location.href|localStorage\.setItem/.test(p));
assert(!/\.rpc\(|educart_ativar_convite_dev|\.from\('matriculas'\)/.test(p),
  'Recuperação não pode efetivar matrícula ou convite');
console.log('Q8 PASS: recuperação por e-mail, confirmação Auth, sem vazamento de matrícula ou credenciais.');
