/**
 * EducART 1.1: teste HTTP somente leitura contra Supabase DEV.
 * Sem JWT, sessao, dados reais, inserts, migrations ou servicos em PROD.
 * Reusa a chave publishable PUBLICA configurada no workflow de deploy isolado.
 * Nao confundir com E2E autenticado, revisionamento de RLS ou homologacao.
 */
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const workflow=readFileSync('../../.github/workflows/publicar-educart-11-candidate-cloudflare.yml','utf8');
assert(workflow.includes('educart-11-candidate'),'Publicador nao esta limitado ao candidato');
assert(workflow.includes('https://esjrjzyvyhtzwgihcbsc.supabase.co'),'Publicador nao usa Supabase DEV');
const m=workflow.match(/^\s+NEXT_PUBLIC_SUPABASE_ANON_KEY:\s*(sb_publishable_[A-Za-z0-9_-]+)\s*$/m);
assert(m,'Chave publicavel DEV nao identificada no publicador');
const key=m[1];
const origin='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const privadas=[
  'pessoas','matriculas','portal_admins','equipe_papeis',
  'mensalidades_formacao','educart_chamadas_dev','educart_docentes_dev'
];
for(const tabela of privadas){
  const url=origin+'/rest/v1/'+encodeURIComponent(tabela)+'?select=*&limit=0';
  const response=await fetch(url,{headers:{apikey:key,Accept:'application/json'},signal:AbortSignal.timeout(16000)});
  console.log('Anon DEV '+tabela+': HTTP '+response.status);
  assert([401,403].includes(response.status),
    'Acesso anonimo inesperado à tabela '+tabela+': HTTP '+response.status);
  await response.body?.cancel();
}
// Esta RPC e intencionalmente publica SOMENTE com UUID de link consentido.
// Um UUID arbitrario jamais deve devolver perfil docente.
const token='00000000-0000-4000-8000-000000000001';
const rpc=await fetch(origin+'/rest/v1/rpc/educart_ler_perfil_docente_compartilhado_dev?p_token='+encodeURIComponent(token),{
  method:'GET',
  headers:{apikey:key,Accept:'application/json'},
  signal:AbortSignal.timeout(16000),
});
const body=await rpc.text();
console.log('RPC docente anonimizada com token inexistente: HTTP '+rpc.status+', retorno vazio='+(body.trim()==='[]'));
assert.equal(rpc.status,200,'RPC anonima de docente deve responder sem autorizar tabela');
assert.equal(body.trim(),'[]','Token de perfil inexistente nao pode revelar dados');
console.log('OK: verificacao anonima read-only no banco DEV; sem registrar dados pessoais.');
