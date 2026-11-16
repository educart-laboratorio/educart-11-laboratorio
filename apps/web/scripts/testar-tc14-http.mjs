// TC-14: checagem efetiva dos cabecalhos HTTP servidos pelo Vinext local.
import assert from 'node:assert/strict';
const base=process.env.TC14_BASE_URL||'http://127.0.0.1:3001';
for(const route of ['/','/formacao','/inscricao','/admin/login']){
 const res=await fetch(base+route,{headers:{accept:'text/html'},signal:AbortSignal.timeout(16000)});
 assert.equal(res.status,200,route+' status');
 assert.equal(res.headers.get('x-content-type-options'),'nosniff',route+' nosniff');
 assert.equal(res.headers.get('x-frame-options'),'DENY',route+' frame');
 assert.equal(res.headers.get('referrer-policy'),'strict-origin-when-cross-origin',route+' referer');
 assert.match(res.headers.get('content-security-policy')||'',/frame-ancestors 'none'/,route+' CSP');
 assert.match(res.headers.get('cache-control')||'',/private/,route+' cache');
 assert.equal(res.headers.get('strict-transport-security'),null,'HSTS em loopback '+route);
 console.log('TC14 HTTP '+route+' 200, defesa ativa, cache privado; sem HSTS local');
}
console.log('TC14 HTTP PASS. Nao substitui verificacao do Worker publicado.');
