// TC23: salvaguarda do formulário oficial, sem POST, credenciais nem Supabase.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {destinoPublicoInscricaoSeguro,URL_PROD_INSCRICOES} from '../src/lib/security/destino-inscricao-publica.ts';
const DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
for(const host of ['educart.pro','www.educart.pro','EDUCART.PRO','educart.pro.']){
 assert.equal(destinoPublicoInscricaoSeguro(host,DEV),false,host+' deve bloquear DEV');
 assert.equal(destinoPublicoInscricaoSeguro(host,'https://attacker.example'),false);
 assert.equal(destinoPublicoInscricaoSeguro(host,undefined),false);
 assert.equal(destinoPublicoInscricaoSeguro(host,URL_PROD_INSCRICOES),true);
}
for(const host of ['localhost','127.0.0.1','educart-11-candidate.educartsuporte.workers.dev']){
 assert.equal(destinoPublicoInscricaoSeguro(host,DEV),true,'Laboratorio DEV deve seguir isolado: '+host);
}
assert.equal(destinoPublicoInscricaoSeguro('educart.pro.evil.example',DEV),true,'Host inventado nao é oficial');
const proxy=readFileSync('src/proxy.ts','utf8');
assert(proxy.includes("NextResponse.rewrite(new URL('/inscricao-indisponivel', request.url))"));
assert(proxy.includes("process.env.EDUCART_OFFICIAL_11_MODE === 'required'"));
assert(proxy.includes('configuracaoSupabaseOficial11Valida('));
assert(proxy.includes("response.headers.set('Cache-Control','private, no-store, max-age=0')"));
const form=readFileSync('src/components/InscricaoForm.tsx','utf8');
assert(form.includes('destinoPublicoInscricaoSeguro('));
assert(form.indexOf('if (!destinoPublicoInscricaoSeguro(')<form.indexOf("const supabase = createClient()"),'Bloqueio antes do envio');
const page=readFileSync('src/app/inscricao-indisponivel/page.tsx','utf8');
assert(page.includes('robots:{index:false,follow:false}'));
assert(!/createClient|buildInscricaoPayload|\\.insert\\(/.test(page),'Aviso sem coleta');
console.log('TC23 PASS: hosts oficiais DEV bloqueados, PROD permitido, DEV isolado e aviso sem coleta.');
