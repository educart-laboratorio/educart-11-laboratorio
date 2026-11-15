'use client';
/**
 * EducART 1.1 / R12 — vínculo acadêmico manual, individual e auditado, apenas DEV.
 * Novo ingresso gera somente vínculo acadêmico pendente; recadastramento preserva história.
 * Nenhuma dessas operações gera Pix, convite ou parcela.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminAjuda } from '@/components/AdminAjuda';
import { nomeGrupoTurma } from '@/lib/academico/nome-grupo-turma';

import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';
import { ACOES_ACADEMICAS_EXCLUSIVAS_DEV } from '@/lib/supabase/client';

type Pessoa = {id:string;nome_completo:string;email:string|null;telefone:string|null};
type Turma = {id:string;codigo:string;situacao:string;capacidade:number|null;inicio_em:string|null};
type Matricula = {id:string;pessoa_id:string;turma_id:string;situacao:string};
type ContatoInicial = {nome_completo:string;email:string|null;telefone:string|null};
type Props = {supabase:SupabaseClient;podeGerir:boolean;turmaInicialId?:string;pessoaInicialId?:string;contatoInicial?:ContatoInicial;onRascunhoPendenteChange?:(pendente:boolean)=>void;onOperacaoEmCursoChange?:(ocupado:boolean)=>void};
type Modo = 'existente'|'novo';
type Situacao = 'vinculo_pendente'|'legado_ativo';
type Origem = 'novo'|'recadastramento';
const turmaPermitida = (t:Turma)=>['planejada','aberta','em_andamento'].includes(t.situacao);
export function AdminVincularEstudanteTurmaDev({supabase,podeGerir,turmaInicialId,pessoaInicialId,contatoInicial,onRascunhoPendenteChange,onOperacaoEmCursoChange}:Props) {
  const [pessoas,setPessoas]=useState<Pessoa[]>([]);
  const [turmas,setTurmas]=useState<Turma[]>([]);
  const [matriculas,setMatriculas]=useState<Matricula[]>([]);
  const [modo,setModo]=useState<Modo>(contatoInicial&&!pessoaInicialId?'novo':'existente');
  const [turmaId,setTurmaId]=useState(turmaInicialId??'');
  const [inicioTurma,setInicioTurma]=useState('');
  const [referenciaTurma,setReferenciaTurma]=useState('');
  const [confirmeiTurma,setConfirmeiTurma]=useState(false);
  const [ativandoTurma,setAtivandoTurma]=useState(false);
  const [pessoaId,setPessoaId]=useState(pessoaInicialId??'');
  const [visualizarPessoaId,setVisualizarPessoaId]=useState<string|null>(null);
  const [buscaPessoa,setBuscaPessoa]=useState('');
  const [nome,setNome]=useState(contatoInicial?.nome_completo??'');
  const [email,setEmail]=useState(contatoInicial?.email??'');
  const [telefone,setTelefone]=useState(contatoInicial?.telefone??'');
  const [nascimento,setNascimento]=useState('');
  const [situacao,setSituacao]=useState<Situacao>('vinculo_pendente');
  const [origem,setOrigem]=useState<Origem>(contatoInicial&&!pessoaInicialId?'novo':'recadastramento');
  const [ingresso,setIngresso]=useState('');
  const [referencia,setReferencia]=useState('');
  const [identidadeConferida,setIdentidadeConferida]=useState(false);
  const [documentoConferido,setDocumentoConferido]=useState(false);
  const [carregando,setCarregando]=useState(true);
  const [gravando,setGravando]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const botaoFichaRef=useRef<HTMLButtonElement>(null);
  const voltarFichaRef=useRef<HTMLButtonElement>(null);
  const rascunhoAtual=JSON.stringify({
    modo,turmaId,inicioTurma,referenciaTurma,confirmeiTurma,pessoaId,buscaPessoa,
    nome,email,telefone,nascimento,origem,situacao,ingresso,referencia,identidadeConferida,documentoConferido,
  });
  const [baseRascunho,setBaseRascunho]=useState(rascunhoAtual);
  const rascunhoPendente=rascunhoAtual!==baseRascunho;
  useEffect(()=>{onRascunhoPendenteChange?.(rascunhoPendente);},
    [rascunhoPendente,onRascunhoPendenteChange]);
  useEffect(()=>{onOperacaoEmCursoChange?.(gravando||ativandoTurma);},
    [gravando,ativandoTurma,onOperacaoEmCursoChange]);
  useEffect(()=>{
    if(!rascunhoPendente)return;
    const proteger=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',proteger);
    return()=>window.removeEventListener('beforeunload',proteger);
  },[rascunhoPendente]);
  useEffect(()=>{if(visualizarPessoaId)voltarFichaRef.current?.focus();},[visualizarPessoaId]);
  const voltarDaFicha=()=>{
    setVisualizarPessoaId(null);
    requestAnimationFrame(()=>botaoFichaRef.current?.focus());
  };
  const carregar=useCallback(async()=>{
    setCarregando(true);setErro('');
    if(!podeGerir){setCarregando(false);return;}
    const [a,b,c]=await Promise.all([
      supabase.from('pessoas').select('id,nome_completo,email,telefone').order('nome_completo'),
      supabase.from('turmas').select('id,codigo,situacao,capacidade,inicio_em').order('codigo'),
      supabase.from('matriculas').select('id,pessoa_id,turma_id,situacao'),
    ]);
    if(a.error||b.error||c.error){setErro('Não foi possível consultar pessoas, turmas ou matrículas do ambiente acadêmico.');}
    else {
      setPessoas((a.data??[]) as Pessoa[]);setTurmas((b.data??[]) as Turma[]);
      setMatriculas((c.data??[]) as Matricula[]);
    }
    setCarregando(false);
  },[supabase,podeGerir]);
  useEffect(()=>{void carregar();},[carregar]);
  const turma=turmas.find(x=>x.id===turmaId);
  const pessoa=pessoas.find(x=>x.id===pessoaId);
  const pessoasFiltradas=useMemo(()=>{
    const termo=buscaPessoa.trim().toLocaleLowerCase('pt-BR');
    const digitos=termo.replace(/\D/g,'');
    if(!termo)return pessoas;
    return pessoas.filter(p=>[p.nome_completo,p.email??'',p.telefone??''].some(valor=>
      valor.toLocaleLowerCase('pt-BR').includes(termo))||
      (digitos.length>=4&&(p.telefone??'').replace(/\D/g,'').includes(digitos)));
  },[pessoas,buscaPessoa]);
  const lista=useMemo(()=>matriculas.filter(m=>m.turma_id===turmaId),[matriculas,turmaId]);
  const jaVinculado=Boolean(modo==='existente'&&pessoaId&&lista.some(m=>m.pessoa_id===pessoaId));
  const ocupacao=lista.filter(m=>['ativa','pendente'].includes(m.situacao)).length;
  const lotada=Boolean(turma?.capacidade&&ocupacao>=turma.capacidade);
  const ativaPermitida=turma?.situacao==='em_andamento';
  const salvavel=podeGerir&&!carregando&&!gravando&&Boolean(turma)&&!lotada&&!jaVinculado&&
    (modo==='existente'?Boolean(pessoa):nome.trim().length>=3&&Boolean(email.trim()||telefone.trim()))&&
    referencia.trim().length>=12&&identidadeConferida&&
    (origem!=='novo'||(situacao==='vinculo_pendente'&&!ingresso))&&
    (situacao!=='legado_ativo'||(ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&ativaPermitida&&documentoConferido&&Boolean(ingresso)));
  const trocarModo=(v:Modo)=>{setModo(v);setIdentidadeConferida(false);setDocumentoConferido(false);setPessoaId('');setBuscaPessoa('');};
  const reconhecerTurma=async()=>{
    if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV||!podeGerir||!turmaId||ativandoTurma||gravando||!confirmeiTurma||
       referenciaTurma.trim().length<12||!inicioTurma)return;
    setAtivandoTurma(true);setErro('');setSucesso('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const roles=!authError&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];
      if(!roles.includes('coordenacao'))throw Error('Reconhecimento de turma é restrito à Coordenação.');
      const {data,error}=await supabase.rpc('educart_r12_ativar_turma_historica_dev',{
        p_turma_id:turmaId,p_inicio_declarado:inicioTurma,
        p_referencia:referenciaTurma.trim(),p_confirmei_documentos:true,
      });
      if(error||!data)throw Error('Banco recusou ativação de turma. Confira data original, situação e documentos.');
      await carregar();
      setReferenciaTurma('');setConfirmeiTurma(false);
      setSucesso('Turma reconhecida como em andamento com auditoria. Agora você pode cadastrar estudantes antigos confirmados.');
    }catch(x){setErro(x instanceof Error?x.message:'Não foi possível atualizar a situação da turma.');}
    finally{setAtivandoTurma(false);}
  };
  const vincular=async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();if(!salvavel)return;
    setGravando(true);setErro('');setSucesso('');
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=!authError&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];
      if(!papeis.includes('coordenacao'))throw new Error('A Coordenação autorizada é obrigatória para este vínculo.');
      const {data,error}=await supabase.rpc('educart_r12_vincular_estudante_turma_dev',{
        p_turma_id:turmaId,
        p_pessoa_existente_id:modo==='existente'?pessoaId:null,
        p_nome_completo:modo==='novo'?nome.trim():null,
        p_email:modo==='novo'?email.trim():null,
        p_telefone:modo==='novo'?telefone.trim():null,
        p_nascimento:modo==='novo'&&nascimento?nascimento:null,
        p_tipo_vinculo:origem==='novo'?'novo_pendente':situacao,
        p_ingresso_em:ingresso||null,
        p_referencia_conferencia:referencia.trim(),
        p_confirmei_identidade:identidadeConferida,
        p_confirmei_documentos:situacao==='legado_ativo'&&documentoConferido,
      });
      const registro=Array.isArray(data)?data[0]:null;
      if(error||!registro?.matricula_id)throw new Error(
        'O banco recusou o vínculo. Verifique identidade, vagas, duplicidade, datas e referência.');
      await carregar();
      setSucesso('Vínculo individual salvo no '+(ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD')+' como '+registro.situacao+
        ' · origem '+(origem==='novo'?'novo ingresso':'recadastramento')+
        '. Não foram gerados pagamento, dívida, convite nem e-mail.');
      setPessoaId('');setNome('');setEmail('');setTelefone('');setNascimento('');
      setReferencia('');setIngresso('');setDocumentoConferido(false);setIdentidadeConferida(false);
      // Após uma gravação confirmada, preservar turma/modo e tomar o formulário limpo como referência.
      setBaseRascunho(JSON.stringify({modo,turmaId,inicioTurma,referenciaTurma,confirmeiTurma,
        pessoaId:'',buscaPessoa,nome:'',email:'',telefone:'',nascimento:'',origem,situacao,
        ingresso:'',referencia:'',identidadeConferida:false,documentoConferido:false}));
    }catch(x){setErro(x instanceof Error?x.message:'Falha na vinculação; revise antes de repetir.');}
    finally{setGravando(false);}
  };
  const visualizada=pessoas.find(p=>p.id===visualizarPessoaId);
  return <section aria-label="Adicionar estudante à turma" className="admin-academico-panel admin-r12-vinculo">
    <span className="admin-kicker">SECRETARIA / COORDENAÇÃO · R12 · SUPABASE {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD'}</span>
    <h2>Adicionar estudante à turma <AdminAjuda titulo="Adicionar estudante à turma"
      descricao="Vincule pessoa cadastrada, cadastre novo aluno pendente ou recadastre estudante antigo sem cobrança."
      passos="Confira o perfil, escolha a turma, indique o tipo de vínculo, documente a origem e confirme."
      cuidado="Novo ingresso cria só vínculo pendente; inscrição e matrícula Pix/bolsa seguem fluxos próprios." /></h2>
    <p>Cadastro individual e auditado. Novo ingresso cria somente vínculo pendente; inscrição e matrícula financeira preservam seus fluxos. Confira identidade e turma.</p>
    {!podeGerir&&<p role="note">É necessário papel administrativo de Coordenação para gravar vínculos.</p>}
    {carregando&&<p role="status">Consultando turmas e vínculos...</p>}
    {!carregando&&!turmas.some(turmaPermitida)&&<p role="alert">Não há turmas elegíveis para vínculo no DEV. Nenhuma matrícula será criada.</p>}
    {!carregando&&modo==='existente'&&!pessoas.length&&<p role="status">Nenhum cadastro de pessoa disponível para seleção neste acesso.</p>}
    {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
    {sucesso&&<p role="status" className="admin-academico-message">{sucesso}</p>}
    <form onSubmit={vincular} className="admin-academico-panel"
      style={visualizada?{display:'none'}:undefined}>
      <fieldset className="admin-academico-panel">
        <legend className="admin-academico-label">1. Quem será vinculado?</legend>
        <label className="admin-academico-check">
          <input type="radio" name="r12-modo-pessoa" checked={modo==='existente'}
            onChange={()=>trocarModo('existente')} disabled={gravando}/>
          Selecionar cadastro existente
        </label>
        <label className="admin-academico-check">
          <input type="radio" name="r12-modo-pessoa" checked={modo==='novo'}
            onChange={()=>trocarModo('novo')} disabled={gravando}/>
          {origem==='novo'?'Cadastrar novo aluno sem perfil':'Recadastrar estudante antigo sem perfil'}
        </label>
        {modo==='existente'?<>
          <label className="admin-academico-label" htmlFor="r12-busca-pessoa">Pesquisar cadastro existente</label>
          <input id="r12-busca-pessoa" type="search" className="search-input admin-academico-input"
            placeholder="Nome, e-mail ou telefone" value={buscaPessoa}
            onChange={e=>setBuscaPessoa(e.target.value)} disabled={gravando||!podeGerir}/>
          <p className="admin-academico-note" role="status">{pessoasFiltradas.length} cadastro(s) encontrado(s) no Supabase {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD'}. A pesquisa ainda não inclui as planilhas históricas.</p>
          <label className="admin-academico-label" htmlFor="r12-pessoa">Pessoa cadastrada</label>
          <select id="r12-pessoa" required className="filter-select" value={pessoaId}
            onChange={e=>{setPessoaId(e.target.value);setIdentidadeConferida(false);}}
            disabled={gravando||!podeGerir}>
            <option value="">Selecione a pessoa conferida</option>
            {pessoa&&!pessoasFiltradas.some(p=>p.id===pessoa.id)&&<option value={pessoa.id}>{pessoa.nome_completo} · selecionada</option>}
            {pessoasFiltradas.map(p=><option key={p.id} value={p.id}>{p.nome_completo} · {p.email??p.telefone??'sem contato'}</option>)}
          </select>
          {pessoa&&<button ref={botaoFichaRef} type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>setVisualizarPessoaId(pessoa.id)}>👁 Ver ficha da pessoa</button>}
        </>:<>
          <label className="admin-academico-label" htmlFor="r12-nome">Nome completo</label>
          <input id="r12-nome" className="search-input admin-academico-input" minLength={3} maxLength={150}
            required value={nome} onChange={e=>setNome(e.target.value)} disabled={gravando}/>
          <label className="admin-academico-label" htmlFor="r12-email">E-mail (ou telefone)</label>
          <input id="r12-email" type="email" className="search-input admin-academico-input" value={email}
            maxLength={320} onChange={e=>setEmail(e.target.value)} disabled={gravando}/>
          <label className="admin-academico-label" htmlFor="r12-telefone">Telefone (ou e-mail)</label>
          <input id="r12-telefone" className="search-input admin-academico-input" value={telefone}
            inputMode="tel" onChange={e=>setTelefone(e.target.value)} disabled={gravando}/>
          <label className="admin-academico-label" htmlFor="r12-nascimento">Nascimento (se conhecido)</label>
          <input id="r12-nascimento" type="date" className="search-input admin-academico-input" value={nascimento}
            onChange={e=>setNascimento(e.target.value)} disabled={gravando}/>
        </>}
      </fieldset>
      <fieldset className="admin-academico-panel">
        <legend className="admin-academico-label">2. Turma de destino</legend>
        <label htmlFor="r12-turma" className="admin-academico-label">Turma</label>
        <select id="r12-turma" required className="filter-select" value={turmaId}
          onChange={e=>{setTurmaId(e.target.value);setIdentidadeConferida(false);
            setInicioTurma(turmas.find(t=>t.id===e.target.value)?.inicio_em??'');
            setReferenciaTurma('');setConfirmeiTurma(false);}}
          disabled={gravando||!podeGerir||Boolean(turmaInicialId)}>
          <option value="">Escolha uma turma</option>
          {turmas.filter(turmaPermitida).map(t=><option key={t.id} value={t.id}>{nomeGrupoTurma(t.codigo)}</option>)}
        </select>
        {turma&&<p className="admin-academico-note">
          {turma.codigo} · {ocupacao} vínculo(s) ativos/pendentes
          {turma.capacidade!==null?' / '+turma.capacidade+' vagas':' · sem limite cadastrado'}
        </p>}
        {turma&&<section className="admin-academico-panel" aria-label="Vínculos da turma">
          <h3>Alunos vinculados</h3>
          {!lista.length?<p>Nenhum vínculo acadêmico registrado nesta turma.</p>:
            <ul>{lista.map(m=><li key={m.id}>
              {pessoas.find(p=>p.id===m.pessoa_id)?.nome_completo||'Identidade não localizada no acesso atual'}
              {' · '}{m.situacao.replaceAll('_',' ')}
            </li>)}</ul>}
          <p className="admin-academico-note">Vínculos existentes são preservados. Este formulário utiliza a rotina auditada R12 para adicionar; não exclui matrículas nem históricos.</p>
        </section>}
        {jaVinculado&&<p role="alert">A pessoa já possui matrícula nesta turma. Não crie outra.</p>}
        {lotada&&<p role="alert">A turma atingiu sua capacidade. Nenhum vínculo será criado.</p>}
        {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&turma&&origem==='recadastramento'&&['planejada','aberta'].includes(turma.situacao)&&
          <details className="admin-academico-panel">
            <summary style={{cursor:'pointer',fontWeight:700}}>Esta turma antiga já está em andamento?</summary>
            <p>Antes de matricular estudantes antigos como ativos, reconheça o funcionamento real da turma. Isso muda somente sua situação acadêmica no DEV, com documentação auditada. Não abre inscrições nem cria cobranças.</p>
            <label htmlFor="r12-inicio-turma" className="admin-academico-label">Data original de início da turma</label>
            <input id="r12-inicio-turma" className="search-input admin-academico-input"
              type="date" value={inicioTurma} onChange={e=>{setInicioTurma(e.target.value);setConfirmeiTurma(false);}}
              disabled={ativandoTurma||gravando}/>
            <label htmlFor="r12-ref-turma" className="admin-academico-label">Referência documental da turma (mínimo 12 caracteres)</label>
            <input id="r12-ref-turma" className="search-input admin-academico-input" maxLength={180}
              placeholder="Ex.: REGISTRO-TURMA-2025-CONFERIDO"
              value={referenciaTurma} onChange={e=>{setReferenciaTurma(e.target.value);setConfirmeiTurma(false);}}
              disabled={ativandoTurma||gravando}/>
            <label className="admin-academico-check"><input type="checkbox" checked={confirmeiTurma}
              onChange={e=>setConfirmeiTurma(e.target.checked)} disabled={ativandoTurma||gravando}/>
              Conferi que esta turma já está em andamento e que a data e a referência documental são corretas.
            </label>
            <button type="button" className="admin-btn admin-btn-secondary"
              disabled={ativandoTurma||gravando||!podeGerir||!inicioTurma||
                referenciaTurma.trim().length<12||!confirmeiTurma}
              onClick={()=>void reconhecerTurma()}>
              {ativandoTurma?'Conferindo...':'Reconhecer turma em andamento (DEV)'}
            </button>
          </details>}
      </fieldset>
      <fieldset className="admin-academico-panel">
        <legend className="admin-academico-label">3. Situação acadêmica</legend>
        {!pessoaInicialId&&!contatoInicial&&<><label className="admin-academico-check"><input type="radio" name="r12-origem"
          checked={origem==='novo'} onChange={()=>{setOrigem('novo');setSituacao('vinculo_pendente');
            setIngresso('');setDocumentoConferido(false);setIdentidadeConferida(false);}}
          disabled={gravando}/> Novo ingresso — cadastrar aluno com vínculo pendente</label>
        <label className="admin-academico-check"><input type="radio" name="r12-origem"
          checked={origem==='recadastramento'} onChange={()=>{setOrigem('recadastramento');setIdentidadeConferida(false);}}
          disabled={gravando}/> Recadastramento histórico — estudante antigo</label></>}
        {(pessoaInicialId||contatoInicial)&&<p className="admin-academico-note">Escolha a turma e confira o vínculo. Não é necessário classificar a pessoa como estudante novo ou antigo.</p>}
        {contatoInicial&&!pessoaInicialId&&<p role="note" className="admin-academico-note">Contato sem identidade vinculada: confira se já existe outro cadastro antes de criar uma nova pessoa. É possível selecionar um cadastro existente acima.</p>}
        {origem==='novo'&&<p className="admin-academico-note">Novo aluno permanece pendente, sem cobrança, ativação, convite ou reconhecimento retroativo.</p>}
        <label className="admin-academico-check"><input type="radio" name="r12-situacao"
          checked={situacao==='vinculo_pendente'} onChange={()=>{setSituacao('vinculo_pendente');setDocumentoConferido(false);}}
          disabled={gravando}/> Vínculo pendente de confirmação acadêmica</label>
        {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&origem==='recadastramento'&&<label className="admin-academico-check"><input type="radio" name="r12-situacao"
          checked={situacao==='legado_ativo'} onChange={()=>setSituacao('legado_ativo')}
          disabled={gravando||!ativaPermitida}/> Estudante antigo já em curso, com documentação conferida</label>}
        {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&turma&&!ativaPermitida&&<p className="admin-academico-note">
          Para marcar um estudante antigo como ativo, a turma deve constar como <strong>em andamento</strong>. Uma turma planejada só recebe vínculo pendente.
        </p>}
        {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&origem==='recadastramento'&&<><label htmlFor="r12-ingresso" className="admin-academico-label">Data original de ingresso (obrigatória se ativo)</label>
        <input id="r12-ingresso" type="date" className="search-input admin-academico-input" value={ingresso}
          required={situacao==='legado_ativo'} onChange={e=>setIngresso(e.target.value)} disabled={gravando}/></>}
        <label htmlFor="r12-referencia" className="admin-academico-label">Referência documental da conferência (sem dados sensíveis)</label>
        <input id="r12-referencia" required minLength={12} maxLength={180}
          placeholder="Ex.: LIVRO-MATRICULAS-2025-REVISAO"
          className="search-input admin-academico-input" value={referencia}
          onChange={e=>{setReferencia(e.target.value);setIdentidadeConferida(false);}} disabled={gravando}/>
      </fieldset>
      <label className="admin-academico-check">
        <input type="checkbox" checked={identidadeConferida} disabled={gravando}
          onChange={e=>setIdentidadeConferida(e.target.checked)}/>
        Conferi a identidade, a turma de destino e a inexistência de matrícula duplicada.
      </label>
      {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&situacao==='legado_ativo'&&<label className="admin-academico-check">
        <input type="checkbox" checked={documentoConferido} disabled={gravando}
          onChange={e=>setDocumentoConferido(e.target.checked)}/>
        Tenho documentação que confirma que esse estudante já frequenta a turma e autorizo o vínculo acadêmico ativo, sem novo ingresso financeiro.
      </label>}
      <button type="submit" className="admin-btn admin-btn-primary" disabled={!salvavel}>
        {gravando?'Registrando...':situacao==='legado_ativo'?'Confirmar estudante antigo em curso':'Salvar vínculo pendente'}
      </button>
      <p className="admin-academico-note">A operação não cria cobrança, Pix, parcelas, login, convite ou mensagem. Não importaremos dados reais durante a homologação.</p>
    </form>
    {visualizada&&<section className="admin-academico-panel"
      role="region" aria-label={'Ficha de '+visualizada.nome_completo}>
      <button ref={voltarFichaRef} type="button" className="admin-btn admin-btn-secondary"
        onClick={voltarDaFicha}>← Voltar ao vínculo sem perder os dados</button>
      <h3>Ficha de {visualizada.nome_completo}</h3>
      <p>Dados privados do cadastro {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD'}; não representam matrícula confirmada.</p>
      <dl className="admin-registro-profile-data">
        <div><dt>Nome completo</dt><dd>{visualizada.nome_completo}</dd></div>
        <div><dt>E-mail</dt><dd>{visualizada.email||'Não informado'}</dd></div>
        <div><dt>Telefone</dt><dd>{visualizada.telefone||'Não informado'}</dd></div>
        <div><dt>Vínculos acadêmicos registrados</dt><dd>{matriculas.filter(m=>m.pessoa_id===visualizada.id).length}</dd></div>
      </dl>
    </section>}
  </section>;
}
