'use client';

/**
 * Convite privado de aluno efetivamente matriculado.
 * O link isoladamente NUNCA concede acesso: a RPC exige autenticação,
 * email confirmado igual à pessoa e matrícula ativa no Supabase DEV.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EducartLogo } from '@/components/EducartLogo';
import { createClient } from '@/lib/supabase/client';
import '../minha-educart.css';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AtivarMinhaEducartPage(){
  const router=useRouter();
  const supabase=useMemo(()=>createClient(),[]);
  const [convite,setConvite]=useState('');
  const [carregando,setCarregando]=useState(true);
  const [ativando,setAtivando]=useState(false);
  const [autenticado,setAutenticado]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');

  const verificar=useCallback(async()=>{
    const id=new URLSearchParams(window.location.search).get('convite')??'';
    setConvite(UUID.test(id)?id:'');
    if(!UUID.test(id)){
      setErro('Este convite está incompleto. Solicite o link individual à Secretaria.');
      setCarregando(false);return;
    }
    try{
      const {data:{user},error}=await supabase.auth.getUser();
      setAutenticado(Boolean(user&&!user.is_anonymous&&!error));
    }catch{setErro('Não foi possível validar sua sessão. Tente novamente.');}
    finally{setCarregando(false);}
  },[supabase]);

  useEffect(()=>{void verificar();},[verificar]);
  const ativar=async()=>{
    if(!convite||ativando)return;
    setErro('');setSucesso('');setAtivando(true);
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user||user.is_anonymous){
        router.replace('/minha-educart/login?convite='+encodeURIComponent(convite));return;
      }
      // A função no servidor verifica auth.users.email_confirmed_at,
      // titularidade da pessoa, matrícula ativa e expiração do convite.
      const {data,error}=await supabase.rpc('educart_ativar_convite_dev',{p_convite_id:convite});
      if(error||!data){
        setErro('Não foi possível ativar este convite. Confirme seu e-mail de matrícula, verifique a validade do link ou fale com a Secretaria.');
        return;
      }
      setSucesso('Acesso confirmado! Sua Minha EducART já está vinculada à matrícula.');
      router.replace('/minha-educart');
    }catch{setErro('Falha de conexão. Nenhum perfil foi alterado.');}
    finally{setAtivando(false);}
  };
  return <div className="me-root">
    <header className="me-header">
      <Link href="/" aria-label="Voltar à EducART"><EducartLogo size="default"/></Link>
      <Link href="/formacao">← Portal EducART</Link>
    </header>
    <main className="me-wrap">
      <span className="me-kicker">EDUCART · CONVITE INDIVIDUAL</span>
      <h1 className="me-title">Sua Minha EducART<span style={{color:'#f4bc5a'}}>.</span></h1>
      <p className="me-lead">Sua matrícula abre as portas do seu espaço privado de estudante. Sua identidade continua protegida.</p>
      <section className="me-card" style={{maxWidth:630}}>
        <h2>Ativar meu acesso</h2>
        <p>Use o mesmo e-mail informado na inscrição e confirme-o na sua caixa de entrada. O link só funciona para a pessoa matriculada; ele nunca revela seus registros para outra pessoa.</p>
        {erro&&<p className="me-state me-error" role="alert">{erro}</p>}
        {sucesso&&<p className="me-state" role="status">{sucesso}</p>}
        {carregando?<p role="status" className="me-state">Verificando convite e sessão...</p>:
          convite?autenticado?
            <button className="me-button" type="button" disabled={ativando} onClick={()=>void ativar()}>
              {ativando?'Validando identidade...':'Ativar Minha EducART'}
            </button>:
            <Link className="me-button" href={'/minha-educart/login?convite='+encodeURIComponent(convite)}>
              Entrar ou criar meu acesso
            </Link>
          :<Link className="me-button" href="/formacao">Voltar ao portal</Link>}
        <p className="me-note">Sua conta digital é única. Se você fizer outras formações, as matrículas serão relacionadas ao mesmo perfil. Não pediremos Pix nem senha por este convite.</p>
      </section>
    </main>
  </div>;
}
