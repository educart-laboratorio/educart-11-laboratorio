'use client';
import { AdminAjuda } from '@/components/AdminAjuda';
import { nomeGrupoTurma } from '@/lib/academico/nome-grupo-turma';

/**
 * EducART 1.1 / LIPE — chamadas reais somente no Supabase DEV.
 * A pessoa é identificada pela matrícula (não por nome digitado).
 * Aula -> turma -> matrícula -> pessoa; o banco impõe vínculos, RLS e histórico.
 * Secretaria registra a primeira chamada; Coordenação registra e corrige.
 */
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';
import { horarioSemanalNaData, type HorarioSemanalTurma } from '@/lib/academico/horario-turma';

type Props = { supabase: SupabaseClient; podeGerir: boolean; modo?: 'agenda'|'frequencia' };
type Turma = { id: string; codigo: string; horarios_semanais: HorarioSemanalTurma[] | null };
type Pessoa = { id: string; nome_completo: string };
type Matricula = { id: string; pessoa_id: string; turma_id: string; situacao: string };
type Aula = {
  id: string; turma_id: string; data_aula: string; inicio: string;
  fim: string; tema: string; situacao: 'planejada' | 'realizada' | 'cancelada';
};
type Presenca = 'presente' | 'ausente' | 'justificada';
type Chamada = {
  id: string; aula_id: string; matricula_id: string;
  situacao: Presenca; justificativa: string | null; atualizado_em: string;
};
type Evento = {
  chamada_id: string; operacao: 'registro' | 'correcao';
  situacao_anterior: string | null; situacao_nova: string;
  motivo: string | null; registrado_em: string;
};
type AjusteAgenda = {
  id:string;aula_id:string;operacao:'cancelar'|'remarcar';
  data_anterior:string;inicio_anterior:string;fim_anterior:string;
  data_nova:string|null;inicio_novo:string|null;fim_novo:string|null;
  aula_substituta_id:string|null;motivo:string;registrado_em:string;
};
type Rascunho = { situacao: Presenca; justificativa: string; motivo: string };
const ROTULOS: Record<Presenca, string> = {
  presente: 'Presente', ausente: 'Ausente', justificada: 'Falta justificada',
};

export function AdminChamadasDev({ supabase, podeGerir, modo='frequencia' }: Props) {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [matriculas, setMatriculas] = useState<Matricula[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [chamadas, setChamadas] = useState<Chamada[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [ajustes, setAjustes] = useState<AjusteAgenda[]>([]);
  const [turmaId, setTurmaId] = useState('');
  const [aulaId, setAulaId] = useState('');
  const [dataAula, setDataAula] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [tema, setTema] = useState('');
  const [rascunhos, setRascunhos] = useState<Record<string, Rascunho>>({});
  const [operacaoAgenda,setOperacaoAgenda]=useState<'remarcar'|'cancelar'>('remarcar');
  const [novaData,setNovaData]=useState('');
  const [novoInicio,setNovoInicio]=useState('');
  const [novoFim,setNovoFim]=useState('');
  const [motivoAgenda,setMotivoAgenda]=useState('');
  const [confirmoAgenda,setConfirmoAgenda]=useState(false);
  const [carregando, setCarregando] = useState(true);
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [t, p, m, a, c, h, aj] = await Promise.all([
      supabase.from('turmas').select('id,codigo,horarios_semanais').order('codigo'),
      supabase.from('pessoas').select('id,nome_completo').order('nome_completo'),
      supabase.from('matriculas').select('id,pessoa_id,turma_id,situacao'),
      supabase.from('educart_aulas_dev').select('id,turma_id,data_aula,inicio,fim,tema,situacao').order('data_aula', { ascending: false }),
      supabase.from('educart_chamadas_dev').select('id,aula_id,matricula_id,situacao,justificativa,atualizado_em'),
      supabase.from('educart_chamadas_historico_dev').select('chamada_id,operacao,situacao_anterior,situacao_nova,motivo,registrado_em').order('registrado_em', { ascending: false }),
      supabase.from('educart_ajustes_aulas_r12_dev').select('id,aula_id,operacao,data_anterior,inicio_anterior,fim_anterior,data_nova,inicio_novo,fim_novo,aula_substituta_id,motivo,registrado_em').order('registrado_em',{ascending:false}),
    ]);
    if (t.error || p.error || m.error || a.error || c.error || h.error || aj.error) {
      setErro('Não foi possível carregar o registro acadêmico. Confira a sessão e as permissões no DEV.');
    } else {
      const novasTurmas = (t.data ?? []) as Turma[];
      const novasAulas = (a.data ?? []) as Aula[];
      setTurmas(novasTurmas);
      setPessoas((p.data ?? []) as Pessoa[]);
      setMatriculas((m.data ?? []) as Matricula[]);
      setAulas(novasAulas);
      setChamadas((c.data ?? []) as Chamada[]);
      setEventos((h.data ?? []) as Evento[]);
      setAjustes((aj.data??[]) as AjusteAgenda[]);
      setTurmaId(atual => novasTurmas.some(item => item.id === atual) ? atual : (novasTurmas[0]?.id ?? ''));
      setAulaId(atual => novasAulas.some(item => item.id === atual) ? atual : '');
    }
    setCarregando(false);
  }, [supabase]);
  useEffect(() => { void carregar(); }, [carregar]);

  // Uma formação não possui horário universal: a sugestão é da turma no dia escolhido.
  const gradeDaTurma = turmas.find(t => t.id === turmaId)?.horarios_semanais;
  const horarioSugerido = useMemo(
    () => horarioSemanalNaData(gradeDaTurma, dataAula), [gradeDaTurma, dataAula]
  );
  useEffect(() => {
    setInicio(horarioSugerido?.inicio ?? '');
    setFim(horarioSugerido?.fim ?? '');
  }, [turmaId, dataAula, horarioSugerido?.inicio, horarioSugerido?.fim]);

  const aulasDaTurma = useMemo(() => aulas.filter(a => a.turma_id === turmaId), [aulas, turmaId]);
  const aulaSelecionada = aulasDaTurma.find(a => a.id === aulaId) ??
    (modo==='frequencia'?aulasDaTurma.find(a=>a.situacao==='realizada'):undefined) ?? aulasDaTurma[0];
  const matriculasDaTurma = matriculas.filter(m =>
    m.turma_id === turmaId && ['ativa', 'concluida'].includes(m.situacao));
  const nomes = useMemo(() => new Map(pessoas.map(p => [p.id, p.nome_completo])), [pessoas]);
  const chamadaPorMatricula = useMemo(
    () => new Map(chamadas.filter(c => c.aula_id === aulaSelecionada?.id).map(c => [c.matricula_id, c])),
    [chamadas, aulaSelecionada?.id],
  );
  const chamadasDaAula = chamadas.filter(c => c.aula_id === aulaSelecionada?.id);
  const presentes = chamadasDaAula.filter(c => c.situacao === 'presente').length;
  const ausentes = chamadasDaAula.filter(c => c.situacao === 'ausente').length;
  const justificadas = chamadasDaAula.filter(c => c.situacao === 'justificada').length;
  const idsDaAula = new Set(chamadasDaAula.map(c => c.id));
  useEffect(()=>{
    setNovaData(aulaSelecionada?.data_aula??'');
    setNovoInicio(aulaSelecionada?.inicio.slice(0,5)??'');
    setNovoFim(aulaSelecionada?.fim.slice(0,5)??'');
    setMotivoAgenda('');setConfirmoAgenda(false);
  },[aulaSelecionada?.id,aulaSelecionada?.data_aula,aulaSelecionada?.inicio,aulaSelecionada?.fim]);

  const usuarioComPapel = async (papel: 'secretaria' | 'coordenacao') => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user || user.is_anonymous) return null;
    const papeis = await obterPapeisGestao(supabase, user.id);
    return (papeis.includes(papel) || (papel === 'secretaria' && papeis.includes('coordenacao'))) ? user.id : null;
  };

  const criarAula = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErro(''); setAviso('');
    if (gravando || !podeGerir || !turmaId || !dataAula || !inicio || !fim || inicio >= fim || tema.trim().length < 3) {
      setErro('Confira turma, data, horário de início/fim e tema antes de criar a aula.');
      return;
    }
    setGravando(true);
    try {
      if (!(await usuarioComPapel('coordenacao'))) {
        setErro('Somente a Coordenação pode cadastrar aulas.'); return;
      }
      const { data, error } = await supabase.from('educart_aulas_dev').insert({
        turma_id: turmaId, data_aula: dataAula, inicio, fim, tema: tema.trim(), situacao: 'planejada',
      }).select('id').single();
      if (error || !data) {
        setErro(error?.code === '23505' ? 'Já existe aula nessa turma, data e horário.' : 'Aula não registrada. Confira as regras do DEV.');
        return;
      }
      setTema('');
      await carregar();
      setAulaId(data.id);
      setAviso('Aula cadastrada no Supabase DEV, ainda sem chamada. Para registrar frequência, marque a aula como realizada.');
    } catch { setErro('Falha de conexão ao cadastrar aula.'); }
    finally { setGravando(false); }
  };

  const realizarAula = async () => {
    if (!aulaSelecionada || gravando || !podeGerir) return;
    setErro(''); setAviso(''); setGravando(true);
    try {
      if (!(await usuarioComPapel('coordenacao'))) {
        setErro('Somente a Coordenação pode confirmar uma aula realizada.'); return;
      }
      if (aulaSelecionada.data_aula > new Date().toLocaleDateString('en-CA')) {
        setErro('Aula futura não pode ser dada como realizada.'); return;
      }
      const { data, error } = await supabase.from('educart_aulas_dev')
        .update({ situacao: 'realizada' }).eq('id', aulaSelecionada.id).select('id').maybeSingle();
      if (error || !data) { setErro('Aula não confirmada: confira o papel e a data.'); return; }
      await carregar();
      setAviso('Aula confirmada como realizada no DEV. Agora é possível registrar a chamada.');
    } catch { setErro('Falha de conexão ao confirmar aula.'); }
    finally { setGravando(false); }
  };


  const ajustarAgenda = async(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(!podeGerir||gravando||!aulaSelecionada||aulaSelecionada.situacao!=='planejada'||
      !confirmoAgenda||motivoAgenda.trim().length<8)return;
    if(operacaoAgenda==='remarcar'&&(!novaData||!novoInicio||!novoFim||novoInicio>=novoFim)){
      setErro('Remarcação exige nova data e horário válidos.');return;
    }
    setErro('');setAviso('');setGravando(true);
    try{
      if(!await usuarioComPapel('coordenacao')){setErro('Somente Coordenação pode ajustar a agenda.');return;}
      const {data,error}=await supabase.rpc('educart_r12_ajustar_aula_dev',{
        p_aula_id:aulaSelecionada.id,p_operacao:operacaoAgenda,
        p_data_nova:operacaoAgenda==='remarcar'?novaData:null,
        p_inicio_novo:operacaoAgenda==='remarcar'?novoInicio:null,
        p_fim_novo:operacaoAgenda==='remarcar'?novoFim:null,
        p_motivo:motivoAgenda.trim(),p_confirmo:true,
      });
      if(error||!data){setErro('Ajuste recusado. Confira status da aula, motivo, conflitos e horários.');return;}
      await carregar();
      setMotivoAgenda('');setConfirmoAgenda(false);
      setAviso('Ajuste de aula registrado e auditado no DEV. Nenhuma mensagem foi enviada.');
    }catch{setErro('Ajuste indisponível; confira o histórico antes de repetir.');}
    finally{setGravando(false);}
  };

  const editar = (matriculaId: string, ajuste: Partial<Rascunho>, original?: Chamada) => {
    setRascunhos(prev => {
      const anterior: Rascunho = prev[matriculaId] ?? {
        situacao: original?.situacao ?? 'presente',
        justificativa: original?.justificativa ?? '',
        motivo: '',
      };
      return { ...prev, [matriculaId]: { ...anterior, ...ajuste } };
    });
  };

  const registrar = async (m: Matricula) => {
    if (!aulaSelecionada || aulaSelecionada.situacao !== 'realizada' || gravando) return;
    const existente = chamadaPorMatricula.get(m.id);
    const r = rascunhos[m.id] ?? { situacao: existente?.situacao ?? 'presente', justificativa: existente?.justificativa ?? '', motivo: '' };
    const justificativa = r.situacao === 'justificada' ? r.justificativa.trim() : null;
    setErro(''); setAviso('');
    if (justificativa !== null && justificativa.length < 8) {
      setErro('Falta justificada exige justificativa de pelo menos 8 caracteres.'); return;
    }
    if (existente && (!podeGerir || r.motivo.trim().length < 8)) {
      setErro('Correção exige Coordenação e motivo com pelo menos 8 caracteres.'); return;
    }
    setGravando(true);
    try {
      const uid = await usuarioComPapel(existente ? 'coordenacao' : 'secretaria');
      if (!uid) { setErro('Sua permissão atual não autoriza esta chamada.'); return; }
      const registro = existente
        ? await supabase.from('educart_chamadas_dev').update({
            situacao: r.situacao, justificativa, motivo_ajuste: r.motivo.trim(),
          }).eq('id', existente.id).select('id').maybeSingle()
        : await supabase.from('educart_chamadas_dev').insert({
            aula_id: aulaSelecionada.id, matricula_id: m.id, situacao: r.situacao,
            justificativa, registrado_por: uid, atualizado_por: uid,
          }).select('id').maybeSingle();
      if (registro.error || !registro.data) {
        setErro('Registro não confirmado. A aula e a matrícula devem corresponder; duplicidade e falta de permissão são bloqueadas.');
        return;
      }
      setRascunhos(prev => { const novo = { ...prev }; delete novo[m.id]; return novo; });
      await carregar();
      setAviso((existente ? 'Correção auditada' : 'Chamada registrada') + ' para ' + (nomes.get(m.pessoa_id) ?? 'estudante') + ' no DEV.');
    } catch { setErro('Falha de conexão ao registrar chamada.'); }
    finally { setGravando(false); }
  };

  return <section className="admin-academico-panel" aria-label={modo==='agenda'?'Agenda acadêmica':'Chamadas institucionais'}>
    <span className="admin-kicker">EDUCART 1.1 · ACADÊMICO · DEV</span>
    <h2>{modo==='agenda'?'Agenda de aulas':'Chamadas por aula, com histórico'} <AdminAjuda 
      titulo={modo==='agenda'?'Agenda de aulas':'Chamadas por aula, com histórico'}
      descricao={modo==='agenda'?'Planeje, confirme e ajuste aulas com histórico auditado.':'Registre presença, falta e justificativa por aula realizada.'}
      passos={modo==='agenda'?'Escolha uma turma, crie uma aula ou selecione uma aula programada.':'Selecione a turma e a aula realizada, depois registre cada estudante.'}/></h2>
    <p>{modo==='agenda'?'Cada turma tem seus próprios dias e horários; remarcações mantêm histórico.':'Os estudantes vêm de matrículas reais, nunca de listas fictícias. Secretaria registra a primeira chamada e Coordenação corrige com motivo auditável.'}</p>
    {erro && <p className="admin-academico-message" role="alert">{erro}</p>}
    {aviso && <p className="admin-academico-message" role="status">{aviso}</p>}
    <div className="admin-academico-section-head">
      <div><label className="admin-academico-label" htmlFor="chamada-turma">Turma</label>
        <select id="chamada-turma" className="filter-select" value={turmaId} onChange={e => { setTurmaId(e.target.value); setAulaId(''); setRascunhos({}); }} disabled={carregando}>
          {!turmas.length && <option value="">Nenhuma turma no banco DEV</option>}
          {turmas.map(t => <option key={t.id} value={t.id}>{nomeGrupoTurma(t.codigo)}</option>)}
        </select>
      </div>
      <button className="admin-btn admin-btn-secondary" type="button" onClick={() => void carregar()} disabled={carregando || gravando}>Atualizar registros</button>
    </div>
    {modo==='agenda'&&podeGerir && <form className="admin-academico-panel" onSubmit={criarAula}>
      <h3>Nova aula <AdminAjuda titulo={"Nova aula"} descricao={"Cria uma aula planejada."} passos={"Informe data, horários e tema; confirme realização depois."} cuidado={"Não lance presença de aula que não aconteceu."} /></h3>
      <div className="admin-academico-dates">
        <div><label className="admin-academico-label" htmlFor="chamada-data">Data</label>
          <input id="chamada-data" className="search-input admin-academico-input" type="date" value={dataAula} onChange={e => setDataAula(e.target.value)} required/></div>
        <div><label className="admin-academico-label" htmlFor="chamada-inicio">Início</label>
          <input id="chamada-inicio" className="search-input admin-academico-input" type="time" value={inicio} onChange={e => setInicio(e.target.value)} required/></div>
        <div><label className="admin-academico-label" htmlFor="chamada-fim">Fim</label>
          <input id="chamada-fim" className="search-input admin-academico-input" type="time" value={fim} onChange={e => setFim(e.target.value)} required/></div>
      </div>
      {dataAula && <p className="admin-academico-note" role="status">
        {horarioSugerido
          ? 'Horário preenchido a partir da grade desta turma para o dia escolhido. Ajuste manualmente apenas se a aula for excepcional.'
          : gradeDaTurma?.length
            ? 'Esta data não corresponde a um dia semanal programado para a turma. Se for uma aula excepcional, informe os horários manualmente e confirme com a Coordenação.'
            : 'Esta turma ainda não possui horários semanais cadastrados. Informe início e fim manualmente; nenhuma grade de outra turma será aplicada.'}
      </p>}
      <label className="admin-academico-label" htmlFor="chamada-tema">Tema da aula</label>
      <input id="chamada-tema" className="search-input admin-academico-input" maxLength={160} minLength={3} value={tema} onChange={e => setTema(e.target.value)} required placeholder="Ex.: Corpo e improvisação"/>
      <button type="submit" className="admin-btn admin-btn-primary" disabled={gravando || !turmaId || !dataAula || !inicio || !fim || inicio >= fim}>Criar aula planejada</button>
    </form>}
    {carregando ? <p role="status">Consultando o Supabase DEV...</p>
      : !aulasDaTurma.length ? <p>{modo==='agenda'?'Nenhuma aula planejada nesta turma. Use Nova aula para criar o primeiro encontro.':'Nenhuma aula nesta turma. Abra Agenda para cadastrar antes de registrar frequência.'}</p> : <>
      {modo==='agenda'&&<div className="admin-academico-panel">
          <h3>Próximas aulas <AdminAjuda titulo="Próximas aulas" descricao="Agenda da turma ordenada por data, sem inventar horários ou registros." /></h3>
          <div className="admin-academico-fichas">{aulasDaTurma.filter(a=>a.situacao==='planejada')
            .slice().sort((a,b)=>a.data_aula.localeCompare(b.data_aula)).map(a=>
            <article className="admin-academico-ficha" key={a.id}>
              <div><strong>{a.data_aula} · {a.inicio.slice(0,5)}–{a.fim.slice(0,5)}</strong>
                <small>{a.tema} · planejada</small></div>
              <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>setAulaId(a.id)}>Abrir aula</button>
            </article>)}
            {!aulasDaTurma.some(a=>a.situacao==='planejada')&&<p>Nenhuma aula planejada nesta turma.</p>}
          </div>
        </div>}
       <label className="admin-academico-label" htmlFor="chamada-aula">Aula</label>
      <select id="chamada-aula" className="filter-select" value={aulaSelecionada?.id ?? ''}
        onChange={e => { setAulaId(e.target.value); setRascunhos({}); }}>
        {aulasDaTurma.map(a => <option key={a.id} value={a.id}>{a.data_aula} · {a.inicio.slice(0,5)}–{a.fim.slice(0,5)} · {a.tema} ({a.situacao})</option>)}
      </select>
      <p className="admin-academico-note">Situação: <strong>{aulaSelecionada?.situacao}</strong>. Matrículas elegíveis: {matriculasDaTurma.length}. Chamadas: {chamadasDaAula.length}. Presentes: {presentes}; ausentes: {ausentes}; justificadas: {justificadas}.</p>
      {modo==='agenda'&&podeGerir && aulaSelecionada?.situacao === 'planejada' && <button type="button" className="admin-btn admin-btn-primary" disabled={gravando} onClick={() => void realizarAula()}>Confirmar que a aula foi realizada</button>}
      {modo==='agenda'&&podeGerir&&aulaSelecionada?.situacao==='planejada'&&<details className="admin-academico-panel">
        <summary style={{cursor:'pointer',fontWeight:700}}>Remarcar ou cancelar esta aula</summary>
        <form className="admin-academico-panel" onSubmit={ajustarAgenda}>
          <h3>Ajustar agenda <AdminAjuda titulo="Ajustar agenda"
            descricao="Remarque ou cancele uma aula planejada com motivo registrado; o histórico é preservado."
            cuidado="Aulas realizadas ou com chamada não podem ser alteradas. Não envia mensagem automaticamente." /></h3>
          <label className="admin-academico-label" htmlFor="r12-operacao-aula">Operação</label>
          <select id="r12-operacao-aula" className="filter-select" value={operacaoAgenda}
            onChange={e=>{setOperacaoAgenda(e.target.value as 'remarcar'|'cancelar');setConfirmoAgenda(false);}}
            disabled={gravando}>
            <option value="remarcar">Remarcar</option><option value="cancelar">Cancelar</option>
          </select>
          {operacaoAgenda==='remarcar'&&<div className="admin-academico-dates">
            <label className="admin-academico-label">Novo dia
              <input className="search-input admin-academico-input" type="date" value={novaData}
                onChange={e=>{setNovaData(e.target.value);setConfirmoAgenda(false);}} required/></label>
            <label className="admin-academico-label">Novo início
              <input className="search-input admin-academico-input" type="time" value={novoInicio}
                onChange={e=>{setNovoInicio(e.target.value);setConfirmoAgenda(false);}} required/></label>
            <label className="admin-academico-label">Novo fim
              <input className="search-input admin-academico-input" type="time" value={novoFim}
                onChange={e=>{setNovoFim(e.target.value);setConfirmoAgenda(false);}} required/></label>
          </div>}
          <label className="admin-academico-label" htmlFor="r12-motivo-agenda">Motivo do ajuste (8–300 caracteres)</label>
          <textarea id="r12-motivo-agenda" className="admin-academico-textarea"
            minLength={8} maxLength={300} rows={2} required value={motivoAgenda}
            onChange={e=>{setMotivoAgenda(e.target.value);setConfirmoAgenda(false);}}/>
          <label className="admin-academico-check">
            <input type="checkbox" checked={confirmoAgenda} onChange={e=>setConfirmoAgenda(e.target.checked)}/>
            Revisei a aula, a turma, o horário e o motivo. Confirmo este ajuste sem disparar mensagens.
          </label>
          <button type="submit" disabled={gravando||!confirmoAgenda} className="admin-btn admin-btn-primary">
            {operacaoAgenda==='cancelar'?'Confirmar cancelamento':'Confirmar remarcação'}
          </button>
        </form>
      </details>}
      {modo==='agenda'&&ajustes.filter(a=>a.aula_id===aulaSelecionada?.id).length>0&&<div className="admin-academico-panel">
        <h3>Histórico de remarcações e cancelamentos <AdminAjuda titulo="Histórico de remarcações e cancelamentos" descricao="Consulta as alterações auditadas na agenda desta aula." passos="Confira data anterior, nova data quando houver, motivo e registro da operação." cuidado="Ajustes não apagam o histórico e não enviam mensagens automaticamente." /></h3>
        {ajustes.filter(a=>a.aula_id===aulaSelecionada?.id).map(a=><p key={a.id} className="admin-academico-note">
          {a.operacao==='cancelar'?'Cancelamento':'Remarcação'} em {a.registrado_em.slice(0,16)}
          · {a.data_anterior} {a.inicio_anterior.slice(0,5)}–{a.fim_anterior.slice(0,5)}
          {a.data_nova?' → '+a.data_nova+' '+a.inicio_novo?.slice(0,5)+'–'+a.fim_novo?.slice(0,5):''}
          {a.aula_substituta_id?' · Aula substituta vinculada e preservada no histórico':''}
          · {a.motivo}
        </p>)}
      </div>}
      {modo==='frequencia'&&<>
       {aulaSelecionada?.situacao !== 'realizada' ? <p>Somente aulas realizadas aceitam chamadas. Confirme sua realização na aba Agenda.</p>
        : matriculasDaTurma.length === 0 ? <p>Não há matrículas ativas ou concluídas nesta turma. Nenhuma presença pode ser inventada.</p>
        : <div className="admin-academico-fichas">{matriculasDaTurma.map(m => {
          const existente = chamadaPorMatricula.get(m.id);
          const r = rascunhos[m.id];
          const situacao = r?.situacao ?? existente?.situacao ?? 'presente';
          const podeEditar = !existente || podeGerir;
          return <article className="admin-academico-ficha" key={m.id}>
            <div><strong>{nomes.get(m.pessoa_id) ?? 'Cadastro não identificado'}</strong><small>Vínculo de matrícula · {m.situacao}</small><small>{existente ? 'Registrado: '+ROTULOS[existente.situacao] : 'Sem chamada registrada'}</small></div>
            <div className="admin-academico-ficha-direita">
              <label className="admin-academico-label" htmlFor={'frequencia-'+m.id}>Frequência</label>
              <select id={'frequencia-'+m.id} className="filter-select" value={situacao} disabled={!podeEditar || gravando}
                onChange={e => editar(m.id, { situacao: e.target.value as Presenca }, existente)}>
                <option value="presente">Presente</option><option value="ausente">Ausente</option><option value="justificada">Falta justificada</option>
              </select>
              {situacao === 'justificada' && <><label className="admin-academico-label" htmlFor={'justificativa-'+m.id}>Justificativa</label>
                <textarea id={'justificativa-'+m.id} className="admin-academico-textarea" rows={2} maxLength={500} minLength={8} value={r?.justificativa ?? existente?.justificativa ?? ''} disabled={!podeEditar || gravando}
                  onChange={e => editar(m.id, { justificativa: e.target.value }, existente)}/></>}
              {existente && podeGerir && <><label className="admin-academico-label" htmlFor={'motivo-'+m.id}>Motivo da correção</label>
                <input id={'motivo-'+m.id} className="search-input admin-academico-input" value={r?.motivo ?? ''} maxLength={300} minLength={8}
                  onChange={e => editar(m.id, { motivo: e.target.value }, existente)} placeholder="Explique a correção"/></>}
              {podeEditar ? <button type="button" className="admin-btn admin-btn-primary" disabled={gravando}
                onClick={() => void registrar(m)}>{existente ? 'Corrigir com auditoria' : 'Registrar chamada'}</button>
                : <small>Correção reservada à Coordenação</small>}
            </div>
          </article>;
        })}</div>}
      <div className="admin-academico-panel">
        <h3>Histórico de alterações <AdminAjuda titulo={"Histórico de alterações"} descricao={"Exibe correções anteriores de chamada."} passos={"Consulte datas e motivos quando precisar revisar frequência."} /></h3>
        {eventos.filter(e => idsDaAula.has(e.chamada_id)).length === 0 ? <p>Nenhum registro ou correção nesta aula.</p> :
          eventos.filter(e => idsDaAula.has(e.chamada_id)).map((e,i) =>
            <p className="admin-academico-note" key={e.chamada_id+'-'+e.registrado_em+'-'+i}>
              {e.operacao === 'correcao' ? 'Correção' : 'Registro'} · {e.registrado_em.slice(0,16)} · {e.situacao_nova}
              {e.motivo ? ' · Motivo: '+e.motivo : ''}
            </p>)}
      </div>
      </>}
    </>}
    <p className="admin-academico-note">Laboratório DEV isolado. Não há inserção de alunos fictícios, confirmação de pagamentos ou envio de mensagens neste módulo.</p>
  </section>;
}
