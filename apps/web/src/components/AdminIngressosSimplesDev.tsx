'use client';
/** EducART DEV — ingresso simples. Cadastro, turma, mensalidade e bolsa; sem interface Pix. */
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {AdminVincularEstudanteTurmaDev} from '@/components/AdminVincularEstudanteTurmaDev';
import {competenciaValida,proximoMesSeguro,podeRegistrarPagamento,podeMatricularCadastro} from '@/lib/admin/ingressos-coesao';

type Inscricao={id:string;nome_completo:string;email:string;telefone_whatsapp:string;status:string};
type Pessoa={id:string;nome_completo:string;email:string|null;telefone:string|null};
type Matricula={id:string;pessoa_id:string;turma_id:string;candidatura_id:string|null;situacao:string};
type Turma={id:string;codigo:string;docente_id:string|null;local_nome:string|null;situacao:string};
type Docente={id:string;nome_completo:string;nome_artistico:string|null;situacao:string};
type Condicao={matricula_id:string;valor_base_centavos:number;bolsa:'nenhuma'|'integral'|'meia'|'outra';valor_devido_centavos:number;primeira_competencia:string};
type Mensalidade={id:string;matricula_id:string;competencia:string;valor_centavos:number;status:string};
type EdicaoTurma={docente_id:string;local_nome:string};
type Props={supabase:SupabaseClient;podeGerir:boolean;onAbrirDocentes:()=>void;onRascunhoPendenteChange?:(p:boolean)=>void};
type Popup='cadastros'|'matricular'|'vincularPessoa'|'mensalidades'|'turmas'|'professor'|'ficha'|'contrato'|null;
type ContatoView={key:string;nome:string;email:string|null;telefone:string|null;inscricaoId:string|null;pessoaId:string|null;matricula:Matricula|null};
const CONTRATO_URL='https://drive.google.com/file/d/1Cn_YIAHq8ZtcbY2foIM2ioz7ugVv5TZk/view';
const competenciaHoje=()=>new Intl.DateTimeFormat('sv-SE',{year:'numeric',month:'2-digit',timeZone:'America/Bahia'}).format(new Date());
const waLink=(telefone:string|null,mensagem?:string)=>{
  const n=digitos(telefone);
  const numero=n.length===10||n.length===11?'55'+n:n;
  return /^55\d{10,11}$/.test(numero)?'https://wa.me/'+numero+(mensagem?'?text='+encodeURIComponent(mensagem):''):null;
};
const mailLink=(email:string|null,assunto?:string,mensagem?:string)=>{
  const e=(email??'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return null;
  return 'mailto:'+encodeURIComponent(e)+(assunto?'?subject='+encodeURIComponent(assunto)+'&body='+encodeURIComponent(mensagem??''):'');
};
const dinheiro=(v:number)=>(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const normalizar=(v:string|null|undefined)=>(v??'').trim().toLocaleLowerCase('pt-BR');
const digitos=(v:string|null|undefined)=>(v??'').replace(/\D/g,'');
const mes=(v:string)=>new Date(v+'T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const LOCAIS=['Casa Gameleira','Nomads Hostel'] as const;
export function AdminIngressosSimplesDev({supabase,podeGerir,onRascunhoPendenteChange}:Props){
  const [inscricoes,setInscricoes]=useState<Inscricao[]>([]);
  const [pessoas,setPessoas]=useState<Pessoa[]>([]);
  const [matriculas,setMatriculas]=useState<Matricula[]>([]);
  const [turmas,setTurmas]=useState<Turma[]>([]);
  const [docentes,setDocentes]=useState<Docente[]>([]);
  const [condicoes,setCondicoes]=useState<Condicao[]>([]);
  const [mensalidades,setMensalidades]=useState<Mensalidade[]>([]);
  const [inscricaoId,setInscricaoId]=useState('');
  const [pessoaVinculoId,setPessoaVinculoId]=useState<string|null>(null);
  const [rascunhoVinculoPendente,setRascunhoVinculoPendente]=useState(false);
  const [operacaoVinculoEmCurso,setOperacaoVinculoEmCurso]=useState(false);
  const [turmaId,setTurmaId]=useState('');
  const [pessoaExistenteId,setPessoaExistenteId]=useState('');
  const [valorBase,setValorBase]=useState('30000');
  const [bolsa,setBolsa]=useState<Condicao['bolsa']>('nenhuma');
  const [valorOutro,setValorOutro]=useState('');
  const [edicoes,setEdicoes]=useState<Record<string,EdicaoTurma>>({});
  const [carregando,setCarregando]=useState(true);
  const [gravando,setGravando]=useState(false);
  const [erro,setErro]=useState('');
  const [mensagem,setMensagem]=useState('');
  const [popup,setPopup]=useState<Popup>(null);
  const [buscaCadastro,setBuscaCadastro]=useState('');
  const [filtroCadastroTurma,setFiltroCadastroTurma]=useState('');
  const [buscaMensalidade,setBuscaMensalidade]=useState('');
  const [filtroMensalidadeTurma,setFiltroMensalidadeTurma]=useState('');
  const [periodo,setPeriodo]=useState(competenciaHoje);
  const [fichaChave,setFichaChave]=useState<string|null>(null);
  const [contratoDestinatario,setContratoDestinatario]=useState('');
  const [professorNomeNovo,setProfessorNomeNovo]=useState('');
  const [professorEmailNovo,setProfessorEmailNovo]=useState('');
  const [professorWhatsappNovo,setProfessorWhatsappNovo]=useState('');
  const pendenteCadastro=Boolean(inscricaoId||turmaId||pessoaExistenteId||bolsa!=='nenhuma'||valorBase!=='30000'||valorOutro||Object.keys(edicoes).length);
  const pendente=pendenteCadastro||rascunhoVinculoPendente||operacaoVinculoEmCurso;
  useEffect(()=>{onRascunhoPendenteChange?.(pendente);return()=>onRascunhoPendenteChange?.(false);},[pendente,onRascunhoPendenteChange]);

  const carregar=useCallback(async()=>{
    if(!podeGerir){setErro('A Coordenação autorizada precisa acessar esta área.');setCarregando(false);return;}
    setCarregando(true);setErro('');
    try{
      const sync=await supabase.rpc('educart_sincronizar_mensalidades_simples_dev');
      if(sync.error)throw sync.error;
      const [i,p,m,t,d,c,v]=await Promise.all([
        supabase.from('inscricoes_oficina').select('id,nome_completo,email,telefone_whatsapp,status').order('created_at',{ascending:false}).limit(1001),
        supabase.from('pessoas').select('id,nome_completo,email,telefone').order('nome_completo').limit(1001),
        supabase.from('matriculas').select('id,pessoa_id,turma_id,candidatura_id,situacao').limit(1001),
        supabase.from('turmas').select('id,codigo,docente_id,local_nome,situacao').order('codigo').limit(1001),
        supabase.from('educart_docentes_dev').select('id,nome_completo,nome_artistico,situacao').order('nome_completo').limit(1001),
        supabase.from('educart_condicoes_mensalidade_dev').select('matricula_id,valor_base_centavos,bolsa,valor_devido_centavos,primeira_competencia').limit(1001),
        supabase.from('mensalidades_formacao').select('id,matricula_id,competencia,valor_centavos,status').order('competencia',{ascending:false}).limit(1001),
      ]);
      if([i,p,m,t,d,c,v].some(x=>x.error))throw Error('Consulta incompleta ou sem permissão. Nenhum registro foi alterado.');
      if([i,p,m,t,d,c,v].some(x=>(x.data??[]).length>1000))
        throw Error('Há mais de 1.000 registros numa lista. Paginação necessária antes de operar, para não ocultar pessoas ou mensalidades.');
      setInscricoes((i.data??[]) as Inscricao[]);
      setPessoas((p.data??[]) as Pessoa[]);
      setMatriculas((m.data??[]) as Matricula[]);
      setTurmas((t.data??[]) as Turma[]);
      setDocentes((d.data??[]) as Docente[]);
      setCondicoes((c.data??[]) as Condicao[]);
      setMensalidades((v.data??[]) as Mensalidade[]);
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível carregar a gestão simples.');}
    finally{setCarregando(false);}
  },[supabase,podeGerir]);
  useEffect(()=>{void carregar();},[carregar]);

  const inscricao=inscricoes.find(x=>x.id===inscricaoId);
  const possiveisPessoas=useMemo(()=>!inscricao?[]:pessoas.filter(p=>
    (normalizar(inscricao.email)!==''&&normalizar(p.email)===normalizar(inscricao.email))||
    (digitos(inscricao.telefone_whatsapp)!==''&&digitos(p.telefone)===digitos(inscricao.telefone_whatsapp))
  ),[pessoas,inscricao]);
  const candidaturasDisponiveis=inscricoes.filter(i=>podeMatricularCadastro(
    i.status,matriculas.some(m=>m.candidatura_id===i.id)));
  const turmasReais=turmas.filter(t=>/^T[1-5]$/.test(t.codigo));
  const professoresAtivos=docentes.filter(d=>d.situacao==='ativo');
  const valorOutroCentavos=Math.round(Number(valorOutro.trim().replace(',','.'))*100);
  const devido=bolsa==='integral'?0:bolsa==='meia'?Number(valorBase)/2:bolsa==='outra'?valorOutroCentavos:Number(valorBase);
  const grupoMatriculas=matriculas.filter(m=>condicoes.some(c=>c.matricula_id===m.id));
  const nomePessoa=(id:string)=>pessoas.find(x=>x.id===id)?.nome_completo??'Pessoa não localizada';
  const nomeTurma=(id:string)=>turmas.find(x=>x.id===id)?.codigo??'Turma não localizada';
  const professorNome=(id:string|null)=>docentes.find(d=>d.id===id)?.nome_artistico||
    docentes.find(d=>d.id===id)?.nome_completo||'Professor não localizado';
  const limpar=()=>{setInscricaoId('');setTurmaId('');setPessoaExistenteId('');setBolsa('nenhuma');setValorBase('30000');setValorOutro('');};
  const salvarMatricula=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(gravando||!podeGerir||!inscricaoId||!turmaId)return;
    if(possiveisPessoas.length>0&&!pessoaExistenteId){setErro('Confira e selecione a pessoa já cadastrada.');return;}
    if(bolsa==='outra'&&(!Number.isInteger(valorOutroCentavos)||valorOutroCentavos<=0||valorOutroCentavos>=Number(valorBase))){
      setErro('Na bolsa “Outro”, informe quanto será pago por mês, abaixo do valor cheio.');return;
    }
    setGravando(true);setErro('');setMensagem('');
    try{
      const {error}=await supabase.rpc('educart_matricular_simples_dev',{
        p_inscricao_id:inscricaoId,p_turma_id:turmaId,
        p_valor_base_centavos:Number(valorBase),p_bolsa:bolsa,
        p_valor_outro_centavos:bolsa==='outra'?valorOutroCentavos:null,
        p_pessoa_existente_id:pessoaExistenteId||null,
      });
      if(error)throw error;
      limpar();
      await carregar();
      setBuscaMensalidade(inscricao?.nome_completo??'');
      setFiltroMensalidadeTurma('');
      setPeriodo(competenciaHoje());
      setPopup('mensalidades');
      setMensagem('Matrícula concluída. Mensalidade registrada como pendente, ou isenta se houver bolsa integral.');
    }catch(e){setErro(e instanceof Error?e.message:'Matrícula recusada. Verifique o cadastro antes de repetir.');}
    finally{setGravando(false);}
  };
  const editarTurma=(id:string,t:Turma,patch:Partial<EdicaoTurma>)=>{
    setEdicoes(prev=>({...prev,[id]:{docente_id:prev[id]?.docente_id??t.docente_id??'',
      local_nome:prev[id]?.local_nome??t.local_nome??'',...patch}}));
  };
  const salvarTurma=async(t:Turma)=>{
    const ed=edicoes[t.id];
    if(!ed||!ed.docente_id||!LOCAIS.some(x=>x===ed.local_nome)){setErro('Escolha professor ativo e local da turma.');return;}
    setGravando(true);setErro('');setMensagem('');
    try{
      const {error}=await supabase.from('turmas')
        .update({docente_id:ed.docente_id,local_nome:ed.local_nome})
        .eq('id',t.id).select('id').single();
      if(error)throw error;
      setEdicoes(prev=>{const next={...prev};delete next[t.id];return next;});
      await carregar();setMensagem('Professor e local da turma atualizados no DEV.');
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível atualizar a turma.');}
    finally{setGravando(false);}
  };
  const alterarPagamento=async(m:Matricula,v:Mensalidade,pago:boolean)=>{
    if(gravando||!podeGerir)return;
    const condicao=condicoes.find(x=>x.matricula_id===m.id);
    if(!podeRegistrarPagamento(m.situacao,v.status,condicao?.valor_devido_centavos)){
      setErro('Esta matrícula ou competência não permite alteração de pagamento. Atualize a lista e confira o vínculo.');
      return;
    }
    if(v.status==='pago'&&!pago&&!window.confirm('Alterar esta mensalidade de paga para pendente?'))return;
    setGravando(true);setErro('');setMensagem('');
    try{
      const {error}=await supabase.rpc('educart_definir_pagamento_simples_dev',{
        p_matricula_id:m.id,p_competencia:v.competencia,p_pago:pago,
      });
      if(error)throw error;
      await carregar();
      setMensagem('Mensalidade de '+mes(v.competencia)+' marcada como '+(pago?'paga.':'pendente.'));
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível alterar o pagamento.');}
    finally{setGravando(false);}
  };


  // Os cadastros do site e as pessoas já existentes compartilham o mesmo banco.
  // Não se cria uma ficha incompleta na secretaria: o formulário público oficial recebe o cadastro.
  const contatos=useMemo<ContatoView[]>(()=>{
    const lista:ContatoView[]=[];
    const pessoasPorId=new Map(pessoas.map(x=>[x.id,x]));
    for(const i of inscricoes){
      const m=matriculas.find(x=>x.candidatura_id===i.id)??null;
      const p=m?pessoasPorId.get(m.pessoa_id):null;
      lista.push({key:'i:'+i.id,nome:i.nome_completo,email:i.email||p?.email||null,
        telefone:i.telefone_whatsapp||p?.telefone||null,inscricaoId:i.id,pessoaId:m?.pessoa_id??null,matricula:m});
    }
    for(const p of pessoas){
      if(lista.some(c=>c.matricula?.pessoa_id===p.id))continue;
      const m=matriculas.find(x=>x.pessoa_id===p.id)??null;
      lista.push({key:'p:'+p.id,nome:p.nome_completo,email:p.email,telefone:p.telefone,
        inscricaoId:null,pessoaId:p.id,matricula:m});
    }
    return lista;
  },[inscricoes,pessoas,matriculas]);
  const contatoSelecionado=contatos.find(c=>c.key===fichaChave)??null;
  const contatoContrato=contatos.find(c=>c.key===contratoDestinatario)??null;
  const cadastroVisiveis=contatos.filter(c=>{
    const termo=normalizar(buscaCadastro),numero=digitos(buscaCadastro);
    const encontrou=!termo||[c.nome,c.email??'',c.telefone??''].some(v=>normalizar(v).includes(termo))
      ||(numero.length>=4&&digitos(c.telefone).includes(numero));
    return encontrou&&(!filtroCadastroTurma||c.matricula?.turma_id===filtroCadastroTurma);
  });
  const mesSelecionado=periodo+'-01';
  const cobrancasVisiveis=grupoMatriculas.filter(m=>{
    const c=contatos.find(c=>c.matricula?.id===m.id);
    const nome=c?.nome??nomePessoa(m.pessoa_id),email=c?.email??'',
      telefone=c?.telefone??'';
    const termo=normalizar(buscaMensalidade),numero=digitos(buscaMensalidade);
    return (!filtroMensalidadeTurma||m.turma_id===filtroMensalidadeTurma)&&
      (!termo||[nome,email,telefone].some(v=>normalizar(v).includes(termo))||
        (numero.length>=4&&digitos(telefone).includes(numero)));
  });
  const alterarMes=(d:number)=>setPeriodo(s=>proximoMesSeguro(s,d,competenciaHoje()));
  const mudarPopup=(destino:Popup)=>{
    if(gravando||operacaoVinculoEmCurso)return;
    if(popup==='matricular'&&destino!=='matricular'&&pendenteCadastro){
      if(!window.confirm('Descartar os campos desta matrícula ainda não confirmada?'))return;
      limpar();
    }
    if(popup==='turmas'&&destino!=='turmas'&&Object.keys(edicoes).length>0){
      if(!window.confirm('Descartar ajustes de turmas ainda não salvos?'))return;
      setEdicoes({});
    }
    if(popup==='vincularPessoa'&&destino!=='vincularPessoa'){
      if(rascunhoVinculoPendente&&!window.confirm('Descartar o vínculo acadêmico ainda não salvo?'))return;
      setRascunhoVinculoPendente(false);
      setPessoaVinculoId(null);
      // Uma matrícula salva pelo fluxo R12 precisa aparecer imediatamente nos cartões.
      void carregar();
    }
    setErro('');setMensagem('');setPopup(destino);
  };
  const botaoMatricular=(c:ContatoView)=>{
    const vinculoAtual=Boolean(c.pessoaId&&matriculas.some(m=>
      m.pessoa_id===c.pessoaId&&!/(conclu|cancelad|desist|trancad|encerrad|inativ)/i.test(m.situacao)));
    const origem= c.inscricaoId?inscricoes.find(i=>i.id===c.inscricaoId):null;
    const disponivel=origem&&podeMatricularCadastro(origem.status,Boolean(c.matricula)||vinculoAtual);
    if(origem){
      return <button type="button" className={'admin-btn '+(disponivel?'admin-btn-primary':'admin-btn-vinculo-inativo')}
        disabled={!disponivel||gravando} title={disponivel?'Matricular inscrição em turma com condição financeira':
          c.matricula||vinculoAtual?'Já existe vínculo acadêmico':'Inscrição cancelada ou já matriculada'}
        onClick={()=>{if(!disponivel)return;setInscricaoId(origem.id);mudarPopup('matricular');}}>
        {disponivel?'Matricular':c.matricula||vinculoAtual?'Já vinculado':'Indisponível'}
      </button>;
    }
    if(!c.pessoaId)return null;
    return <button type="button" className={'admin-btn '+(vinculoAtual?'admin-btn-vinculo-inativo':'admin-btn-primary')}
      disabled={vinculoAtual||gravando} title={vinculoAtual?'Esta pessoa já possui vínculo acadêmico atual':
        'Vincular pessoa à turma; condições financeiras são registradas separadamente'}
      onClick={()=>{if(vinculoAtual)return;setPessoaVinculoId(c.pessoaId);mudarPopup('vincularPessoa');}}>
      {vinculoAtual?'Já vinculado':'Matricular'}
    </button>;
  };
  const contatoBotoes=(c:ContatoView,contrato=false)=>{
    const mensagemContrato='Olá, '+c.nome+'! Vou encaminhar a minuta institucional da EducART em PDF para sua leitura e conferência.';
    const wa=waLink(c.telefone,contrato?mensagemContrato:undefined);
    const email=mailLink(c.email,contrato?'Minuta contratual EducART':undefined,contrato?mensagemContrato:undefined);
    return <div className="educart-popup-contatos">
      {wa?<a className="admin-btn admin-btn-secondary" href={wa} target="_blank" rel="noopener noreferrer">{contrato?'Compartilhar contrato por WhatsApp':'Contatar pelo WhatsApp'}</a>:<span className="admin-btn admin-btn-secondary" aria-disabled="true">WhatsApp não cadastrado</span>}
      {email?<a className="admin-btn admin-btn-secondary" href={email}>{contrato?'Compartilhar contrato por e-mail':'Contatar por e-mail'}</a>:<span className="admin-btn admin-btn-secondary" aria-disabled="true">E-mail não cadastrado</span>}
    </div>;
  };
  const cadastrarProfessor=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(gravando||!podeGerir||professorNomeNovo.trim().length<3)return;
    if(docentes.some(d=>normalizar(d.nome_completo)===normalizar(professorNomeNovo))){
      setErro('Já existe professor com esse nome. Confira a lista antes de duplicar.');return;
    }
    setGravando(true);setErro('');setMensagem('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      if(authError||!user||user.is_anonymous)throw Error('Sessão de Coordenação inválida.');
      const {error}=await supabase.from('educart_docentes_dev').insert({
        nome_completo:professorNomeNovo.trim(),email:professorEmailNovo.trim()||null,
        whatsapp:professorWhatsappNovo.trim()||null,situacao:'ativo',criado_por:user.id,
      }).select('id').single();
      if(error)throw error;
      setProfessorNomeNovo('');setProfessorEmailNovo('');setProfessorWhatsappNovo('');
      await carregar();
      setPopup('turmas');
      setMensagem('Professor cadastrado como ativo no DEV. Agora você pode associá-lo à turma.');
    }catch(e){setErro(e instanceof Error?e.message:'Não foi possível cadastrar o professor.');}
    finally{setGravando(false);}
  };


  return <section className="admin-academico educart-popup-work" aria-label="Matrículas e mensalidades simples da EducART">
    <div className="admin-header-row"><div>
      <span className="admin-kicker">EDUCART 1.1 · SUPABASE DEV</span>
      <h1 className="admin-page-title">Gestão da EducART<span className="admin-title-accent">.</span></h1>
      <p className="admin-page-desc">Cadastro → matrícula → mensalidade. Professor e local por turma, sem rolagem interminável.</p>
    </div><button type="button" className="admin-btn admin-btn-secondary" onClick={()=>mudarPopup('contrato')}>▤ Contrato</button></div>
    {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
    {mensagem&&<p role="status" className="admin-academico-message">{mensagem}</p>}
    {carregando&&<p role="status">Consultando registros autorizados do DEV…</p>}
    {!carregando&&podeGerir&&<>
      <div className="educart-popup-resumo" role="group" aria-label="Panorama básico">
        <span>Cadastros <strong>{contatos.length}</strong></span>
        <span>Matrículas simples <strong>{grupoMatriculas.length}</strong></span>
        <span>Turmas <strong>{turmasReais.length}</strong></span>
      </div>
      <div className="educart-popup-tarefas">
        {([
          ['cadastros','Cadastros recebidos','Confira as fichas do site, pesquise e contate.'],
          ['matricular','Matricular em turma','Selecione cadastro, turma, mensalidade e bolsa.'],
          ['mensalidades','Mensalidades','Escolha o mês e marque pago ou pendente.'],
          ['turmas','Turmas e professores','Associe professor e local ou cadastre docente.'],
        ] as const).map(([id,nome,desc],i)=>
          <button type="button" key={id} className="educart-popup-tarefa"
            onClick={()=>mudarPopup(id)}>
            <span className="educart-popup-tarefa-top"><b>{i+1}</b><small>ETAPA {i+1}</small></span>
            <strong>{nome}</strong><span>{desc}</span><em>Abrir janela →</em>
          </button>)}
      </div>
      <p className="admin-academico-note">Os cadastros, turmas e docentes vêm do Supabase DEV autorizado. Contatos e compartilhamentos são manuais.</p>
      {popup==='cadastros'&&<AdminRegistroModalDev titulo="1 · Cadastros recebidos" descricao="Fichas do portal e pessoas já existentes. Nada é duplicado nesta tela."
          amplo onClose={()=>mudarPopup(null)}>
        <div className="educart-popup-tools">
          <a className="admin-btn admin-btn-primary" href="/inscricao" target="_blank" rel="noopener noreferrer">Abrir ficha pública de cadastro</a>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>void carregar()} disabled={gravando}>Atualizar cadastros</button>
        </div>
        <div className="educart-popup-filtros">
          <label>Buscar por nome, telefone ou e-mail<input type="search" className="search-input" value={buscaCadastro}
            onChange={e=>setBuscaCadastro(e.target.value)} placeholder="Buscar cadastro ou estudante"/></label>
          <label>Filtrar por turma<select className="filter-select" value={filtroCadastroTurma}
            onChange={e=>setFiltroCadastroTurma(e.target.value)}>
            <option value="">Todas as turmas</option>{turmasReais.map(t=><option key={t.id} value={t.id}>{t.codigo}</option>)}
          </select></label>
        </div>
        <p className="admin-academico-note">{cadastroVisiveis.length} pessoa(s) na pesquisa</p>
        <div className="educart-popup-lista">{cadastroVisiveis.map(c=><article className="educart-popup-item" key={c.key}>
          <div><strong>{c.nome}</strong><p>{c.email??c.telefone??'Sem contato'} · {c.matricula?nomeTurma(c.matricula.turma_id)+' · '+(c.matricula.situacao==='ativa'?'Matriculado':c.matricula.situacao):'Aguardando matrícula'}</p></div>
          <div className="educart-popup-contatos">
            <button type="button" className="admin-btn admin-btn-secondary"
              onClick={()=>{setFichaChave(c.key);mudarPopup('ficha');}}>Ver ficha</button>
            {botaoMatricular(c)}
          </div>
          {contatoBotoes(c)}
        </article>)}</div>
        {!cadastroVisiveis.length&&<p>Nenhum cadastro correspondente aos filtros.</p>}
      </AdminRegistroModalDev>}
      {popup==='matricular'&&<AdminRegistroModalDev titulo="2 · Matricular em uma turma" descricao="Mesmo formulário aprovado: cadastro, turma, mensalidade e bolsa."
        amplo onClose={()=>mudarPopup(null)}>
        <form onSubmit={salvarMatricula} className="admin-academico-panel educart-ingresso-form">
          <h2>1. Transformar cadastro em aluno</h2>
          <label className="admin-academico-label" htmlFor="ingresso-inscricao">Cadastro recebido</label>
          <select id="ingresso-inscricao" className="filter-select" required value={inscricaoId}
            onChange={e=>{setInscricaoId(e.target.value);setPessoaExistenteId('');}} disabled={gravando}>
            <option value="">Escolha um cadastro ainda não matriculado</option>
            {candidaturasDisponiveis.map(i=><option value={i.id} key={i.id}>{i.nome_completo} · {i.email||i.telefone_whatsapp}</option>)}
          </select>
          {inscricao&&<p className="admin-academico-note">Cadastro existente: {inscricao.nome_completo}. A ficha original será preservada.</p>}
          {possiveisPessoas.length>0&&<>
            <label className="admin-academico-label" htmlFor="ingresso-pessoa">Possível cadastro da mesma pessoa — confira</label>
            <select id="ingresso-pessoa" className="filter-select" required value={pessoaExistenteId}
              onChange={e=>setPessoaExistenteId(e.target.value)} disabled={gravando}>
              <option value="">Escolha a pessoa correta</option>
              {possiveisPessoas.map(p=><option key={p.id} value={p.id}>{p.nome_completo} · {p.email??p.telefone??''}</option>)}
            </select>
          </>}
          <label className="admin-academico-label" htmlFor="ingresso-turma">Turma</label>
          <select id="ingresso-turma" className="filter-select" required value={turmaId}
            onChange={e=>setTurmaId(e.target.value)} disabled={gravando}>
            <option value="">Selecione a turma</option>
            {turmasReais.filter(t=>['aberta','em_andamento','planejada'].includes(t.situacao)).map(t=>
              <option key={t.id} value={t.id}>{t.codigo} · {t.local_nome??'Local pendente'} · {professorNome(t.docente_id)}</option>)}
          </select>
          <label className="admin-academico-label" htmlFor="ingresso-valor">Mensalidade normal</label>
          <select id="ingresso-valor" className="filter-select" value={valorBase} onChange={e=>setValorBase(e.target.value)} disabled={gravando}>
            <option value="28000">R$ 280,00</option><option value="30000">R$ 300,00</option><option value="32000">R$ 320,00</option>
          </select>
          <fieldset className="educart-ingresso-bolsas">
            <legend className="admin-academico-label">Bolsa</legend>
            {([['nenhuma','Sem bolsa'],['integral','Bolsa integral'],['meia','Meia bolsa'],['outra','Outra bolsa']] as const).map(([value,label])=>
              <label key={value}><input type="radio" name="ingresso-bolsa" value={value} checked={bolsa===value}
                onChange={()=>setBolsa(value)} disabled={gravando}/> {label}</label>)}
          </fieldset>
          {bolsa==='outra'&&<>
            <label className="admin-academico-label" htmlFor="ingresso-outro">Quanto o aluno pagará por mês? (R$)</label>
            <input id="ingresso-outro" className="search-input admin-academico-input" required inputMode="decimal"
              value={valorOutro} onChange={e=>setValorOutro(e.target.value)} placeholder="Ex.: 200,00" disabled={gravando}/>
          </>}
          <p className="educart-ingresso-total">Mensalidade a pagar: <strong>{Number.isFinite(devido)?dinheiro(devido):'Defina o valor'}</strong>
            {bolsa==='integral'?' · Isenta':''}</p>
          <button className="admin-btn admin-btn-primary" type="submit" disabled={gravando||!inscricaoId||!turmaId}>
            {gravando?'Salvando…':'Confirmar matrícula'}
          </button>
          {!candidaturasDisponiveis.length&&<p className="admin-academico-note">Nenhum cadastro disponível para nova matrícula nesta base.</p>}
        </form>
      </AdminRegistroModalDev>}
      {popup==='mensalidades'&&<AdminRegistroModalDev titulo="3 · Mensalidades por mês" descricao="Selecione a competência; pago ou pendente apenas para o mês escolhido."
        amplo onClose={()=>mudarPopup(null)}>
        <div className="educart-popup-periodo">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>alterarMes(-1)} aria-label="Mês anterior">‹</button>
          <label>Competência<input type="month" className="search-input" value={periodo}
            min="1900-01" max="2199-12"
            onChange={e=>setPeriodo(competenciaValida(e.target.value)?e.target.value:competenciaHoje())} /></label>
          <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>alterarMes(1)} aria-label="Próximo mês">›</button>
        </div>
        <div className="educart-popup-filtros">
          <label>Buscar estudante<input type="search" className="search-input" placeholder="Nome, e-mail ou telefone"
            value={buscaMensalidade} onChange={e=>setBuscaMensalidade(e.target.value)}/></label>
          <label>Filtrar por turma<select className="filter-select" value={filtroMensalidadeTurma}
            onChange={e=>setFiltroMensalidadeTurma(e.target.value)}>
            <option value="">Todas as turmas</option>{turmasReais.map(t=><option key={t.id} value={t.id}>{t.codigo}</option>)}
          </select></label>
        </div>
        <div className="educart-popup-tools"><button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>void carregar()} disabled={gravando}>Atualizar</button></div>
        {cobrancasVisiveis.map(m=>{
          const c=condicoes.find(x=>x.matricula_id===m.id);
          const contato=contatos.find(x=>x.matricula?.id===m.id);
          const v=mensalidades.find(x=>x.matricula_id===m.id&&x.competencia===mesSelecionado);
          return <article className="educart-popup-mes" key={m.id}>
            <div><strong>{contato?.nome??nomePessoa(m.pessoa_id)}</strong>
              <p>{nomeTurma(m.turma_id)} · {c?.bolsa==='integral'?'Bolsa integral · isento':dinheiro(c?.valor_devido_centavos??0)+'/mês'}</p>
              {contato&&<button type="button" className="admin-btn admin-btn-secondary"
                onClick={()=>{setFichaChave(contato.key);mudarPopup('ficha')}}>Ver ficha</button>}
            </div>
            {m.situacao!=='ativa'?<span>Vínculo {m.situacao} · somente consulta</span>:
              c?.primeira_competencia&&mesSelecionado<c.primeira_competencia?<span>Antes da matrícula</span>:
              c?.bolsa==='integral'?<span>ISENTO</span>:
              v&&!podeRegistrarPagamento(m.situacao,v.status,c?.valor_devido_centavos)?<span>Competência {v.status} · somente consulta</span>:v?
              <button type="button" disabled={gravando} className={'admin-btn '+(v.status==='pago'?'admin-btn-success':'admin-btn-secondary')}
                onClick={()=>void alterarPagamento(m,v,v.status!=='pago')}>{v.status==='pago'?'PAGO ✓':'PENDENTE · marcar pago'}</button>:
              <span>Mensalidade ainda não gerada</span>}
          </article>;
        })}
        {!cobrancasVisiveis.length&&<p className="admin-academico-note">Nenhuma matrícula encontrada no filtro escolhido.</p>}
      </AdminRegistroModalDev>}
      {popup==='turmas'&&<AdminRegistroModalDev titulo="Professores e locais das turmas"
        descricao="Confira o docente responsável e o local de cada turma no cadastro DEV."
        amplo onClose={()=>mudarPopup(null)}>
        <section className="educart-ingresso-turmas-gestao" aria-label="Professores e locais das turmas">
          <div className="educart-ingresso-turmas-topo">
            <p>{turmas.length} turma(s) cadastrada(s) · {professoresAtivos.length} professor(es) ativo(s).</p>
            <button type="button" className="admin-btn admin-btn-secondary"
              onClick={()=>mudarPopup('professor')}>+ Cadastrar professor</button>
          </div>
          <div className="educart-ingresso-turmas">{turmas.map(t=>{
            const ed=edicoes[t.id]??{docente_id:t.docente_id??'',local_nome:t.local_nome??''};
            return <article className="educart-ingresso-turma" key={t.id}>
              <div className="educart-ingresso-turma-titulo">
                <strong>Turma {t.codigo}</strong>
                <small>{t.situacao==='em_andamento'?'Em andamento':t.situacao==='planejada'?'Planejada':t.situacao==='aberta'?'Aberta':t.situacao}</small>
              </div>
              <div className="educart-ingresso-turma-campos">
                <div>
                  <label htmlFor={'ingresso-docente-'+t.id}>Professor responsável</label>
                  <select id={'ingresso-docente-'+t.id} className="filter-select" value={ed.docente_id}
                    onChange={e=>editarTurma(t.id,t,{docente_id:e.target.value})} disabled={gravando}>
                    <option value="">Escolha um professor</option>
                    {professoresAtivos.map(d=><option value={d.id} key={d.id}>{d.nome_artistico||d.nome_completo}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor={'ingresso-local-'+t.id}>Local das aulas</label>
                  <select id={'ingresso-local-'+t.id} className="filter-select" value={ed.local_nome}
                    onChange={e=>editarTurma(t.id,t,{local_nome:e.target.value})} disabled={gravando}>
                    <option value="">Escolha o local</option>
                    {LOCAIS.map(l=><option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              {edicoes[t.id]&&<div className="educart-ingresso-turma-acoes">
                <button type="button" className="admin-btn admin-btn-primary"
                  disabled={gravando} onClick={()=>void salvarTurma(t)}>
                  {gravando?'Salvando...':'Salvar alterações desta turma'}
                </button>
              </div>}
            </article>;
          })}</div>
          {!turmas.length&&<p role="status">Nenhuma turma disponível neste cadastro.</p>}
        </section>
      </AdminRegistroModalDev>}
      {popup==='professor'&&<AdminRegistroModalDev titulo="Cadastrar professor" descricao="Cadastro autorizado da Coordenação; professor ativo para seleção nas turmas."
        onClose={()=>mudarPopup('turmas')}>
        <form className="educart-popup-form" onSubmit={cadastrarProfessor}>
          <label>Nome do professor<input className="search-input" required minLength={3} maxLength={150}
            value={professorNomeNovo} onChange={e=>setProfessorNomeNovo(e.target.value)} /></label>
          <label>E-mail (opcional)<input type="email" className="search-input" value={professorEmailNovo}
            onChange={e=>setProfessorEmailNovo(e.target.value)} /></label>
          <label>WhatsApp (opcional)<input type="tel" className="search-input" value={professorWhatsappNovo}
            onChange={e=>setProfessorWhatsappNovo(e.target.value)} /></label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={gravando}>Salvar professor</button>
        </form>
      </AdminRegistroModalDev>}
      {popup==='ficha'&&contatoSelecionado&&<AdminRegistroModalDev titulo="Ficha do cadastro ou estudante" descricao="Dados existentes e condição de matrícula, sem recadastro."
        onClose={()=>mudarPopup('cadastros')}>
        <dl className="educart-popup-ficha">
          <div><dt>Nome</dt><dd>{contatoSelecionado.nome}</dd></div>
          <div><dt>WhatsApp</dt><dd>{contatoSelecionado.telefone??'Não informado'}</dd></div>
          <div><dt>E-mail</dt><dd>{contatoSelecionado.email??'Não informado'}</dd></div>
          <div><dt>Situação</dt><dd>{contatoSelecionado.matricula?(contatoSelecionado.matricula.situacao==='ativa'?'Matriculado':'Vínculo '+contatoSelecionado.matricula.situacao):'Aguardando matrícula'}</dd></div>
          {contatoSelecionado.matricula&&(()=>{
            const m=contatoSelecionado.matricula;
            const c=condicoes.find(x=>x.matricula_id===m.id);
            return <><div><dt>Turma</dt><dd>{nomeTurma(m.turma_id)}</dd></div>
              <div><dt>Local</dt><dd>{turmas.find(t=>t.id===m.turma_id)?.local_nome??'Não registrado'}</dd></div>
              <div><dt>Mensalidade</dt><dd>{c?dinheiro(c.valor_base_centavos):'Não configurada'}</dd></div>
              <div><dt>Bolsa</dt><dd>{c?.bolsa==='integral'?'Integral':c?.bolsa==='meia'?'Meia':c?.bolsa==='outra'?'Outra':'Sem bolsa'}</dd></div>
              <div><dt>Valor mensal devido</dt><dd>{c?dinheiro(c.valor_devido_centavos):'Não configurado'}</dd></div></>;
          })()}
        </dl>
        {contatoBotoes(contatoSelecionado)}
        <div className="educart-popup-tools">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>{
            setContratoDestinatario(contatoSelecionado.key);mudarPopup('contrato');
          }}>Contrato</button>
          {botaoMatricular(contatoSelecionado)}
          {contatoSelecionado.matricula&&<button type="button" className="admin-btn admin-btn-primary" onClick={()=>{
            setBuscaMensalidade(contatoSelecionado.nome);setFiltroMensalidadeTurma('');mudarPopup('mensalidades');
          }}>Ver mensalidades</button>}
        </div>
        {contatoSelecionado.matricula&&<div className="educart-popup-historico">
          <h3>Últimas competências registradas</h3>
          {mensalidades.filter(v=>v.matricula_id===contatoSelecionado.matricula?.id).slice(0,3).map(v=>
            <div key={v.id}><span>{mes(v.competencia)}</span><strong>{v.status==='pago'?'Pago':v.status==='pendente'?'Pendente':v.status}</strong></div>)}
        </div>}
      </AdminRegistroModalDev>}
      {popup==='vincularPessoa'&&pessoaVinculoId&&<AdminRegistroModalDev
        titulo={'Matricular na turma · '+(pessoas.find(p=>p.id===pessoaVinculoId)?.nome_completo??'Pessoa cadastrada')}
        descricao="Vínculo acadêmico no cadastro existente · Supabase DEV · sem cobrança automática"
        onClose={()=>mudarPopup('cadastros')} amplo cadastro>
        <AdminVincularEstudanteTurmaDev key={pessoaVinculoId} supabase={supabase} podeGerir={podeGerir}
          pessoaInicialId={pessoaVinculoId}
          onRascunhoPendenteChange={setRascunhoVinculoPendente}
          onOperacaoEmCursoChange={setOperacaoVinculoEmCurso}/>
      </AdminRegistroModalDev>}
      {popup==='contrato'&&<AdminRegistroModalDev titulo="Contrato · minuta institucional" descricao="Minuta existente para conferência; não é assinatura ou aceite."
        onClose={()=>mudarPopup(null)}>
        <p className="admin-academico-note">Documento para revisão institucional. O acesso depende das permissões do Google Drive.</p>
        <div className="educart-popup-tools"><a className="admin-btn admin-btn-primary" href={CONTRATO_URL} target="_blank" rel="noopener noreferrer">Abrir minuta no Google Drive ↗</a><a className="admin-btn admin-btn-secondary" href="https://drive.google.com/uc?export=download&id=1Cn_YIAHq8ZtcbY2foIM2ioz7ugVv5TZk" target="_blank" rel="noopener noreferrer">Baixar PDF para anexar</a></div>
        <label className="admin-academico-label" htmlFor="educart-contrato-destinatario">Compartilhar com cadastro ou estudante</label>
        <select id="educart-contrato-destinatario" className="filter-select" value={contratoDestinatario}
          onChange={e=>setContratoDestinatario(e.target.value)}>
          <option value="">Selecione a pessoa</option>
          {contatos.map(c=><option key={c.key} value={c.key}>{c.nome}{c.matricula?' · estudante':' · cadastro'}</option>)}
        </select>
        {contatoContrato&&contatoBotoes(contatoContrato,true)}
        <p className="admin-academico-note" role="note">Esta minuta está privada no Drive: o link de leitura não abre necessariamente para famílias. Baixe o PDF, anexe-o manualmente no WhatsApp ou e-mail e confira antes de enviar. Nenhuma mensagem é disparada automaticamente.</p>
      </AdminRegistroModalDev>}
    </>}
  </section>;
}
