'use client';
/**
 * Minha EducART — recuperação de senha pela própria identidade Supabase Auth.
 * Não concede matrícula, não ativa convite e não revela se um e-mail existe.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { createClient } from '@/lib/supabase/client';
import '../minha-educart.css';

export default function RecuperarMinhaEducartPage() {
 const supabase=useMemo(()=>createClient(),[]);
 const [email,setEmail]=useState('');
 const [nova,setNova]=useState('');
 const [confirmacao,setConfirmacao]=useState('');
 const [autorizado,setAutorizado]=useState(false);
 const [enviando,setEnviando]=useState(false);
 const [erro,setErro]=useState('');
 const [aviso,setAviso]=useState('');
 useEffect(()=>{
   let ativo=true;
   const {data:{subscription}}=supabase.auth.onAuthStateChange((evento)=>{
     if(!ativo)return;
     if(evento==='PASSWORD_RECOVERY'){
       setAutorizado(true);
       setErro('');
       setAviso('Link de recuperação verificado. Crie agora sua nova senha.');
     }
   });
   return()=>{ativo=false;subscription.unsubscribe();};
 },[supabase]);
 const solicitar=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(enviando)return;
   setEnviando(true);setErro('');setAviso('');
   try {
     if(!/^\S+@\S+\.\S+$/.test(email.trim())){setErro('Digite um e-mail válido.');return;}
     // Não usar links trazidos por parâmetro: destino fixo na própria origem.
     const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{
       redirectTo:window.location.origin+'/minha-educart/recuperar',
     });
     if(error){setErro('Não foi possível encaminhar a solicitação. Tente novamente ou procure a Secretaria.');return;}
     setAviso('Se houver uma conta associada ao e-mail, você receberá instruções de recuperação. Confira também a pasta de spam.');
   }catch{setErro('Conexão indisponível. Tente novamente.');}
   finally{setEnviando(false);}
 };
 const atualizar=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(!autorizado||enviando)return;
   if(nova.length<12||nova!==confirmacao){
     setErro('A nova senha deve ter pelo menos 12 caracteres e coincidir com a confirmação.');return;
   }
   setEnviando(true);setErro('');setAviso('');
   try {
     const {data:{user},error:authError}=await supabase.auth.getUser();
     if(authError||!user||user.is_anonymous){
       setAutorizado(false);setErro('O link expirou ou a sessão não foi confirmada. Solicite outro e-mail.');return;
     }
     const {error}=await supabase.auth.updateUser({password:nova});
     if(error){setErro('Não foi possível atualizar a senha. Consulte a política de senhas ou solicite novo link.');return;}
     setNova('');setConfirmacao('');setAutorizado(false);
     setAviso('Senha atualizada. Você pode acessar Minha EducART com suas novas credenciais.');
     // Não ativar matrícula nem criar vínculo ao concluir a recuperação.
   }catch{setErro('Falha de conexão ao atualizar a senha.');}
   finally{setEnviando(false);}
 };
 return <div className="me-root">
  <header className="me-header">
    <Link href="/" aria-label="Voltar à EducART"><EducartLogo size="default"/></Link>
    <Link href="/minha-educart/login">← Voltar ao login</Link>
  </header>
  <main className="me-wrap">
    <span className="me-kicker">EDUCART · RECUPERAÇÃO PRIVADA</span>
    <h1 className="me-title">Recuperar meu acesso<span style={{color:'#f4bc5a'}}>.</span></h1>
    <p className="me-lead">A recuperação usa o e-mail da conta e não substitui o convite ou a confirmação acadêmica da Secretaria.</p>
    <section className="me-card" style={{maxWidth:590}}>
      {erro&&<p role="alert" className="me-state me-error">{erro}</p>}
      {aviso&&<p role="status" className="me-state">{aviso}</p>}
      {!autorizado?
        <form onSubmit={solicitar} className="me-stack">
          <h2>Receber link para redefinir senha</h2>
          <label className="me-label" htmlFor="rec-email">E-mail da conta Minha EducART</label>
          <input className="me-input" id="rec-email" type="email" value={email}
            autoComplete="email" required maxLength={320} onChange={e=>setEmail(e.target.value)} disabled={enviando}/>
          <button type="submit" className="me-button" disabled={enviando}>
            {enviando?'Verificando...':'Solicitar link de recuperação'}
          </button>
        </form>:
        <form onSubmit={atualizar} className="me-stack">
          <h2>Definir nova senha</h2>
          <label className="me-label" htmlFor="rec-senha">Nova senha (12 caracteres ou mais)</label>
          <input className="me-input" id="rec-senha" type="password" minLength={12}
            required autoComplete="new-password" value={nova}
            onChange={e=>setNova(e.target.value)} disabled={enviando}/>
          <label className="me-label" htmlFor="rec-confirmar">Confirme a nova senha</label>
          <input className="me-input" id="rec-confirmar" type="password" minLength={12}
            required autoComplete="new-password" value={confirmacao}
            onChange={e=>setConfirmacao(e.target.value)} disabled={enviando}/>
          <button className="me-button" type="submit" disabled={enviando}>
            {enviando?'Atualizando...':'Confirmar nova senha'}
          </button>
        </form>}
      <p className="me-note">Nenhum link, senha ou código deve ser enviado à Secretaria por mensagem. O envio de e-mails depende das configurações do Supabase DEV e ainda exige homologação.</p>
    </section>
  </main>
 </div>;
}
