/**
 * R13 Auth Admin: SOMENTE DEV EducART, executado manualmente em Codespaces PRIVATE.
 * Exige segredos de ambiente privado. Não envia convite nem grava SQL em auth.users.
 */
import {execFileSync} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
const URL='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const BRANCH='autodev-educart-11-consolidacao-interna-2026-11-05';
function exigir(ok,msg){if(!ok)throw Error('R13-AUTH ABORTADO: '+msg);}
function ler(n){const x=process.env[n]?.trim();exigir(Boolean(x),'variável privada ausente: '+n);return x;}
function conta(letra){
  const email=ler('R13_ESTUDANTE_'+letra+'_EMAIL').toLowerCase();
  const password=ler('R13_ESTUDANTE_'+letra+'_SENHA');
  exigir(email==='r13-estudante-'+letra.toLowerCase()+'@example.invalid','email fictício incorreto');
  exigir(password.length>=20&&password.length<=128,'senha fora do comprimento mínimo');
  return {email,password};
}
async function executar(){
  exigir(process.env.CODESPACES==='true','Codespaces PRIVATE obrigatório');
  exigir(process.env.R13_PERMITIR_PROVISIONAMENTO_AUTH==='sim','flag de autorização ausente');
  exigir(ler('NEXT_PUBLIC_SUPABASE_URL')===URL,'projeto não é o DEV autorizado');
  let atual='';
  try{atual=execFileSync('git',['branch','--show-current'],{encoding:'utf8',timeout:5000}).trim();}
  catch{throw Error('R13-AUTH ABORTADO: branch não verificável');}
  exigir(atual===BRANCH,'branch divergente');
  const a=conta('A'),b=conta('B');
  exigir(a.password!==b.password,'senhas A e B devem ser diferentes');
  const admin=createClient(URL,ler('R13_SUPABASE_AUTH_ADMIN_KEY'),{
    auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
  });
  let terminou=false;
  for(let pagina=1;pagina<=20;pagina++){
    const {data,error}=await admin.auth.admin.listUsers({page:pagina,perPage:100});
    exigir(!error&&Array.isArray(data?.users),'consulta ao Auth Admin indisponível');
    exigir(!data.users.some(u=>[a.email,b.email].includes(u.email?.toLowerCase())),
      'conta R13 já existe; não sobrescrever');
    if(data.users.length<100){terminou=true;break;}
  }
  exigir(terminou,'mais de 2000 contas: revisão manual obrigatória');
  const criados=[];
  try{
    for(const pessoa of [a,b]){
      const {data,error}=await admin.auth.admin.createUser({
        email:pessoa.email,password:pessoa.password,email_confirm:true
      });
      exigir(!error&&Boolean(data?.user?.id),'falha no Auth Admin createUser');
      criados.push(data.user.id);
    }
    console.log('R13-AUTH PASS: duas contas fictícias oficiais, sem envio de convites.');
    console.log('IDs no terminal PRIVATE: A='+criados[0]+' B='+criados[1]);
  }catch(err){
    let erroLimpeza=false;
    for(const id of criados.reverse()){
      const {error}=await admin.auth.admin.deleteUser(id);
      if(error)erroLimpeza=true;
    }
    if(erroLimpeza)throw Error('R13-AUTH: confira contas órfãs no painel Auth Admin');
    throw err;
  }
}
executar().catch(err=>{
  console.error(err instanceof Error?err.message:'Provisionamento Auth não concluído');
  process.exitCode=1;
});
