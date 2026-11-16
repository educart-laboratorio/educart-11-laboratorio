/**
 * EducART R41 — regras puras e integridade das interfaces oficiais.
 * Teste sem rede nem escrita em Supabase; HTTP exige deploy isolado posterior.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  HOST_PREVIA_CANDIDATA, HOST_PREVIA_PRIVADA,
  classificarRequisicaoPrivada,
} from '../src/lib/security/preview-native-policy.ts';

const classificar=(hostname,pathname,modo='required',metodoHttp='GET',hostRecebido=hostname)=>
  classificarRequisicaoPrivada(hostname,pathname,modo,'production',{metodoHttp,hostRecebido});

for(const rota of ['/inscricao','/cadastro','/criar','/inscricao/',
                    '/cadastro/','/criar/','/inscricao-previa','/inscricao-previa/']){
  assert.equal(classificar(HOST_PREVIA_CANDIDATA,rota),'publico',rota+' GET candidata');
  assert.equal(classificar(HOST_PREVIA_CANDIDATA,rota,'required','HEAD'),'publico');
  for(const metodo of ['POST','PATCH','PUT','DELETE','OPTIONS'])
    assert.equal(classificar(HOST_PREVIA_CANDIDATA,rota,'required',metodo),'avaliar');
  assert.equal(classificar(HOST_PREVIA_CANDIDATA,rota,'off'),'negado');
  assert.equal(classificar(HOST_PREVIA_CANDIDATA,rota,'required','GET','host-spoof.example'),'avaliar');
  assert.equal(classificar(HOST_PREVIA_PRIVADA,rota),'avaliar');
}
assert.equal(classificar(HOST_PREVIA_CANDIDATA,'/admin'),'avaliar');
assert.equal(classificar(HOST_PREVIA_CANDIDATA,'/admin/login'),'publico');
const proxy=readFileSync('src/proxy.ts','utf8');
const aviso=readFileSync('src/app/inscricao-previa/page.tsx','utf8');
const inscricao=readFileSync('src/app/inscricao/page.tsx','utf8');
const cadastro=readFileSync('src/app/cadastro/page.tsx','utf8');
const criar=readFileSync('src/app/criar/page.tsx','utf8');
assert.match(proxy,/hostPublico === HOST_PREVIA_CANDIDATA/);
assert.match(proxy,/request\.nextUrl\.hostname\.toLowerCase\(\) === HOST_PREVIA_CANDIDATA/);
assert.match(proxy,/process\.env\.EDUCART_PRIVATE_PREVIEW_MODE === 'required'/);
assert.match(proxy,/\(request\.method === 'GET' \|\| request\.method === 'HEAD'\)/);
assert.match(proxy,/inscricao\|cadastro\|criar/);
assert.match(proxy,/NextResponse\.rewrite\(new URL\('\/inscricao-previa', request\.url\)\)/);
assert.doesNotMatch(aviso,/<(?:form|input|textarea|select)(?:\s|>)/i);
assert.doesNotMatch(aviso,/(?:createClient\s*\(|\.insert\s*\(|\.upload\s*\(|fetch\s*\()/);
assert.match(aviso,/estão desativados nesta prévia/);
assert.match(aviso,/https:\/\/wa\.me\/5571996824505/);
assert.doesNotMatch(aviso,/href="https:\/\/www\.educart\.pro\/"/);
assert.match(inscricao,/<InscricaoElegibilidade\s*\/>/);
assert.match(cadastro,/export \{ default, metadata \} from '\.\.\/inscricao\/page'/);
assert.match(criar,/<FormularioPropostaDocente\s*\/>/);
console.log('R41 PASS: candidato mostra aviso sem coleta, oficiais intactos, bloqueios preservados.');
