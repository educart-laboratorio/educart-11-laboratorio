'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EducartLogo } from '@/components/EducartLogo';
import { createClient } from '@/lib/supabase/client';
import '../minha-educart.css';

export default function LoginEstudantePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [modo, setModo] = useState<'entrar'|'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [convite, setConvite] = useState('');
  const voltarAoConvite = (id:string) => id
    ? '/minha-educart/ativar?convite='+encodeURIComponent(id) : '/minha-educart';

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('convite') ?? '';
    // Convite validado novamente no servidor. Nunca dá acesso por si só.
    if (/^[0-9a-f-]{36}$/i.test(id)) setConvite(id);
    let ativo = true;
    void supabase.auth.getUser().then(({data:{user}}) => {
      if (ativo && user && !user.is_anonymous) router.replace(voltarAoConvite(/^[0-9a-f-]{36}$/i.test(id)?id:''));
    });
    return () => { ativo=false; };
  }, [router,supabase]);

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ocupado) return;
    setErro(''); setAviso('');
    if (modo==='criar' && !convite) {
      setErro('A criação do acesso exige o convite da Secretaria após a confirmação da matrícula.');
      return;
    }
    if (modo==='criar' && senha.length<12) {
      setErro('Crie uma senha com pelo menos 12 caracteres.');
      return;
    }
    setOcupado(true);
    try {
      if (modo==='criar') {
        const {data,error} = await supabase.auth.signUp({
          email:email.trim().toLowerCase(),
          password:senha,
          options:{emailRedirectTo:window.location.origin+voltarAoConvite(convite)},
        });
        if (error) {setErro('Não foi possível criar o acesso. Confira o e-mail e a política de senhas.');return;}
        if (data.session) router.replace(voltarAoConvite(convite));
        else setAviso('Confira sua caixa de entrada para confirmar o e-mail. Depois, entre com sua senha e conclua a ativação pelo convite individual.');
      } else {
        const {error} = await supabase.auth.signInWithPassword({email:email.trim(),password:senha});
        if (error){setErro('Não foi possível entrar. Confira as credenciais e a confirmação do e-mail.');return;}
        router.replace(voltarAoConvite(convite));
      }
    } catch {setErro('Conexão indisponível. Tente novamente.');}
    finally {setOcupado(false);setSenha('');}
  };

  return <div className="me-root">
    <header className="me-header">
      <Link href="/" aria-label="Voltar à EducART"><EducartLogo size="default"/></Link>
      <Link href="/formacao">← Portal público</Link>
    </header>
    <main className="me-wrap">
      <span className="me-kicker">EDUCART · ESPAÇO DO ESTUDANTE</span>
      <h1 className="me-title">Minha EducART<span style={{color:'#f4bc5a'}}>.</span></h1>
      <p className="me-lead">Seu percurso na arte, num espaço privado e integrado à Secretaria e à Coordenação. Sua matrícula confirmada habilita seu espaço pessoal. Se ainda não tem conta, utilize o convite individual enviado pela Secretaria.</p>
      <div className="me-card" style={{maxWidth:530}}>
        <h2>{modo==='entrar'?'Acessar meu espaço':'Criar meu acesso privado'}</h2>
        {erro && <p role="alert" className="me-state me-error">{erro}</p>}
        {aviso && <p role="status" className="me-state">{aviso}</p>}
        <form onSubmit={enviar} className="me-stack">
          <div><label className="me-label" htmlFor="me-email">E-mail</label>
            <input id="me-email" type="email" className="me-input" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} maxLength={320}/></div>
          <div><label className="me-label" htmlFor="me-senha">Senha</label>
            <input id="me-senha" type="password" className="me-input" required minLength={modo==='criar'?12:1} autoComplete={modo==='criar'?'new-password':'current-password'} value={senha} onChange={e=>setSenha(e.target.value)}/></div>
          <button className="me-button" type="submit" disabled={ocupado}>{ocupado?'Verificando...':modo==='entrar'?'Entrar no meu espaço':'Criar acesso'}</button>
        </form>
        {modo==='entrar'&&<p className="me-note" style={{marginTop:16}}>
          <Link href="/minha-educart/recuperar">Esqueci minha senha</Link>
        </p>}
        {convite?<button type="button" className="me-button me-button-secondary" style={{marginTop:16}} onClick={()=>{setModo(m=>m==='entrar'?'criar':'entrar');setErro('');setAviso('');setSenha('');}}>
          {modo==='entrar'?'Criar meu acesso com convite':'Já tenho uma conta'}
        </button>:<p className="me-note">Ainda não recebeu um convite? Fale com a Secretaria após a confirmação da matrícula em uma turma.</p>}
        <p className="me-note">A área do aluno não dá acesso ao painel da equipe. Todos os dados e fotografias permanecem privados até autorização específica.</p>
      </div>
    </main>
  </div>;
}
