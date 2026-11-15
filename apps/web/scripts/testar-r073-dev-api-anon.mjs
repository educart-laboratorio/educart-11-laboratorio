/**
 * R07.3 — teste HTTP real da Data API Supabase DEV como anonimo.
 * Sem JWT do usuario, sem credenciais sensiveis, sem inserts/updates/deletes.
 * A ausencia de dados só é aceita se a resposta vier da API DEV legítima.
 */
import assert from 'node:assert/strict';
const root='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const key=process.env.EDUCART_DEV_SUPABASE_PUBLISHABLE_KEY;
assert(key && key.startsWith('sb_publishable_'),
  'R07.3 precisa da variavel de Actions EDUCART_DEV_SUPABASE_PUBLISHABLE_KEY do Supabase DEV. Nao informe a chave nos logs.');
const tabelas=[
  'portal_admins',
  'equipe_papeis',
  'inscricoes_oficina',
  'mensalidades_formacao',
  'pessoas',
  'matriculas',
];
const fetchComTimeout=async url=>{
  const res=await fetch(url,{
    method:'GET',headers:{apikey:key,Accept:'application/json'},
    redirect:'manual',signal:AbortSignal.timeout(14000),
  });
  const data=await res.json().catch(()=>null);
  assert(!res.headers.get('location'),'Redirecionamento inesperado para endpoint fora do DEV');
  if(res.status===200){
    assert(Array.isArray(data),'Sucesso inesperado sem array JSON do PostgREST');
    assert.equal(data.length,0,'FUGA DE DADOS ANONIMOS: ' + url.pathname);
    return '200 []';
  }
  // Negativa explícita por GRANT/RLS também é uma proteção válida,
  // mas falha por chave inválida, erro de rede e 500 não contam como sucesso.
  if(res.status===401||res.status===403){
    const code=String(data?.code||'');
    const message=String(data?.message||'').toLowerCase();
    assert(code==='42501'||message.includes('permission denied')||message.includes('not authorized'),
      'HTTP '+res.status+' não comprova RLS/GRANT; possível erro de API key/configuração.');
    return String(res.status)+' (acesso negado)';
  }
  throw Error('HTTP inesperado: '+res.status+'; RLS nao comprovada.');
};
for(const tabela of tabelas){
  const url=new URL('/rest/v1/'+tabela,root);
  url.searchParams.set('select','*');
  url.searchParams.set('limit','1');
  const resultado=await fetchComTimeout(url);
  console.log('R07.3 DEV ANON',tabela,resultado);
}
console.log('R07.3 OK: API DEV verificada remotamente; nenhuma linha privada exposta a visitante anonimo.');
console.log('R07.3 NAO e teste de logins reais da equipe. Nenhuma escrita executada.');
