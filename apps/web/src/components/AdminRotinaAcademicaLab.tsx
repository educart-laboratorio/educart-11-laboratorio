'use client';
import { AdminRegistroModalDev } from '@/components/AdminRegistroModalDev';
import { AdminAjuda } from '@/components/AdminAjuda';
import { nomeGrupoTurma } from '@/lib/academico/nome-grupo-turma';
/**
 * EducART 1.1 — navegação acadêmica reorganizada SEM criar base paralela.
 * LIPE: experiência visual e fluxos públicos 1.0 preservados. Banco conforme ambiente.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminPlanejamentoFormacaoTurmaDev } from '@/components/AdminPlanejamentoFormacaoTurmaDev';
import { AdminChamadasDev } from '@/components/AdminChamadasDev';
import { AdminEstudantesDev } from '@/components/AdminEstudantesDev';
import { AdminDocentesDev } from '@/components/AdminDocentesDev';
import { AdminKpiDetalhesDev,type KpiAcademico } from '@/components/AdminKpiDetalhesDev';
import { ACOES_ACADEMICAS_EXCLUSIVAS_DEV } from '@/lib/supabase/client';
const AMBIENTE_ACADEMICO=ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD';

type Secao='visao'|'turmas'|'estudantes'|'docentes'|'agenda'|'frequencia';
type Indicadores={formacoes:number;turmas:number;matriculas:number;aulas:number;chamadas:number};
type ProximaAula={id:string;turma_id:string;data_aula:string;inicio:string;fim:string;tema:string};
type TurmaResumo={id:string;codigo:string};
type Props={supabase:SupabaseClient;podeGerir:boolean;secao:Secao;
  onSolicitarSecao:(destino:Secao)=>void;
  onRascunhoPendenteChange?:(pendente:boolean)=>void};
export function AdminRotinaAcademicaLab({supabase,podeGerir,secao,onSolicitarSecao,onRascunhoPendenteChange}:Props){
  const [indicadores,setIndicadores]=useState<Indicadores|null>(null);
  const [proximas,setProximas]=useState<ProximaAula[]>([]);
  const [turmas,setTurmas]=useState<TurmaResumo[]>([]);
  const [erro,setErro]=useState('');
  const [carregando,setCarregando]=useState(true);
  const [buscaRapida,setBuscaRapida]=useState('');
  const [buscaEncaminhada,setBuscaEncaminhada]=useState<string|null>(null);
  const [detalheAberto,setDetalheAberto]=useState<KpiAcademico|null>(null);
  const acionadorDetalhe = useRef<HTMLButtonElement | null>(null);

  function abrirDetalhe(tipo: KpiAcademico, acionador: HTMLButtonElement) {
    acionadorDetalhe.current = acionador;
    setDetalheAberto(tipo);
  }

  function fecharDetalhe() {
    const acionador = acionadorDetalhe.current;
    acionadorDetalhe.current = null;
    setDetalheAberto(null);
    // Aguarda a remoção do dialog para que o acionador volte a receber foco.
    requestAnimationFrame(() => {
      if (acionador?.isConnected) acionador.focus();
    });
  }
  const [formacaoInicialId,setFormacaoInicialId]=useState<string|null>(null);
  const [turmaInicialId,setTurmaInicialId]=useState<string|null>(null);
  const [minutaAberta,setMinutaAberta]=useState(false);
  const [rascunhoPendente,setRascunhoPendente]=useState(false);
  const [rascunhoEstudantePendente,setRascunhoEstudantePendente]=useState(false);
  useEffect(()=>{
    onRascunhoPendenteChange?.(rascunhoPendente||rascunhoEstudantePendente);
    return()=>onRascunhoPendenteChange?.(false);
  },[rascunhoPendente,rascunhoEstudantePendente,onRascunhoPendenteChange]);
  const atualizarIndicadores=useCallback(async()=>{
    setCarregando(true);setErro('');
    const tabelas=['formacoes','turmas','matriculas','educart_aulas_dev','educart_chamadas_dev'];
    const hoje=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Bahia'});
    const [consultas,aulas,listaTurmas]=await Promise.all([
      Promise.all(tabelas.map(t=>supabase.from(t).select('id',{count:'exact',head:true}))),
      supabase.from('educart_aulas_dev')
        .select('id,turma_id,data_aula,inicio,fim,tema')
        .eq('situacao','planejada').gte('data_aula',hoje).order('data_aula',{ascending:true}).limit(6),
      supabase.from('turmas').select('id,codigo').order('codigo').limit(1001),
    ]);
    if(consultas.some(c=>c.error||c.count===null)||aulas.error||listaTurmas.error||(listaTurmas.data??[]).length>1000){
      setErro('Não foi possível consultar o panorama acadêmico completo no Supabase '+AMBIENTE_ACADEMICO+'.');
      setIndicadores(null);setProximas([]);setTurmas([]);
    }else{
      setIndicadores({formacoes:consultas[0].count??0,turmas:consultas[1].count??0,
        matriculas:consultas[2].count??0,aulas:consultas[3].count??0,chamadas:consultas[4].count??0});
      setProximas((aulas.data??[]) as ProximaAula[]);
      setTurmas((listaTurmas.data??[]) as TurmaResumo[]);
    }
    setCarregando(false);
  },[supabase]);
  useEffect(()=>{void atualizarIndicadores();},[atualizarIndicadores]);
  useEffect(()=>{if(secao==='visao')setBuscaEncaminhada(null);},[secao]);
  return <section className="admin-academico" aria-label="Gestão acadêmica da EducART">
    <div className="admin-header-row"><div>
      <span className="admin-kicker">EDUCART 1.1 · INTEGRAÇÃO INSTITUCIONAL</span>
      <h1 className="admin-page-title">{secao==='visao'?'Visão geral':secao==='estudantes'?'Pessoas e matrículas':'Formações e aulas'}<span className="admin-title-accent">.</span> <AdminAjuda titulo="Acadêmico" descricao="Gestão unificada de formações, docentes, estudantes, aulas e frequência." passos="Escolha a tarefa pelo menu contextual do painel." /></h1>
      <p className="admin-page-desc">Da formação à chamada: uma base única de turmas, matrículas, agenda e históricos.</p>
    </div></div>
    <div className="admin-academico-aux-actions" role="group" aria-label="Ações auxiliares do Acadêmico">
      <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>setMinutaAberta(true)} aria-haspopup="dialog">Contrato institucional · MINUTA</button>
      {secao==='visao'&&<button className="admin-btn admin-btn-secondary" type="button" disabled={carregando}
        onClick={()=>void atualizarIndicadores()}>Atualizar indicadores</button>}
    </div>
    {secao==='visao'&&<>
      <form className="admin-tarefa-busca" role="search" aria-label="Localizar estudante da EducART"
        onSubmit={event=>{event.preventDefault();setBuscaEncaminhada(buscaRapida.trim());onSolicitarSecao('estudantes');}}>
        <div className="admin-tarefa-busca-texto">
          <label htmlFor="admin-busca-rapida-estudante">Precisa abrir uma ficha de estudante?</label>
          <p>Pesquise nome ou contato e vá direto aos vínculos acadêmicos existentes.</p>
        </div>
        <div className="admin-tarefa-busca-controles">
          <input id="admin-busca-rapida-estudante" type="search" className="search-input admin-academico-input"
            autoComplete="off" placeholder="Nome, e-mail ou telefone"
            value={buscaRapida} onChange={event=>setBuscaRapida(event.target.value)}/>
          <button className="admin-btn admin-btn-primary" type="submit">Localizar estudante</button>
        </div>
      </form>
      {erro&&<p className="admin-academico-message" role="alert">{erro}</p>}
      {carregando?<p role="status">Consultando dados acadêmicos {AMBIENTE_ACADEMICO}...</p>:
      indicadores&&<div className="admin-kpi-grid" role="group" aria-label={`Indicadores reais do ${AMBIENTE_ACADEMICO}`}>
        <button type="button" className="admin-kpi-card kpi-total" onClick={event => abrirDetalhe('formacoes', event.currentTarget)} aria-haspopup="dialog" aria-label={`Abrir detalhes de formações: ${indicadores.formacoes}`}><span className="kpi-label">Formações</span><span className="kpi-value">{indicadores.formacoes}</span></button>
        <button type="button" className="admin-kpi-card kpi-pending" onClick={event => abrirDetalhe('turmas', event.currentTarget)} aria-haspopup="dialog" aria-label={`Abrir detalhes de turmas: ${indicadores.turmas}`}><span className="kpi-label">Turmas</span><span className="kpi-value">{indicadores.turmas}</span></button>
        <button type="button" className="admin-kpi-card kpi-confirmed" onClick={event => abrirDetalhe('matriculas', event.currentTarget)} aria-haspopup="dialog" aria-label={`Abrir detalhes de matrículas: ${indicadores.matriculas}`}><span className="kpi-label">Matrículas</span><span className="kpi-value">{indicadores.matriculas}</span></button>
        <button type="button" className="admin-kpi-card kpi-enrolled" onClick={event => abrirDetalhe('chamadas', event.currentTarget)} aria-haspopup="dialog" aria-label={`Abrir detalhes de chamadas registradas: ${indicadores.chamadas}`}><span className="kpi-label">Chamadas registradas</span><span className="kpi-value">{indicadores.chamadas}</span></button>
      </div>}
      {indicadores&&<p className="admin-academico-note">Aulas cadastradas: {indicadores.aulas}. Dados consultados no Supabase {AMBIENTE_ACADEMICO}, sem números simulados ou inferência de pagamentos.</p>}
      <div className="admin-academico-panels admin-academico-panels-single">
        <article className="admin-academico-panel">
          <h2>Próximas aulas <AdminAjuda titulo="Próximas aulas" descricao={`Aulas futuras planejadas no banco ${AMBIENTE_ACADEMICO}, em ordem de data.`} /></h2>
          {!proximas.length?<p>Não há aulas futuras planejadas nos registros consultados.</p>:
          <div className="admin-academico-fichas">{proximas.map(a=><div className="admin-academico-ficha" key={a.id}>
            <div><strong>{a.tema}</strong><small>{a.data_aula} · {a.inicio.slice(0,5)}–{a.fim.slice(0,5)} · {nomeGrupoTurma(turmas.find(t=>t.id===a.turma_id)?.codigo??'Turma não localizada')}</small></div>
            <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>onSolicitarSecao('agenda')}>Abrir agenda</button>
          </div>)}</div>}
        </article>
      </div>
    </>}
    {minutaAberta&&<AdminRegistroModalDev titulo="Contrato institucional · MINUTA" descricao="Oficina de Atores Salvador · versão para conferência, sem validade contratual definitiva" amplo onClose={()=>setMinutaAberta(false)}>
      <div style={{display:'grid',gap:16}}>
        <p role="status" style={{padding:'12px 16px',border:'1px solid var(--border-highlight)',borderRadius:12}}>MINUTA PARA REVISÃO JURÍDICA E APROVAÇÃO DA DIREÇÃO. A inscrição não constitui matrícula, cobrança ou assinatura. Nenhum aceite contratual está habilitado.</p>
        <p>Documento institucional de cinco páginas. A identificação da prestadora, as condições da turma, o calendário, a ementa, os valores e a política comercial precisam de confirmação antes de qualquer uso vinculante.</p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <a className="admin-btn admin-btn-primary" href="https://drive.google.com/file/d/1Cn_YIAHq8ZtcbY2foIM2ioz7ugVv5TZk/view" target="_blank" rel="noopener noreferrer">Ler PDF em nova aba ↗</a>
          <a className="admin-btn admin-btn-secondary" href="https://drive.google.com/uc?export=download&id=1Cn_YIAHq8ZtcbY2foIM2ioz7ugVv5TZk" target="_blank" rel="noopener noreferrer">Baixar PDF ↓</a>
        </div>
        <p style={{fontSize:13,opacity:.8}}>Arquivo institucional no Google Drive EducART; a leitura e o download dependem das permissões da conta. Este painel é apenas para revisão interna.</p>
      </div>
    </AdminRegistroModalDev>}
    {secao==='turmas'&&<AdminPlanejamentoFormacaoTurmaDev supabase={supabase} podeGerir={podeGerir}
      formacaoInicialId={formacaoInicialId} turmaInicialId={turmaInicialId}
      onRascunhoPendenteChange={setRascunhoPendente}/>}
    {secao==='estudantes'&&<AdminEstudantesDev supabase={supabase} podeGerir={podeGerir}
      buscaInicial={buscaEncaminhada??''} focarBuscaInicial={buscaEncaminhada!==null}
      onRascunhoPendenteChange={setRascunhoEstudantePendente}/>}
    {secao==='docentes'&&<AdminDocentesDev supabase={supabase} podeGerir={podeGerir}/>}
    {secao==='agenda'&&<AdminChamadasDev supabase={supabase} podeGerir={podeGerir} modo="agenda"/>}
    {secao==='frequencia'&&<AdminChamadasDev supabase={supabase} podeGerir={podeGerir} modo="frequencia"/>}
    {detalheAberto&&indicadores&&<AdminKpiDetalhesDev supabase={supabase} tipo={detalheAberto} total={indicadores[detalheAberto]} aoFechar={fecharDetalhe} aoGerirFormacao={id=>{setTurmaInicialId(null);setFormacaoInicialId(id);onSolicitarSecao('turmas');setDetalheAberto(null);}} aoGerirTurma={id=>{setFormacaoInicialId(null);setTurmaInicialId(id);onSolicitarSecao('turmas');setDetalheAberto(null);}} aoAbrirGestao={()=>{setFormacaoInicialId(null);setTurmaInicialId(null);onSolicitarSecao(detalheAberto==='formacoes'||detalheAberto==='turmas'?'turmas':detalheAberto==='matriculas'?'estudantes':'frequencia');setDetalheAberto(null);}}/>}
    <p className="admin-academico-footer">{ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'EducART 1.1 · Somente Supabase DEV · Prévia privada em validação visual por módulo':'EducART 1.1 · Supabase PROD · Gestão acadêmica sujeita à conferência da Coordenação · Vínculos pendentes, sem efetivação Pix/bolsa'}</p>
  </section>;
}
