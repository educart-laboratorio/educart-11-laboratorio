'use client';

/**
 * Minha EducART: extensão individual do cadastro acadêmico, sem base paralela.
 * Uma pessoa só acessa a própria linha por auth_user_id + RLS.
 * A ativação vem de convite individual de matrícula com email confirmado.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EducartLogo } from '@/components/EducartLogo';
import { createClient } from '@/lib/supabase/client';
import './minha-educart.css';
import { conferirExtratoR11Individual } from '@/lib/financeiro/extrato-individual-r11';

const BUCKET_FOTO='educart-foto-individual-dev';
const MIME_FOTO=['image/jpeg','image/webp'];
const MAX_FOTO=5*1024*1024;
type Pessoa={id:string;nome_completo:string;email:string|null;data_nascimento:string|null;cidade:string|null;auth_user_id:string};
type Vinculo={situacao:'pendente'|'aprovado'|'recusado';solicitado_em:string;referencia_conferencia:string|null};
type Matricula={id:string;turma_id:string;situacao:string;origem:string;ingresso_em:string|null};
type Turma={id:string;codigo:string;formacao_id:string};
type Formacao={id:string;nome:string};
type Mensalidade={id:string;matricula_id:string;competencia:string;status:string;vencimento_em:string;valor_centavos:number};
type ParcelaR11={id:string;matricula_id:string;numero:number;competencia:string;vencimento_em:string;valor_centavos:number;situacao:'pendente'|'paga';confirmado_em:string|null};
type PlanoAtivoR11={matricula_id:string;situacao:'ativo'};
type Frequencia={id:string;aula_id:string;matricula_id:string;situacao:'presente'|'ausente'|'justificada';justificativa:string|null};
type AulaIndividual={id:string;turma_id:string;data_aula:string;tema:string;inicio:string;fim:string;situacao:string};

export default function MinhaEducartPage(){
  const router=useRouter();
  const supabase=useMemo(()=>createClient(),[]);
  const [usuarioId,setUsuarioId]=useState('');
  const [usuarioEmail,setUsuarioEmail]=useState('');
  const [pessoa,setPessoa]=useState<Pessoa|null>(null);
  const [vinculo,setVinculo]=useState<Vinculo|null>(null);
  const [matriculas,setMatriculas]=useState<Matricula[]>([]);
  const [turmas,setTurmas]=useState<Turma[]>([]);
  const [formacoes,setFormacoes]=useState<Formacao[]>([]);
  const [mensalidades,setMensalidades]=useState<Mensalidade[]>([]);
  const [parcelasR11,setParcelasR11]=useState<ParcelaR11[]>([]);
  const [planosAtivosR11,setPlanosAtivosR11]=useState<PlanoAtivoR11[]>([]);
  const [frequencias,setFrequencias]=useState<Frequencia[]>([]);
  const [aulas,setAulas]=useState<AulaIndividual[]>([]);
  const [consentimento,setConsentimento]=useState<boolean|null>(null);
  const [fotoUrl,setFotoUrl]=useState('');
  const [ampliada,setAmpliada]=useState(false);
  const [termoFoto,setTermoFoto]=useState(false);
  const [carregando,setCarregando]=useState(true);
  const [gravando,setGravando]=useState(false);
  const [erro,setErro]=useState('');
  const [erroConsulta,setErroConsulta]=useState('');
  const [aviso,setAviso]=useState('');

  const carregar=useCallback(async()=>{
    setCarregando(true);setErro('');setErroConsulta('');
    try{
      const {data:{user},error}=await supabase.auth.getUser();
      if(error||!user||user.is_anonymous){router.replace('/minha-educart/login');return;}
      setUsuarioId(user.id);
      setUsuarioEmail(user.email||'');
      const pessoaRes=await supabase.from('pessoas')
        .select('id,nome_completo,email,data_nascimento,cidade,auth_user_id')
        .eq('auth_user_id',user.id).maybeSingle();
      if(pessoaRes.error){setErroConsulta('Não foi possível carregar seus dados. Confira a conexão e o acesso ao ambiente.');return;}
      const p=(pessoaRes.data||null) as Pessoa|null;
      setPessoa(p);
      if(!p){
        const pedido=await supabase.from('educart_solicitacoes_vinculo_dev')
          .select('situacao,solicitado_em,referencia_conferencia')
          .eq('auth_user_id',user.id).maybeSingle();
        if(pedido.error){setErroConsulta('O módulo de vinculação ainda não está disponível neste ambiente DEV.');return;}
        setVinculo((pedido.data||null) as Vinculo|null);
        setMatriculas([]);setTurmas([]);setFormacoes([]);setMensalidades([]);setParcelasR11([]);setPlanosAtivosR11([]);setFrequencias([]);setAulas([]);
        setConsentimento(null);setFotoUrl('');
        return;
      }
      setVinculo(null);
      const [m,c]=await Promise.all([
        supabase.from('matriculas').select('id,turma_id,situacao,origem,ingresso_em').eq('pessoa_id',p.id),
        supabase.from('educart_fotos_consentimento_dev').select('consentiu').eq('pessoa_id',p.id).maybeSingle(),
      ]);
      if(m.error||c.error){setErroConsulta('Parte do seu histórico não pôde ser carregada. Nenhuma informação foi modificada.');return;}
      const lista=(m.data||[]) as Matricula[];
      setMatriculas(lista);setConsentimento(c.data?Boolean(c.data.consentiu):null);
      if(lista.length){
        const turmaIds=lista.map(item=>item.turma_id);
        const [t,me,r11,planosAtivos,aulasAgendadas]=await Promise.all([
          supabase.from('turmas').select('id,codigo,formacao_id').in('id',turmaIds),
          supabase.from('mensalidades_formacao')
            .select('id,matricula_id,competencia,status,vencimento_em,valor_centavos').in('matricula_id',lista.map(item=>item.id)),
          supabase.from('educart_parcelas_financeiras_r11_dev')
            .select('id,matricula_id,numero,competencia,vencimento_em,valor_centavos,situacao,confirmado_em')
            .in('matricula_id',lista.map(item=>item.id)),
          // O estado ativo, limitado por RLS à própria matrícula, evita mascarar planos incompletos.
          supabase.from('educart_planos_financeiros_r11_dev')
            .select('matricula_id,situacao')
            .in('matricula_id',lista.map(item=>item.id))
            .eq('situacao','ativo'),
          // Agenda é da TURMA do estudante, inclusive aulas planejadas sem chamada registrada.
          supabase.from('educart_aulas_dev')
            .select('id,turma_id,data_aula,tema,inicio,fim,situacao')
            .in('turma_id',turmaIds).order('data_aula',{ascending:true}),
        ]);
        if(t.error||me.error||r11.error||planosAtivos.error||aulasAgendadas.error){
          setErroConsulta('Não foi possível consultar integralmente sua agenda ou suas parcelas. Nenhuma informação foi modificada.');
          return; // Não substituir falha de consulta por "nenhuma mensalidade" ou agenda vazia.
        }
        const ts=(t.data||[]) as Turma[];setTurmas(ts);
        setMensalidades((me.data||[]) as Mensalidade[]);
        setParcelasR11((r11.data??[]) as ParcelaR11[]);
        setPlanosAtivosR11((planosAtivos.data??[]) as PlanoAtivoR11[]);
        setAulas((aulasAgendadas.data??[]) as AulaIndividual[]);
        // A frequência é lida na mesma matrícula; RLS impede visualizar chamada de outros estudantes.
        const ch=await supabase.from('educart_chamadas_dev')
          .select('id,aula_id,matricula_id,situacao,justificativa')
          .in('matricula_id',lista.map(item=>item.id));
        if(ch.error){setErroConsulta('Não foi possível consultar sua frequência neste ambiente de homologação.');return;}
        setFrequencias((ch.data||[]) as Frequencia[]);
        if(ts.length){
          const f=await supabase.from('formacoes').select('id,nome').in('id',ts.map(item=>item.formacao_id));
          if(f.error){setErroConsulta('Não foi possível consultar os nomes de suas formações. Tente novamente.');return;}
          setFormacoes((f.data||[]) as Formacao[]);
        } else setFormacoes([]);
      }else{setTurmas([]);setFormacoes([]);setMensalidades([]);setParcelasR11([]);setPlanosAtivosR11([]);setFrequencias([]);setAulas([]);}
      if(c.data?.consentiu){
        const url=await supabase.storage.from(BUCKET_FOTO).createSignedUrl(user.id+'/foto',180);
        setFotoUrl(url.data?.signedUrl||'');
      }else setFotoUrl('');
    }catch{setErroConsulta('Não foi possível consultar os dados.');}
    finally{setCarregando(false);}
  },[router,supabase]);

  useEffect(()=>{void carregar();},[carregar]);
  useEffect(()=>{
    const {data:{subscription}}=supabase.auth.onAuthStateChange((evento,sessao)=>{
      if(evento==='SIGNED_OUT'||!sessao){setPessoa(null);setFotoUrl('');router.replace('/minha-educart/login');}
    });
    return()=>subscription.unsubscribe();
  },[router,supabase]);
  useEffect(()=>{
    if(!ampliada)return;
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setAmpliada(false);};
    window.addEventListener('keydown',esc);
    return()=>window.removeEventListener('keydown',esc);
  },[ampliada]);

  const salvarConsentimento=async(consentiu:boolean)=>{
    if(!pessoa||!usuarioId||gravando)return false;
    setGravando(true);setErro('');setAviso('');
    try{
      if(!consentiu){
        const removido=await supabase.storage.from(BUCKET_FOTO).remove([usuarioId+'/foto']);
        if(removido.error){setErro('Não foi possível retirar a fotografia; tente novamente antes de revogar.');return false;}
      }
      const dados={consentiu};
      const resultado=consentimento===null
        ?await supabase.from('educart_fotos_consentimento_dev').insert({
          pessoa_id:pessoa.id,auth_user_id:usuarioId,consentiu,versao_termo:'educart-foto-1.1-v1'})
        :await supabase.from('educart_fotos_consentimento_dev').update(dados).eq('pessoa_id',pessoa.id);
      if(resultado.error){setErro('Não foi possível registrar a autorização.');return false;}
      setConsentimento(consentiu);
      if(!consentiu){setFotoUrl('');setTermoFoto(false);setAviso('Consentimento revogado. A fotografia armazenada foi excluída, quando existente.');}
      return true;
    }catch{setErro('Falha ao atualizar o consentimento.');return false;}
    finally{setGravando(false);}
  };

  const enviarFoto=async(arquivo:File|undefined)=>{
    if(!arquivo||!pessoa||!usuarioId||gravando)return;
    setErro('');setAviso('');
    if(!MIME_FOTO.includes(arquivo.type)||arquivo.size>MAX_FOTO||arquivo.size<=0){
      setErro('Selecione uma única fotografia JPEG ou WebP de até 5 MB.');return;
    }
    if(!termoFoto&&!consentimento){
      setErro('Leia e aceite a autorização de uso privado antes de enviar.');return;
    }
    if(!consentimento){
      const ok=await salvarConsentimento(true);
      if(!ok)return;
    }
    setGravando(true);
    try{
      const envio=await supabase.storage.from(BUCKET_FOTO).upload(usuarioId+'/foto',arquivo,
        {upsert:true,contentType:arquivo.type,cacheControl:'60'});
      if(envio.error){setErro('Foto não enviada: confira o tamanho, o tipo e as permissões de armazenamento.');return;}
      const url=await supabase.storage.from(BUCKET_FOTO).createSignedUrl(usuarioId+'/foto',180);
      setFotoUrl(url.data?.signedUrl||'');
      setAviso('Fotografia privada atualizada. Ela não aparece em catálogo, agência ou página pública.');
    }catch{setErro('Falha ao enviar a fotografia.');}
    finally{setGravando(false);}
  };

  const sair=async()=>{await supabase.auth.signOut();router.replace('/minha-educart/login');};
  const hojeBahia=new Intl.DateTimeFormat('sv-SE',
    {timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const aulasProximas=aulas.filter(a=>a.data_aula>=hojeBahia&&a.situacao==='planejada')
    .sort((a,b)=>a.data_aula.localeCompare(b.data_aula)||a.inicio.localeCompare(b.inicio));
  const aulasCanceladas=aulas.filter(a=>a.situacao==='cancelada'&&a.data_aula>=hojeBahia)
    .sort((a,b)=>a.data_aula.localeCompare(b.data_aula));
  // Se o plano está ativo, o estudante precisa ver a pendência de extrato mesmo que
  // a API devolva zero parcelas. Lançamentos órfãos também exigem conferência.
  const matriculasComR11=new Set([
    ...planosAtivosR11.map(p=>p.matricula_id),
    ...parcelasR11.map(p=>p.matricula_id),
  ]);
  const nomeTurma=(turmaId:string)=>{
    const t=turmas.find(item=>item.id===turmaId);
    const f=formacoes.find(item=>item.id===t?.formacao_id);
    return (f?.nome||'Formação EducART')+' · '+(t?.codigo||'Turma');
  };

  return <div className="me-root">
    <header className="me-header">
      <Link href="/" aria-label="Voltar ao Portal EducART"><EducartLogo size="default"/></Link>
      <button className="me-button me-button-secondary" type="button" onClick={()=>void sair()}>Sair do espaço</button>
    </header>
    <main className="me-wrap">
      <span className="me-kicker">EDUCART · TRAJETÓRIA INDIVIDUAL</span>
      <h1 className="me-title">Minha EducART<span style={{color:'#f4bc5a'}}>.</span></h1>
      <p className="me-lead">Sua formação, seu histórico e sua identidade artística em sintonia com o painel da equipe. O acesso a dados é individual e privado.</p>
      {erroConsulta&&<p role="alert" className="me-state me-error">{erroConsulta}</p>}
      {erro&&<p role="alert" className="me-state me-error">{erro}</p>}
      {aviso&&<p role="status" className="me-state">{aviso}</p>}
      {carregando?<p role="status" className="me-state">Verificando identidade e histórico acadêmico...</p>
        :erroConsulta?<section className="me-card" aria-label="Consulta temporariamente indisponível">
          <h2>Seu histórico precisa ser consultado novamente</h2>
          <p>A consulta foi interrompida. Para sua segurança, não mostramos parcelas, aulas ou frequência incompletas como se fossem registros inexistentes.</p>
          <button type="button" className="me-button" onClick={()=>void carregar()}>Tentar novamente</button>
        </section>
        :!pessoa?
        <section className="me-card">
          <h2>Ative seu convite de matrícula</h2>
          <p>Você entrou com <strong>{usuarioEmail}</strong>, mas ainda não ativou uma matrícula nesta conta. A Secretaria disponibiliza um convite individual após a confirmação do ingresso numa turma.</p>
          {vinculo&&<p className="me-state" role="status">Existe uma solicitação anterior em situação {vinculo.situacao}. A Secretaria pode orientar a regularização pelo convite.</p>}
          <p className="me-note">Abra o link que recebeu por e-mail ou WhatsApp e confirme sua identidade. Não é preciso solicitar um vínculo manualmente. Nunca envie senha ou comprovante por este formulário.</p>
        </section>
        :<>
          <section className="me-card" aria-label="Identificação do estudante">
            <span className="me-kicker">IDENTIFICAÇÃO PRIVADA</span>
            <h2>{pessoa.nome_completo}</h2>
            <dl className="me-meta">
              <div><dt>Cadastro</dt><dd>Conferido pela Coordenação</dd></div>
              <div><dt>E-mail da conta</dt><dd>{usuarioEmail}</dd></div>
              <div><dt>Turmas vinculadas</dt><dd>{matriculas.length}</dd></div>
              <div><dt>Minha EducART</dt><dd>{matriculas.some(m=>m.situacao==='ativa'||m.situacao==='concluida')?'Nível 1 · Membro':'Acesso acadêmico em análise'}</dd></div>
            </dl>
          </section>
          <section className="me-card" aria-label="Minha trajetória acadêmica">
            <span className="me-kicker">HISTÓRICO ACADEMICO</span>
            <h2>Minha formação</h2>
            {matriculas.length===0?<p>Ainda não há turma vinculada ao seu cadastro.</p>
              :<div className="me-stack">{matriculas.map(m=><article className="me-state" key={m.id}>
                <strong>{nomeTurma(m.turma_id)}</strong>
                <p>Situação acadêmica: <strong>{m.situacao}</strong>. Origem: {m.origem==='recadastramento'?'Incorporação de turma existente':'Inscrição EducART'}.</p>
              </article>)}</div>}
            <h2 style={{marginTop:25}}>Próximas aulas <span className="me-kicker">AGENDA ACADÊMICA</span></h2>
            {aulasProximas.length===0?<p>Ainda não há próximas aulas planejadas para suas turmas cadastradas.</p>:
              <div className="me-stack">{aulasProximas.slice(0,30).map(a=><article className="me-state" key={a.id}>
                <strong>{a.data_aula} · {a.inicio.slice(0,5)}–{a.fim.slice(0,5)}</strong>
                <p>{nomeTurma(a.turma_id)} · {a.tema} · <strong>Planejada</strong></p>
              </article>)}</div>}
            {aulasProximas.length>30&&<p className="me-note">Exibindo as próximas 30 aulas. Consulte a Coordenação para o calendário completo.</p>}
            {aulasCanceladas.length>0&&<details className="me-state">
              <summary>Aulas canceladas na sua turma</summary>
              <div className="me-stack">{aulasCanceladas.map(a=><p key={a.id}>
                {a.data_aula} · {nomeTurma(a.turma_id)} · {a.tema} · Cancelada. Consulte a Coordenação para esclarecimentos.
              </p>)}</div>
            </details>}
            <h2 style={{marginTop:25}}>Minha frequência</h2>
            {frequencias.length===0?<p>Nenhuma chamada registrada para suas matrículas neste ambiente.</p>
              :<div className="me-stack">{frequencias.map(c=>{
                const a=aulas.find(item=>item.id===c.aula_id);
                return <article className="me-state" key={c.id}>
                  <strong>{a?.data_aula??'Aula não localizada'} · {a?.tema??'Atividade acadêmica'}</strong>
                  <p>{a?nomeTurma(a.turma_id)+' · ':''}Frequência: <strong>{c.situacao==='presente'?'Presente':c.situacao==='justificada'?'Falta justificada':'Ausente'}</strong>.</p>
                  {c.situacao==='justificada'&&c.justificativa&&<p>Justificativa registrada: {c.justificativa}</p>}
                </article>;
              })}</div>}
            <h2 style={{marginTop:25}}>Minhas 24 parcelas e mensalidades</h2>
            {matriculas.filter(m=>matriculasComR11.has(m.id)).map(m=>{
              const linhas=parcelasR11.filter(p=>p.matricula_id===m.id);
              const planoAtivo=planosAtivosR11.some(p=>p.matricula_id===m.id);
              const progresso=planoAtivo?conferirExtratoR11Individual(m.id,linhas,hojeBahia):null;
              if(!progresso)return <p className="me-state" role="status" key={m.id}>
                {nomeTurma(m.turma_id)}: histórico de 24 parcelas em conferência. Não é possível informar quitação ou atraso com dados incompletos. Consulte a Secretaria.
              </p>;
              return <section key={m.id} className="me-state" aria-label={'Progresso financeiro de '+nomeTurma(m.turma_id)}>
                <h3>{nomeTurma(m.turma_id)} · {progresso.pagas}/24 quitadas</h3>
                <p>{progresso.vencidas} vencida(s) · {progresso.pendentes} pendente(s) no prazo. Parcelas futuras são neutras.</p>
                <div className="me-parcelas" role="group" aria-label="24 parcelas individuais">
                  {progresso.parcelas.map(p=><span className={'me-parcela me-parcela-'+p.estado}
                    key={p.numero} title={'Parcela '+p.numero+': '+p.estado}
                    aria-label={'Parcela '+p.numero+': '+p.estado}>{p.numero}</span>)}
                </div>
                <p className="me-note">Este histórico é individual e considera somente quitações conferidas no sistema.</p>
              </section>;
            })}
            {mensalidades.filter(m=>!matriculasComR11.has(m.matricula_id)).length>0&&
              <div className="me-stack">{mensalidades
                .filter(m=>!matriculasComR11.has(m.matricula_id))
                .map(m=><p className="me-state" key={m.id}>
                  Competência {m.competencia.slice(0,7)} · {(m.valor_centavos/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} · <strong>{m.status}</strong>
                </p>)}</div>}
            {planosAtivosR11.length===0&&parcelasR11.length===0&&mensalidades.length===0&&
              <p>Nenhuma mensalidade lançada para seu cadastro. Isso não significa uma dívida.</p>}
          </section>
          <section className="me-card" aria-label="Fotografia privada do estudante">
            <span className="me-kicker">MEU PERFIL · UMA FOTOGRAFIA</span>
            <h2>Minha foto de identificação</h2>
            <p>Uma fotografia JPEG ou WebP, de até 5 MB. Prefira rosto nítido, iluminação clara e fundo neutro. A imagem é privada e não será publicada automaticamente.</p>
            <div className="me-photo-line">
              <button className="me-photo" type="button" onClick={()=>fotoUrl&&setAmpliada(true)} disabled={!fotoUrl} aria-label={fotoUrl?'Ampliar minha fotografia':'Nenhuma fotografia enviada'}>
                {fotoUrl?<img src={fotoUrl} alt="Minha fotografia de identificação privada"/>:<span>Nenhuma foto enviada</span>}
              </button>
              <div className="me-photo-panel me-stack">
                {!consentimento&&<label className="me-checkbox"><input type="checkbox" checked={termoFoto} onChange={e=>setTermoFoto(e.target.checked)}/>
                  <span>Autorizo o armazenamento <strong>privado</strong> de uma foto para identificação no meu cadastro EducART. Sei que posso revogar a autorização e excluir a imagem e que isso não autoriza uso publicitário ou divulgação.</span>
                </label>}
                <label className="me-label" htmlFor="me-foto">Escolher ou substituir fotografia</label>
                <input id="me-foto" className="me-input" type="file" accept="image/jpeg,image/webp"
                  disabled={gravando||(!termoFoto&&!consentimento)}
                  onChange={e=>{void enviarFoto(e.target.files?.[0]);e.target.value='';}}/>
                <small className="me-note">Arquivo privado em bucket de 5 MiB; apenas o titular pode enviar e ampliar. Não há galeria pública.</small>
                {consentimento&&<button type="button" className="me-button me-button-secondary" disabled={gravando}
                  onClick={()=>void salvarConsentimento(false)}>Revogar autorização e remover foto</button>}
              </div>
            </div>
          </section>
        </>}
      <p className="me-note">EducART 1.1 · Ambiente de homologação. Sem cobrança automática, sem visibilidade pública de perfil e sem importação de dados pessoais reais.</p>
    </main>
    {ampliada&&fotoUrl&&<div className="me-photo-modal" onClick={()=>setAmpliada(false)}>
      <section className="me-photo-dialog" role="dialog" aria-modal="true" aria-label="Fotografia individual ampliada" onClick={e=>e.stopPropagation()}>
        <button type="button" className="me-button me-button-secondary" onClick={()=>setAmpliada(false)}>Fechar ✕</button>
        <img src={fotoUrl} alt="Minha fotografia privada ampliada"/>
      </section>
    </div>}
  </div>;
}
