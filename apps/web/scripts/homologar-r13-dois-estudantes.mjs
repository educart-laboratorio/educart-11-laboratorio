/**
 * R13-B | Gate de autenticação REAL (Supabase Auth SDK) para uso manual no Codespaces PRIVADO.
 * Somente usuários falsos pré-criados pela equipe via Auth Admin, NUNCA enviados por e-mail.
 * Não cria usuários, não altera matrículas, não executa SQL e não usa chave service_role.
 * Não imprimir credenciais, tokens, links assinados, e-mails ou dados privados.
 */
import { createClient } from '@supabase/supabase-js';

const URL_DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const BUCKET='educart-foto-individual-dev';
const obrigatoria=(nome)=>{
 const v=process.env[nome]?.trim();
 if (!v) throw Error('Falta configuração privada '+nome+'; teste R13-B NÃO EXECUTADO.');
 return v;
};

async function ler(client,tabela,coluna,valor,colunas='id') {
 const {data,error}=await client.from(tabela).select(colunas).eq(coluna,valor).limit(100);
 if(error)throw Error('Consulta bloqueada/indisponível: '+tabela);
 return data??[];
}
function exigir(condicao,mensagem) { if(!condicao)throw Error('R13-B não homologado: '+mensagem); }
async function entrar(sufixo) {
 const email=obrigatoria('R13_ESTUDANTE_'+sufixo+'_EMAIL').toLowerCase();
 const password=obrigatoria('R13_ESTUDANTE_'+sufixo+'_SENHA');
 exigir(email.endsWith('@example.invalid'), 'use SOMENTE identidades sintéticas @example.invalid');
 const client=createClient(URL_DEV,obrigatoria('NEXT_PUBLIC_SUPABASE_ANON_KEY'),{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false},
 });
 const {data,error}=await client.auth.signInWithPassword({email,password});
 exigir(!error&&data?.user&&!data.user.is_anonymous,'autenticação DEV '+sufixo+' inválida');
 const {data:verificada,error:erroVerificacao}=await client.auth.getUser();
 exigir(!erroVerificacao&&verificada?.user?.id===data.user.id,'sessão Auth '+sufixo+' não comprovada');
 return {client,uid:data.user.id};
}
async function proprio({client,uid},letra) {
 const pessoas=await ler(client,'pessoas','auth_user_id',uid,'id,auth_user_id');
 exigir(pessoas.length===1,'cadastro fictício individual '+letra+' não vinculado');
 const pessoaId=pessoas[0].id;
 const mats=await ler(client,'matriculas','pessoa_id',pessoaId,'id,turma_id,situacao');
 const ativas=mats.filter(m=>m.situacao==='ativa'||m.situacao==='concluida');
 exigir(ativas.length===1,'necessária UMA matrícula ativa sintética '+letra);
 const matriculaId=ativas[0].id, turmaId=ativas[0].turma_id;
 const turma=await ler(client,'turmas','id',turmaId,'id,codigo');
 exigir(turma.length===1,'turma vinculada '+letra+' não localizada');
 const aulas=await ler(client,'educart_aulas_dev','turma_id',turmaId,'id,turma_id,situacao');
 exigir(aulas.length>0,'agende ao menos uma aula sintética na turma '+letra);
 const chamadas=await ler(client,'educart_chamadas_dev','matricula_id',matriculaId,'id,matricula_id');
 exigir(chamadas.length>0,'registre ao menos uma chamada sintética '+letra);
 const planos=await ler(client,'educart_planos_financeiros_r11_dev','matricula_id',matriculaId,
 'matricula_id,situacao');
 exigir(planos.length===1&&planos[0].situacao==='ativo','plano financeiro ativo individual '+letra+' não visível');
 const parcelas=await ler(client,'educart_parcelas_financeiras_r11_dev','matricula_id',matriculaId,
 'id,matricula_id,numero,competencia,situacao,confirmado_em');
 exigir(parcelas.length===24&&new Set(parcelas.map(p=>p.numero)).size===24,
 'plano fictício de 24 parcelas completo '+letra);
 const consent=await ler(client,'educart_fotos_consentimento_dev','pessoa_id',pessoaId,
 'pessoa_id,auth_user_id,consentiu');
 exigir(consent.length===1&&consent[0].auth_user_id===uid&&consent[0].consentiu===true,
 'consentimento privado sintético '+letra+' não confirmado');
 const {data:fotos,error:erroFotos}=await client.storage.from(BUCKET).list(uid,{limit:20});
 exigir(!erroFotos&&Array.isArray(fotos),'Storage privado indisponível '+letra);
 exigir(fotos.every(f=>f.name==='foto'),'Storage expôs arquivo não pertencente ao titular '+letra);
 exigir(fotos.some(f=>f.name==='foto'),'falta fotografia fictícia de teste '+letra);
 const {data:imagem,error:erroAssinatura}=await client.storage.from(BUCKET).createSignedUrl(uid+'/foto',60);
 exigir(!erroAssinatura&&Boolean(imagem?.signedUrl),'foto própria não acessível '+letra);
 return {pessoaId,matriculaId,turmaId,uid};
}
async function negarCruzamento(sessao,outro,letra) {
 const casos=[
  ['pessoas','id',outro.pessoaId],
  ['matriculas','id',outro.matriculaId],
  ['turmas','id',outro.turmaId], // R13-D: a turma alheia não é uma lista global de autenticados.
  ['educart_planos_financeiros_r11_dev','matricula_id',outro.matriculaId],
  ['educart_aulas_dev','turma_id',outro.turmaId],
  ['educart_chamadas_dev','matricula_id',outro.matriculaId],
  ['educart_parcelas_financeiras_r11_dev','matricula_id',outro.matriculaId],
  ['educart_fotos_consentimento_dev','pessoa_id',outro.pessoaId],
  ['mensalidades_formacao','matricula_id',outro.matriculaId],
 ];
 for (const [tabela,coluna,valor] of casos) {
  const dados=await ler(sessao.client,tabela,coluna,valor,'id');
  exigir(dados.length===0,'estudante '+letra+' leu registros alheios: '+tabela);
 }
 const {data,error}=await sessao.client.storage.from(BUCKET).createSignedUrl(outro.uid+'/foto',60);
 exigir(Boolean(error)||!data?.signedUrl,'estudante '+letra+' obteve URL assinada da foto alheia');
}
async function main(){
 exigir(process.env.CODESPACES==='true','execute apenas no Codespaces PRIVATE da candidata');
 exigir(obrigatoria('NEXT_PUBLIC_SUPABASE_URL')===URL_DEV,'projeto Supabase diferente do DEV autorizado');
 exigir(process.env.R13_PERMITIR_TESTE_AUTENTICADO==='sim','habilitação consciente R13_PERMITIR_TESTE_AUTENTICADO=sim ausente');
 let A,B;
 try{
  A=await entrar('A');
  B=await entrar('B');
  exigir(A.uid!==B.uid,'identidades fictícias A e B são a mesma conta');
  const a=await proprio(A,'A'),b=await proprio(B,'B');
  exigir(a.pessoaId!==b.pessoaId&&a.matriculaId!==b.matriculaId&&a.turmaId!==b.turmaId,
   'o ensaio exige duas pessoas, matrículas e turmas distintas');
  await negarCruzamento(A,b,'A');
  await negarCruzamento(B,a,'B');
  console.log('R13-B AUTH PASS: sessões reais A/B, matrículas e turmas independentes, chamadas, 24 parcelas, consentimento e Storage isolados.');
 } finally {
  if (A) await A.client.auth.signOut().catch(()=>{});
  if (B) await B.client.auth.signOut().catch(()=>{});
 }
}
main().catch(e=>{console.error(e instanceof Error?e.message:'R13-B não concluído');process.exitCode=1;});
