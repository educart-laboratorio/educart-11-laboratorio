/**
 * R13-B0: AUTENTICAÇÃO REAL SEM VÍNCULO (2 usuários sintéticos Auth Admin).
 * Não cria contas, matrículas, bolsas, cobranças, outbox ou emails.
 * Apenas leitura com RLS; execute manualmente no Codespaces PRIVATE.
 * PASS significa isolamento de identidades SEM vínculo, não homologação R13-B.
 */
import {createClient} from '@supabase/supabase-js';

const URL_DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const guard=(c,msg)=>{if(!c)throw Error('R13-B0 BLOQUEADO: '+msg);};
const obrigatoria=(nome)=>{
  const v=process.env[nome]?.trim();
  guard(Boolean(v),'variável privada '+nome+' ausente');
  return v;
};

async function entrar(letra){
  const email=obrigatoria('R13_ESTUDANTE_'+letra+'_EMAIL').toLowerCase();
  const password=obrigatoria('R13_ESTUDANTE_'+letra+'_SENHA');
  guard(email==='r13-estudante-'+letra.toLowerCase()+'@example.invalid',
    'identidade sintética inesperada '+letra);
  const client=createClient(URL_DEV,obrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY'),{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
  });
  const {data,error}=await client.auth.signInWithPassword({email,password});
  guard(!error&&data?.user?.id&&!data.user.is_anonymous,'não autenticou conta '+letra);
  const {data:verify,error:err}=await client.auth.getUser();
  guard(!err&&verify?.user?.id===data.user.id
    &&verify.user.email?.toLowerCase()===email,'getUser não confirmou identidade '+letra);
  return {client,uid:data.user.id};
}

async function nenhumPrivado(sessao,letra){
  // Tabelas DEV que possuem SELECT autenticado + RLS. Nenhum ID, email ou dado é impresso.
  const tabelas=[
    ['pessoas','id'],['matriculas','id'],['turmas','id'],
    ['educart_aulas_dev','id'],['educart_chamadas_dev','id'],
    ['educart_planos_financeiros_r11_dev','matricula_id'],
    ['educart_parcelas_financeiras_r11_dev','id'],
    ['educart_fotos_consentimento_dev','pessoa_id'],
    ['mensalidades_formacao','id'],
  ];
  for(const [tabela,coluna] of tabelas){
    const {data,error}=await sessao.client.from(tabela).select(coluna).limit(1);
    guard(!error&&Array.isArray(data),'falha ao conferir RLS de '+tabela+' para '+letra);
    guard(data.length===0,'conta sem vínculo '+letra+' acessou dados privados em '+tabela);
  }
  return tabelas.length;
}

async function main(){
  guard(process.env.CODESPACES==='true','Codespaces PRIVATE obrigatório');
  guard(obrigatoria('NEXT_PUBLIC_SUPABASE_URL')===URL_DEV,'projeto diferente do DEV autorizado');
  guard(process.env.R13_PERMITIR_TESTE_AUTENTICADO==='sim','flag R13 não autorizada');
  let a,b;
  try{
    a=await entrar('A');
    b=await entrar('B');
    guard(a.uid!==b.uid,'contas A e B iguais');
    const nA=await nenhumPrivado(a,'A');
    const nB=await nenhumPrivado(b,'B');
    console.log('R13-B0 AUTH PASS: 2 sessões oficiais distintas; RLS sem vínculo '+nA+'+'+nB+' consultas sem dados privados.');
    console.log('LIMITE: acesso positivo de matrícula/bolsa/financeiro/foto NÃO TESTADO; R13-B segue pendente.');
  }finally{
    if(a)await a.client.auth.signOut().catch(()=>{});
    if(b)await b.client.auth.signOut().catch(()=>{});
  }
}
main().catch(e=>{
  console.error(e instanceof Error?e.message:'R13-B0 não concluído');
  process.exitCode=1;
});
