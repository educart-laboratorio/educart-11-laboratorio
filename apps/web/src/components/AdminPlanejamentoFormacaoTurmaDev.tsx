'use client';
import { useCallback, useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';
import { ACOES_ACADEMICAS_EXCLUSIVAS_DEV } from '@/lib/supabase/client';
import { AdminAjuda } from '@/components/AdminAjuda';
import { AdminRegistroModalDev } from '@/components/AdminRegistroModalDev';
import { AdminVincularEstudanteTurmaDev } from '@/components/AdminVincularEstudanteTurmaDev';
import { nomeGrupoTurma } from '@/lib/academico/nome-grupo-turma';
import { avancarEtapaCadastro, voltarEtapaCadastro, etapasParaConcluir, validarEtapaCadastro, type FalhaCadastro } from '@/lib/academico/etapas-cadastro-turma';
import { precisaConfirmarSaidaCadastro } from '@/lib/academico/proteger-saida-cadastro-a1';

/** EducART 1.1 / Q2-Q4: criar formação + primeira turma no mesmo ato.
 * LIPE: operação apenas DEV, planejada, sem inscrições, cobrança ou publicação.
 */
type FormacaoResumo = { id:string; nome:string; tipo:string; descricao:string|null; publico_alvo:string|null; duracao_meses:number|null; carga_horaria_horas:number|null; publicada:boolean };
type DocenteResumo = {id:string;nome_completo:string;situacao:'ativo'|'inativo'};
type TurmaResumo = { id: string; formacao_id: string; docente_id:string|null; codigo: string; situacao: string; capacidade: number | null; horarios_semanais: Horario[] | null };
type Horario = { dia: string; inicio: string; fim: string };
type Props = { supabase:SupabaseClient; podeGerir:boolean; formacaoInicialId?:string|null; turmaInicialId?:string|null; onRascunhoPendenteChange?:(pendente:boolean)=>void };
type FormacaoRascunho = {
  nome: string; tipo: 'curso' | 'oficina'; descricao: string; publico_alvo: string;
  idade_minima: string; exige_experiencia: boolean; duracao_meses: string;
  carga_horaria_horas: string; ementa: string; modulos_planejados: string;
  avaliacao: string; criterios_conclusao: string;
  chamada_curta: string; formato: 'presencial'|'online'|'hibrido'; objetivos: string;
  disciplinas: string; metodologia: string; competencias: string;
  atividades_praticas: string; certificacao: string; projeto_final: string;
  materiais_inclusos: string; perguntas_frequentes: string;
  valor_matricula_reais: string; valor_mensalidade_reais: string;
  quantidade_mensalidades_referencia: string;
};
type TurmaRascunho = {
  codigo: string; inicio_em: string; termina_em: string; capacidade: string;
  responsavel_nome: string; local_nome: string; local_endereco: string;
  inscricoes_abrem_em: string; inscricoes_encerram_em: string;
};
const DIAS = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const DIAS_ENCONTRO = ['Domingos','Segundas-feiras','Terças-feiras','Quartas-feiras','Quintas-feiras','Sextas-feiras','Sábados'];
const horaLegivel=(valor:string)=>valor.replace(/^(\d{1,2}):(\d{2})(?::\d{2})?$/,(_hora,h:string,m:string)=>m==='00'?h+'h':h+'h'+m);
const nomeTurmaSemHorario=(codigo:string)=>nomeGrupoTurma(codigo).replace(/ • \d{1,2}h(?:\d{2})?–\d{1,2}h(?:\d{2})?$/,'');
const horariosLegiveis=(horarios:Horario[]|null)=>{
  const lista=Array.isArray(horarios)?horarios:[];
  return lista.length?lista.map(h=>(DIAS_ENCONTRO[Number(h.dia)]||'Dia não informado')+', '+horaLegivel(h.inicio)+'–'+horaLegivel(h.fim)).join(' · '):'Horários não informados';
};
const situacaoLegivel=(valor:string)=>({planejada:'Planejada',aberta:'Aberta',em_andamento:'Em andamento',encerrada:'Encerrada',cancelada:'Cancelada'} as Record<string,string>)[valor]??valor.replaceAll('_',' ');

const VAZIA_FORMACAO: FormacaoRascunho = {
  nome:'',tipo:'curso',descricao:'',publico_alvo:'',idade_minima:'',
  exige_experiencia:false,duracao_meses:'',carga_horaria_horas:'',
  ementa:'',modulos_planejados:'',avaliacao:'',criterios_conclusao:'',
  chamada_curta:'',formato:'presencial',objetivos:'',disciplinas:'',
  metodologia:'',competencias:'',atividades_praticas:'',certificacao:'',
  projeto_final:'',materiais_inclusos:'',perguntas_frequentes:'',
  valor_matricula_reais:'',valor_mensalidade_reais:'',
  quantidade_mensalidades_referencia:'',
};
const VAZIA_TURMA: TurmaRascunho = {
  codigo:'',inicio_em:'',termina_em:'',capacidade:'',responsavel_nome:'',
  local_nome:'',local_endereco:'',inscricoes_abrem_em:'',inscricoes_encerram_em:'',
};
const horarioVazio = (): Horario => ({ dia:'', inicio:'', fim:'' });
const normalize = (v:string) => v.trim();
const centavos = (v:string):number|null => {
  if (!v.trim()) return null;
  const t=v.trim().replace(',','.');
  if(!/^\d{1,6}(\.\d{1,2})?$/.test(t))return NaN;
  const n=Math.round(Number(t)*100);
  return Number.isSafeInteger(n)&&n<=10000000?n:NaN;
};
const moeda=(v:string)=>v.trim()?('R$ '+v.replace('.',',')):'A definir';
const DESCRICAO = 'A formação descreve o programa. Os dias e horários pertencem exclusivamente a cada turma.';

type CampoProps = {
  id: string; nome: string; valor: string; mudar: (valor:string)=>void;
  placeholder?: string; tipo?: 'text'|'date'|'number'; obrigatorio?: boolean;
  min?: number; max?: number; maxLength?: number; ajuda?: string; erro?:string;
};
function Campo({ id,nome,valor,mudar,placeholder,tipo='text',obrigatorio=false,min,max,maxLength,ajuda,erro }:CampoProps) {
  return <div>
    <label className="admin-academico-label" htmlFor={id}>{nome}{obrigatorio ? ' *' : ' (opcional)'}</label>
    <input id={id} className="search-input admin-academico-input" type={tipo}
      required={obrigatorio} value={valor} placeholder={placeholder}
      aria-invalid={Boolean(erro)} aria-describedby={erro?id+'-erro':undefined}
      min={min} max={max} maxLength={maxLength}
      onChange={e=>mudar(e.target.value)}/>
    {ajuda && <small className="admin-academico-note">{ajuda}</small>}
    {erro&&<small id={id+'-erro'} className="admin-academico-message" role="alert">{erro}</small>}
  </div>;
}
type TextoProps = {id:string;nome:string;valor:string;mudar:(v:string)=>void;placeholder?:string};
function Texto({id,nome,valor,mudar,placeholder}:TextoProps) {
  return <div>
    <label className="admin-academico-label" htmlFor={id}>{nome} (opcional)</label>
    <textarea id={id} className="admin-academico-textarea" rows={3}
      maxLength={4000} value={valor} placeholder={placeholder}
      onChange={e=>mudar(e.target.value)}/>
  </div>;
}
export function AdminPlanejamentoFormacaoTurmaDev({supabase,podeGerir,formacaoInicialId,turmaInicialId,onRascunhoPendenteChange}:Props) {
  const [formacoes,setFormacoes] = useState<FormacaoResumo[]>([]);
  const [turmas,setTurmas] = useState<TurmaResumo[]>([]);
  const [docentes,setDocentes] = useState<DocenteResumo[]>([]);
  const [docenteId,setDocenteId] = useState('');
  const [mostrarCadastro,setMostrarCadastro] = useState(false);
  const [listaAberta,setListaAberta] = useState<'formacoes'|'turmas'|null>(null);
  const [confirmarFechamento,setConfirmarFechamento] = useState(false);
  // Comparação de valores controlados: desfazer uma edição elimina o aviso.
  // A referência é capturada depois da abertura/carregamento, nunca no banco.
  const [baseRascunho,setBaseRascunho] = useState<string|null>(null);
  const [modo,setModo] = useState<'nova'|'existente'>('nova');
  const [formacaoExistenteId,setFormacaoExistenteId] = useState('');
  const [formacao,setFormacao] = useState<FormacaoRascunho>(VAZIA_FORMACAO);
  const [turma,setTurma] = useState<TurmaRascunho>(VAZIA_TURMA);
  const [horarios,setHorarios] = useState<Horario[]>([horarioVazio()]);
  const [etapa,setEtapa] = useState(0);
  const [campoErro,setCampoErro] = useState<FalhaCadastro|null>(null);
  const [destinoFoco,setDestinoFoco] = useState<{numero:number;campo:string|null}>({numero:0,campo:null});
  const etapaVisivelRef = useRef<HTMLDivElement|null>(null);
  const [carregando,setCarregando] = useState(true);
  const [salvando,setSalvando] = useState(false);
  const [excluindoTurmaId,setExcluindoTurmaId] = useState<string|null>(null);
  const [excluindoFormacaoId,setExcluindoFormacaoId] = useState<string|null>(null);
  const [gerirTurmaId,setGerirTurmaId] = useState<string|null>(null);
  const [rascunhoGerirPendente,setRascunhoGerirPendente] = useState(false);
  const [operacaoGerirEmCurso,setOperacaoGerirEmCurso] = useState(false);
  const [confirmarSaidaGerir,setConfirmarSaidaGerir] = useState(false);
  const [avisoFechamentoGerir,setAvisoFechamentoGerir] = useState('');
  const origemGerirRef = useRef<HTMLButtonElement|null>(null);
  const abriuGerirRef = useRef(false);
  const [fichaFormacaoId,setFichaFormacaoId] = useState<string|null>(null);
  const [fichaTurmaId,setFichaTurmaId] = useState<string|null>(null);
  const [filtroFormacaoId,setFiltroFormacaoId] = useState('');
  const inicialProcessada=useRef(false);
  const botoesFormacao=useRef<Record<string,HTMLButtonElement|null>>({});
  const ultimaFicha=useRef<string|null>(null);
  const fichaJaFoiAberta=useRef(false);
  const turmaInicialProcessada=useRef(false);
  const botoesTurma=useRef<Record<string,HTMLButtonElement|null>>({});
  const ultimaTurma=useRef<string|null>(null);
  const fichaTurmaJaFoiAberta=useRef(false);
  const [erro,setErro] = useState('');
  const [sucesso,setSucesso] = useState('');
  const atualRascunho=JSON.stringify({modo,formacaoExistenteId,formacao,turma,horarios,docenteId});
  const rascunhoAlterado=mostrarCadastro&&baseRascunho!==null&&baseRascunho!==atualRascunho;
  useEffect(()=>{
    if(mostrarCadastro&&!carregando&&baseRascunho===null)setBaseRascunho(atualRascunho);
  },[mostrarCadastro,carregando,baseRascunho,atualRascunho]);
  // A proteção do painel inclui o formulário filho "Gerir alunos" e operações em curso.
  const bloquearSaida=rascunhoAlterado||rascunhoGerirPendente||operacaoGerirEmCurso;
  useEffect(()=>{
    onRascunhoPendenteChange?.(bloquearSaida);
  },[onRascunhoPendenteChange,bloquearSaida]);
  useEffect(()=>()=>onRascunhoPendenteChange?.(false),[onRascunhoPendenteChange]);
  useEffect(()=>{
    if(!bloquearSaida)return;
    const aoSair=(evento:BeforeUnloadEvent)=>{evento.preventDefault();evento.returnValue='';};
    window.addEventListener('beforeunload',aoSair);
    return()=>window.removeEventListener('beforeunload',aoSair);
  },[bloquearSaida]);
  const limparCadastroDescartado=()=>{
    setMostrarCadastro(false);setConfirmarFechamento(false);setBaseRascunho(null);
    setFormacao(VAZIA_FORMACAO);setTurma(VAZIA_TURMA);setHorarios([horarioVazio()]);
    setModo('nova');setEtapa(0);
    setFormacaoExistenteId(formacoes[0]?.id??'');
    setDocenteId(docentes[0]?.id??'');
    setErro('');setSucesso('');setCampoErro(null);
  };
  const solicitarFechamento=()=>{
    if(salvando)return;
    if(precisaConfirmarSaidaCadastro(mostrarCadastro,rascunhoAlterado)){
      setConfirmarFechamento(true);
      return;
    }
    limparCadastroDescartado();
  };
  // Mesmo contrato de proteção R12 nas entradas Estudantes e Turmas.
  const encerrarGerirAlunos=()=>{
    setConfirmarSaidaGerir(false);setGerirTurmaId(null);
    setRascunhoGerirPendente(false);setOperacaoGerirEmCurso(false);
    setAvisoFechamentoGerir('');
  };
  const solicitarFechamentoGerirAlunos=()=>{
    if(operacaoGerirEmCurso){
      setAvisoFechamentoGerir('Aguarde a conclusão da operação antes de fechar.');
      return;
    }
    if(precisaConfirmarSaidaCadastro(!!gerirTurmaId,rascunhoGerirPendente)){
      setConfirmarSaidaGerir(true);
      return;
    }
    encerrarGerirAlunos();
  };
  const descartarGerirAlunos=()=>{
    if(operacaoGerirEmCurso)return;
    encerrarGerirAlunos();
  };
  useEffect(()=>{
    if(gerirTurmaId!==null){abriuGerirRef.current=true;return;}
    if(!abriuGerirRef.current)return;
    abriuGerirRef.current=false;
    origemGerirRef.current?.focus();
    origemGerirRef.current=null;
  },[gerirTurmaId]);
  const pedirFoco = (campo:string|null=null) =>
    setDestinoFoco(atual=>({numero:atual.numero+1,campo}));
  const limparErroCampo = () => {setErro('');setCampoErro(null);};
  const erroCampo=(id:string)=>campoErro?.campo===id?campoErro.mensagem:undefined;
  const pf = (campo:keyof FormacaoRascunho,valor:string|boolean) => {
    setFormacao(anterior=>({...anterior,[campo]:valor}));limparErroCampo();
  };
  const pt = (campo:keyof TurmaRascunho,valor:string) => {
    setTurma(anterior=>({...anterior,[campo]:valor}));limparErroCampo();
  };
  const editarHorario = (indice:number,campo:keyof Horario,valor:string) => {
    setHorarios(anterior=>anterior.map((h,i)=>i===indice?{...h,[campo]:valor}:h));
    limparErroCampo();
  };
  // O cadastro abre em diálogo; só o conteúdo da janela rola, não as listas.
  // Dar foco à etapa ou campo inválido após o React montar a nova etapa.
  useEffect(()=>{
    if(!mostrarCadastro||carregando||destinoFoco.numero===0)return;
    const frame=requestAnimationFrame(()=>{
      const alvo=destinoFoco.campo?document.getElementById(destinoFoco.campo):etapaVisivelRef.current;
      if(!alvo)return;
      const reduzido=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      alvo.scrollIntoView({block:'start',behavior:reduzido?'auto':'smooth'});
      alvo.focus({preventScroll:true});
    });
    return()=>cancelAnimationFrame(frame);
  },[mostrarCadastro,carregando,etapa,destinoFoco]);
  const carregar = useCallback(async()=>{
    setCarregando(true);
    const [f,t,d] = await Promise.all([
      supabase.from('formacoes').select('id,nome,tipo,descricao,publico_alvo,duracao_meses,carga_horaria_horas,publicada').order('nome'),
      supabase.from('turmas').select('id,formacao_id,docente_id,codigo,situacao,capacidade,horarios_semanais').order('created_at',{ascending:false}),
      podeGerir?supabase.from('educart_docentes_dev').select('id,nome_completo,situacao').eq('situacao','ativo').order('nome_completo'):
        Promise.resolve({data:[] as DocenteResumo[],error:null}),
    ]);
    if (f.error||t.error||d.error) {
      setErro('Não foi possível carregar a base de formações e turmas no DEV. Confira a migração e a autorização.');
    } else {
      setFormacoes((f.data??[]) as FormacaoResumo[]);
      setTurmas((t.data??[]) as TurmaResumo[]);
      setDocentes((d.data??[]) as DocenteResumo[]);
      setDocenteId(atual=>(d.data??[]).some(x=>x.id===atual)?atual:(d.data?.[0]?.id??''));
      setFormacaoExistenteId(atual=>(f.data??[]).some(x=>x.id===atual)?atual:(f.data?.[0]?.id??''));
    }
    setCarregando(false);
  },[supabase,podeGerir]);
  useEffect(()=>{void carregar();},[carregar]);

  // Entrada originada no cartão KPI: resolver o mesmo ID da consulta, uma única vez.
  useEffect(()=>{
    if(carregando||!formacaoInicialId||inicialProcessada.current)return;
    inicialProcessada.current=true;
    if(formacoes.some(f=>f.id===formacaoInicialId)){
      setFormacaoExistenteId(formacaoInicialId);
      ultimaFicha.current=formacaoInicialId;
      setFichaFormacaoId(formacaoInicialId);
    }else setErro('A formação selecionada não foi localizada na consulta autorizada do DEV.');
  },[carregando,formacaoInicialId,formacoes]);
  // Após fechar com Escape ou botão, devolver foco à ação da formação na listagem.
  useEffect(()=>{
    if(fichaFormacaoId!==null){fichaJaFoiAberta.current=true;return;}
    // No primeiro render o ID pode chegar do KPI antes de a janela abrir;
    // só recuperar foco depois de uma janela efetivamente aberta.
    if(fichaJaFoiAberta.current&&ultimaFicha.current){
      const id=ultimaFicha.current;
      fichaJaFoiAberta.current=false;
      ultimaFicha.current=null;
      botoesFormacao.current[id]?.focus();
    }
  },[fichaFormacaoId]);
  const abrirFicha=(id:string)=>{
    ultimaFicha.current=id;
    setFichaFormacaoId(id);
  };
  const iniciarTurmaDaFormacao=(id:string)=>{
    // Fixar a referência ANTES de abrir a etapa: nenhuma primeira edição
    // pode ser absorvida por um efeito executado após a interação.
    setBaseRascunho(JSON.stringify({modo:'existente',formacaoExistenteId:id,formacao,turma,horarios,docenteId}));
    setModo('existente');setFormacaoExistenteId(id);
    setEtapa(0);setMostrarCadastro(true);limparErroCampo();pedirFoco();
    setFichaFormacaoId(null);
  };
  // Resolver turma pelo ID trazido do KPI; nunca usar a posição na lista.
  useEffect(()=>{
    if(carregando||!turmaInicialId||turmaInicialProcessada.current)return;
    turmaInicialProcessada.current=true;
    if(turmas.some(t=>t.id===turmaInicialId)){
      ultimaTurma.current=turmaInicialId;
      setFiltroFormacaoId('');
      setFichaTurmaId(turmaInicialId);
    }else setErro('A turma selecionada não foi localizada na consulta autorizada do DEV.');
  },[carregando,turmaInicialId,turmas]);
  // Após fechar ficha ou gestão dos alunos, devolver foco ao botão de origem.
  useEffect(()=>{
    if(fichaTurmaId!==null){fichaTurmaJaFoiAberta.current=true;return;}
    if(fichaTurmaJaFoiAberta.current&&ultimaTurma.current&&!gerirTurmaId){
      const id=ultimaTurma.current;
      fichaTurmaJaFoiAberta.current=false;
      ultimaTurma.current=null;
      botoesTurma.current[id]?.focus();
    }
  },[fichaTurmaId,gerirTurmaId]);
  const abrirFichaTurma=(id:string)=>{ultimaTurma.current=id;setFichaTurmaId(id);};
  const abrirGestaoAlunosDaFicha=(id:string)=>{
    setGerirTurmaId(id);
    setFichaTurmaId(null);
  };
  const turmaFicha=turmas.find(t=>t.id===fichaTurmaId);
  const formacaoFicha=formacoes.find(f=>f.id===fichaFormacaoId);
  const turmasDaFicha=turmas.filter(t=>t.formacao_id===fichaFormacaoId);
  const turmasFiltradas=filtroFormacaoId?turmas.filter(t=>t.formacao_id===filtroFormacaoId):turmas;

  const formacaoEscolhida = useMemo(()=>formacoes.find(f=>f.id===formacaoExistenteId),[formacoes,formacaoExistenteId]);
  const tituloFormacao = modo==='nova'?normalize(formacao.nome):(formacaoEscolhida?.nome??'Não selecionada');
  // Os mesmos validadores atendem ao botão Continuar, à revisão e aos testes sintéticos.
  const falhaEtapa=(numero:number):FalhaCadastro|null=>validarEtapaCadastro(numero,{
    modo,formacaoExistente:Boolean(formacaoEscolhida),formacao,turma,horarios,docenteId,
    docentesAtivos:docentes.filter(d=>d.situacao==='ativo').map(d=>d.id),
  });
  const erroEtapa=(numero:number)=>falhaEtapa(numero)?.mensagem??'';
  const apontarErro=(numero:number,falha:FalhaCadastro)=>{
    setErro(falha.mensagem);setCampoErro(falha);setEtapa(numero);pedirFoco(falha.campo);
  };
  const avancar = () => {
    const proximo=avancarEtapaCadastro(modo,etapa,erroEtapa);
    if(proximo.erro){
      const falha=falhaEtapa(etapa);
      if(falha)apontarErro(etapa,falha);else setErro(proximo.erro);
      return;
    }
    limparErroCampo();setEtapa(proximo.etapa);pedirFoco();
  };
  const voltar = () => {
    limparErroCampo();setEtapa(voltarEtapaCadastro(modo,etapa));pedirFoco();
  };

  const dadosFormacao=()=>{
    const txt=(valor:string)=>normalize(valor)||null;
    const inteiro=(valor:string)=>valor.trim()===''?null:Number(valor);
    return {
      nome:normalize(formacao.nome), tipo:formacao.tipo, publicada:false,
      descricao:txt(formacao.descricao), publico_alvo:txt(formacao.publico_alvo),
      idade_minima:inteiro(formacao.idade_minima),
      exige_experiencia:formacao.exige_experiencia,
      duracao_meses:inteiro(formacao.duracao_meses),
      carga_horaria_horas:inteiro(formacao.carga_horaria_horas),
      ementa:txt(formacao.ementa), modulos_planejados:txt(formacao.modulos_planejados),
      avaliacao:txt(formacao.avaliacao), criterios_conclusao:txt(formacao.criterios_conclusao),
      chamada_curta:txt(formacao.chamada_curta), formato:formacao.formato,
      objetivos:txt(formacao.objetivos), disciplinas:txt(formacao.disciplinas),
      metodologia:txt(formacao.metodologia), competencias:txt(formacao.competencias),
      atividades_praticas:txt(formacao.atividades_praticas),
      certificacao:txt(formacao.certificacao), projeto_final:txt(formacao.projeto_final),
      materiais_inclusos:txt(formacao.materiais_inclusos),
      perguntas_frequentes:txt(formacao.perguntas_frequentes),
      valor_matricula_referencia_centavos:centavos(formacao.valor_matricula_reais),
      valor_mensalidade_referencia_centavos:centavos(formacao.valor_mensalidade_reais),
      quantidade_mensalidades_referencia:inteiro(formacao.quantidade_mensalidades_referencia),
    };
  };
  const salvarSolucaoRascunho=async()=>{
    if(salvando||carregando||!podeGerir||modo!=='nova')return;
    const primeira=[0,2].map(numero=>({numero,falha:falhaEtapa(numero)})).find(v=>v.falha);
    if(primeira?.falha){apontarErro(primeira.numero,primeira.falha);return;}
    if(!window.confirm('Guardar apenas a formação "'+normalize(formacao.nome)+
      '" como rascunho no Supabase DEV? Esta ação grava um novo cadastro, mas NÃO cria turma, matrícula, inscrição ou publicação.'))return;
    limparErroCampo();setSucesso('');setSalvando(true);
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=!authError&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];
      if(!papeis.includes('coordenacao'))throw Error('Somente Coordenação pode cadastrar soluções.');
      const {data,error}=await supabase.from('formacoes').insert(dadosFormacao()).select('id').single();
      if(error||!data?.id)throw Error('Não foi possível guardar a solução; confira se já existe outra com esse nome e as permissões.');
      await carregar();
      setModo('existente');setFormacaoExistenteId(data.id);setEtapa(0);pedirFoco();
      // Gravação explícita confirmada: a formação já não é rascunho pendente.
      setBaseRascunho(null);
      setSucesso('Solução gravada como rascunho no DEV. Você pode criar sua turma e escolher o professor depois. Nenhuma venda foi aberta.');
    }catch(e){setErro(e instanceof Error?e.message:'Erro de conexão; confira o cadastro antes de repetir.');}
    finally{setSalvando(false);}
  };

  const concluir = async(evento:FormEvent<HTMLFormElement>)=>{
    evento.preventDefault();
    if(salvando||!podeGerir||carregando)return;
    const etapas=etapasParaConcluir(modo);
    const primeira=etapas.map(numero=>({numero,falha:falhaEtapa(numero)})).find(v=>v.falha);
    if(primeira?.falha){apontarErro(primeira.numero,primeira.falha);return;}
    setSalvando(true);limparErroCampo();setSucesso('');
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
      if(!papeis.includes('coordenacao')) {setErro('Somente Coordenação autorizada pode concluir esta operação.');return;}
      const {data,error}=await supabase.rpc('educart_criar_formacao_turma_guiada_dev',{
        p_formacao_existente:modo==='existente'?formacaoExistenteId:null,
        p_formacao:modo==='nova'?dadosFormacao():{},
        p_turma:{...turma,docente_id:docenteId,codigo:normalize(turma.codigo).toUpperCase(),horarios_semanais:horarios.map(h=>({dia:Number(h.dia),inicio:h.inicio,fim:h.fim}))},
      });
      const resultado=Array.isArray(data)?data[0]:null;
      if(error||!resultado?.turma_id||!resultado?.formacao_id){
        setErro('Cadastro não concluído. Confira o código, os campos e as permissões; nenhuma publicação foi realizada.');
        return;
      }
      setSucesso('Formação e turma planejada gravadas com sucesso no DEV. Inscrições e pagamentos não foram criados.');
      setModo('existente');setFormacaoExistenteId(resultado.formacao_id as string);
      setTurma(VAZIA_TURMA);setHorarios([horarioVazio()]);setEtapa(0);setMostrarCadastro(false);
      setBaseRascunho(null);
      await carregar();
    } catch {setErro('Falha de conexão; confira as turmas existentes antes de tentar novamente.');}
    finally {setSalvando(false);}
  };
  const excluirFormacao = async (alvo:FormacaoResumo) => {
    // Somente DEV, Coordenação e cadastro sem turmas/módulos dependentes.
    if (!ACOES_ACADEMICAS_EXCLUSIVAS_DEV || !podeGerir || salvando || carregando || excluindoFormacaoId) return;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://esjrjzyvyhtzwgihcbsc.supabase.co') {
      setErro('Exclusão de formação indisponível fora do ambiente DEV.');return;
    }
    if (turmas.some(t=>t.formacao_id===alvo.id)) {
      setErro('Esta formação possui turmas vinculadas; resolva os vínculos antes de excluí-la.');return;
    }
    if (!window.confirm('Excluir definitivamente a formação "'+alvo.nome+'"? A exclusão não pode ser desfeita; vínculos com turmas ou módulos impedem a operação.')) return;
    setExcluindoFormacaoId(alvo.id);setErro('');setSucesso('');
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
      if (!papeis.includes('coordenacao')) {setErro('Somente a Coordenação pode excluir formações.');return;}
      // FKs ON DELETE RESTRICT são a última proteção de turmas e módulos.
      const {data,error}=await supabase.from('formacoes').delete().eq('id',alvo.id).select('id');
      if (error) {
        setErro(error.code==='23503'
          ? 'Exclusão bloqueada: há turmas, módulos ou outros registros vinculados.'
          : 'Não foi possível excluir a formação. Confira permissões e vínculos existentes.');
        return;
      }
      if (!data?.length) {setErro('A formação não foi excluída. Ela pode ter sido alterada ou seu acesso não permite a operação.');return;}
      setFichaFormacaoId(null);
      await carregar();
      setSucesso('Formação "'+alvo.nome+'" excluída do DEV.');
    } catch {setErro('Falha de conexão ao tentar excluir a formação.');}
    finally {setExcluindoFormacaoId(null);}
  };
  const excluirTurma = async (alvo:TurmaResumo) => {
    // Apenas exclusão de rascunho planejado, pela Coordenação e no DEV.
    if (!ACOES_ACADEMICAS_EXCLUSIVAS_DEV || !podeGerir || salvando || carregando || excluindoTurmaId || alvo.situacao!=='planejada') return;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL!=='https://esjrjzyvyhtzwgihcbsc.supabase.co') {
      setErro('Exclusão de turma indisponível fora do ambiente DEV.');
      return;
    }
    if (!window.confirm(`Excluir definitivamente a turma "${alvo.codigo}"? Essa ação não pode ser desfeita. Turmas com matrículas, aulas ou vínculos registrados não serão excluídas.`)) return;
    setExcluindoTurmaId(alvo.id);setErro('');setSucesso('');
    try {
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
      if (!papeis.includes('coordenacao')) {
        setErro('Somente a Coordenação autorizada pode excluir turmas.');
        return;
      }
      // O banco exige Coordenação (RLS) e restringe FKs de matrículas/aulas/vínculos.
      const {data,error}=await supabase.from('turmas').delete()
        .eq('id',alvo.id).eq('situacao','planejada').select('id');
      if (error) {
        setErro(error.code==='23503'
          ? 'Não é possível excluir: esta turma possui matrículas, aulas ou outros registros vinculados.'
          : 'Não foi possível excluir a turma. Confira as permissões e tente novamente.');
        return;
      }
      if (!data?.length) {
        setErro('A turma não foi excluída. Ela pode ter mudado de situação ou sua sessão não permite a operação.');
        return;
      }
      await carregar();
      setSucesso(`Turma "${alvo.codigo}" excluída do DEV.`);
    } catch {
      setErro('Falha de conexão ao tentar excluir a turma.');
    } finally {
      setExcluindoTurmaId(null);
    }
  };
  return <section className="admin-academico-panel" aria-label="Planejamento de formação e turma">
    <div className="admin-academico-section-head">
      <div><h2>Formações e turmas <AdminAjuda titulo="Formações e turmas" descricao="Consulte primeiro as turmas cadastradas; abra a criação guiada somente quando necessário." /></h2>
        <p>Turmas, horários e docentes reunidos na mesma base institucional.</p></div>
      <button className="admin-btn admin-btn-primary" type="button" onClick={()=>{
        if(mostrarCadastro){solicitarFechamento();return;}
        // Captura síncrona do estado de abertura (não depender do useEffect).
        setBaseRascunho(atualRascunho);setEtapa(0);pedirFoco();
        setMostrarCadastro(true);limparErroCampo();
      }} disabled={carregando||salvando}>
        {mostrarCadastro?'Fechar cadastro':'Criar formação ou turma'}
      </button>
      {rascunhoAlterado&&<span role="status" aria-live="polite"
        className="admin-academico-note">Alterações não salvas — use Fechar cadastro para escolher entre permanecer ou descartar.</span>}
    </div>
    {erro&&!mostrarCadastro&&<p className="admin-academico-message" role="alert">{erro}</p>}
    <div className="admin-academico-actions" role="group" aria-label="Consultar formações e turmas">
      <button type="button" className="admin-btn admin-btn-secondary" aria-haspopup="dialog"
        onClick={()=>setListaAberta('formacoes')} disabled={carregando}>Formações ({formacoes.length})</button>
      <button type="button" className="admin-btn admin-btn-secondary" aria-haspopup="dialog"
        onClick={()=>setListaAberta('turmas')} disabled={carregando}>Turmas ({turmas.length})</button>
    </div>
    {listaAberta==='formacoes'&&<AdminRegistroModalDev titulo="Formações" descricao="Formações cadastradas e ações disponíveis no Supabase DEV" onClose={()=>setListaAberta(null)} amplo>
    <section className="admin-academico-panel" aria-label="Formações existentes" style={{marginTop:20}}>
      {erro&&<p className="admin-academico-message" role="alert">{erro}</p>}
      {sucesso&&<p className="admin-academico-message" role="status">{sucesso}</p>}
      <div className="admin-academico-section-head">
        <h3>Formações existentes ({formacoes.length})</h3>
        <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>void carregar()} disabled={carregando}>Atualizar formações</button>
      </div>
      {carregando&&<p role="status">Consultando formações no DEV...</p>}
      {!carregando&&!formacoes.length&&<p>Nenhuma formação encontrada com as permissões atuais.</p>}
      <div className="admin-academico-fichas">
        {formacoes.map(f=><article className="admin-academico-ficha educart-formacao-card" key={f.id}>
          <strong>{f.nome}</strong>
          <small>{f.tipo==='oficina'?'Oficina':f.tipo==='curso'?'Curso':f.tipo} · {turmas.filter(t=>t.formacao_id===f.id).length} turma(s) vinculada(s)</small>
          <div style={{marginTop:10}}>
            <button ref={el=>{botoesFormacao.current[f.id]=el;}} type="button"
              className="admin-btn admin-btn-secondary" aria-haspopup="dialog"
              title="Abre a ficha existente. Edição auditada permanece pendente."
              onClick={()=>abrirFicha(f.id)}>Gerir formação</button>
            {podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<button type="button"
              className="admin-btn admin-btn-secondary" style={{marginLeft:8}}
              disabled={salvando||carregando||!!excluindoFormacaoId||turmas.some(t=>t.formacao_id===f.id)}
              title={turmas.some(t=>t.formacao_id===f.id)?'Exclusão bloqueada: existem turmas vinculadas':'Excluir formação sem turmas do DEV'}
              onClick={()=>void excluirFormacao(f)}>
              {excluindoFormacaoId===f.id?'Excluindo...':'Excluir formação'}
            </button>}
          </div>
        </article>)}
      </div>
    </section>
    </AdminRegistroModalDev>}
    {listaAberta==='turmas'&&<AdminRegistroModalDev titulo="Turmas" descricao="Turmas cadastradas, filtros e ações disponíveis no Supabase DEV" onClose={()=>setListaAberta(null)} amplo>
    <section className="admin-academico-panel" aria-label="Turmas existentes" style={{marginTop:20}}> 
      <div className="admin-academico-section-head">
        <h3>Turmas existentes ({turmasFiltradas.length})</h3>
        <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>void carregar()} disabled={carregando}>Atualizar turmas</button>
      </div>
      <label className="admin-academico-label" htmlFor="pgt-filtro-formacao">Filtrar turmas por formação</label>
      <select id="pgt-filtro-formacao" className="filter-select"
        value={filtroFormacaoId} onChange={e=>setFiltroFormacaoId(e.target.value)}>
        <option value="">Todas as formações</option>
        {formacoes.map(f=><option key={f.id} value={f.id}>{f.nome}</option>)}
      </select>
      {!carregando&&turmasFiltradas.length===0&&<p>Nenhuma turma encontrada para o filtro selecionado.</p>}
      {turmasFiltradas.map(t=><article className="admin-academico-ficha educart-turma-card" key={t.id}>
        <div className="educart-turma-card-heading">
          <strong>{nomeTurmaSemHorario(t.codigo)}</strong>
          <span className="educart-turma-card-situacao">{situacaoLegivel(t.situacao)}</span>
        </div>
        <div className="educart-turma-card-meta">
          <div>
            <span>Formação e horário</span>
            <p>{formacoes.find(f=>f.id===t.formacao_id)?.nome||'Formação não identificada'} · {horariosLegiveis(t.horarios_semanais)}</p>
          </div>
          <div>
            <span>Docente</span>
            <p>{docentes.find(d=>d.id===t.docente_id)?.nome_completo||'Não identificado no acesso atual'}</p>
          </div>
          <div>
            <span>Vagas</span>
            <p>{t.capacidade===null?'Não informada':t.capacidade}</p>
          </div>
        </div>
        <div className="educart-turma-card-actions">
          <button ref={el=>{botoesTurma.current[t.id]=el;}} type="button"
            className="admin-btn admin-btn-secondary" aria-haspopup="dialog"
            title="Consultar horários, formação, capacidade e docente desta turma"
            onClick={()=>abrirFichaTurma(t.id)}>Gerir turma</button>
          {podeGerir&&<>
            <button type="button" className="admin-btn admin-btn-secondary"
              onClick={e=>{origemGerirRef.current=e.currentTarget;setGerirTurmaId(t.id);}}>Gerir alunos</button>
            {ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&t.situacao==='planejada'&&
              <button type="button" className="admin-btn admin-btn-secondary"
                onClick={()=>void excluirTurma(t)}
                disabled={salvando||carregando||!!excluindoTurmaId||t.situacao!=='planejada'}
                title={t.situacao==='planejada'?'Excluir esta turma planejada do DEV':'Só turmas planejadas podem ser excluídas'}>
                {excluindoTurmaId===t.id?'Excluindo...':'Excluir turma'}
              </button>}
          </>}
        </div>
      </article>)}
    </section>
    </AdminRegistroModalDev>}
    {confirmarFechamento&&<AdminRegistroModalDev titulo="Descartar o cadastro em andamento?"
      descricao="Os campos ainda não foram salvos" onClose={()=>setConfirmarFechamento(false)}>
      <p>Se você fechar, o que foi preenchido desde a abertura será descartado. Permanecer mantém todos os campos e a etapa atual.</p>
      <div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>setConfirmarFechamento(false)}>Permanecer no cadastro</button>
        <button type="button" className="admin-btn admin-btn-primary"
          onClick={limparCadastroDescartado}>Descartar alterações e fechar</button>
      </div>
    </AdminRegistroModalDev>}
    {mostrarCadastro&&<AdminRegistroModalDev
      titulo="Nova formação e turma"
      descricao={'Etapa '+(etapa+1)+' de 6 · '+['Solução','Conteúdo','Oferta','Professor','Turma','Revisão'][etapa]+' · Supabase DEV'}
      onClose={solicitarFechamento} amplo cadastro>
    <span className="admin-kicker">EDUCART 1.1 · PLANEJAMENTO GUIADO · SOMENTE DEV</span>
    <h2>Nova formação e turma <AdminAjuda titulo="Planejamento guiado" descricao={DESCRICAO}
      passos="Escolha criar uma formação ou reutilizar outra; preencha a turma, revise e salve uma única vez."
      cuidado="Salvar como planejada não abre inscrições nem confirma pagamentos." /></h2>
    <p>{DESCRICAO} A nova turma sempre é salva como <strong>Planejada</strong> e usa a mesma base acadêmica da EducART.</p>
    {erro&&<p className="admin-academico-message" role="alert">{erro}</p>}
    {sucesso&&<p className="admin-academico-message" role="status">{sucesso}</p>}
    {!podeGerir&&<p className="admin-academico-note">Somente Coordenação pode cadastrar uma nova formação completa. A Secretaria mantém as permissões específicas para planejamento de turmas no DEV.</p>}
    <nav aria-label="Etapas do cadastro" className="admin-academico-tabs" style={{display:'flex',flexWrap:'wrap',gap:8,margin:'18px 0'}}>
      {['1. Solução','2. Conteúdo','3. Oferta','4. Professor','5. Turma','6. Revisão'].map((nome,i)=>
        <span key={nome} aria-current={etapa===i?'step':undefined}
          className={'admin-academico-tab'+(etapa===i?' active':'')}
          style={{padding:'8px 12px',borderRadius:12,opacity:etapa===i?1:.68}}>{nome}</span>)}
    </nav>
    {carregando?<p role="status">Consultando o Supabase DEV...</p>:
      <form onSubmit={concluir} className="admin-academico-panel" noValidate>
        <div ref={etapaVisivelRef} role="group" tabIndex={-1}
          aria-label={'Etapa '+(etapa+1)+' do planejamento guiado'}
          style={{scrollMarginTop:96}}>
        {etapa===0&&<div style={{display:'grid',gap:14}}>
          <h3>Que formação vamos oferecer?</h3>
          <fieldset style={{display:'flex',gap:20,border:0,padding:0,flexWrap:'wrap'}}>
            <legend className="admin-academico-label">Operação</legend>
            <label><input type="radio" name="modo-formacao" checked={modo==='nova'} onChange={()=>{setModo('nova');limparErroCampo();}}/> Nova solução (curso/oficina) e primeira turma</label>
            <label><input type="radio" name="modo-formacao" checked={modo==='existente'} onChange={()=>{setModo('existente');limparErroCampo();}} disabled={!formacoes.length}/> Nova turma de formação existente</label>
          </fieldset>
          {modo==='existente'?<div>
            <label className="admin-academico-label" htmlFor="pgt-formacao-existente">Formação existente *</label>
            <select id="pgt-formacao-existente" className="filter-select" value={formacaoExistenteId}
              aria-invalid={Boolean(erroCampo('pgt-formacao-existente'))}
              aria-describedby={erroCampo('pgt-formacao-existente')?'pgt-formacao-existente-erro':undefined}
              onChange={e=>{setFormacaoExistenteId(e.target.value);limparErroCampo();}} required>
              
              {formacoes.map(f=><option value={f.id} key={f.id}>{f.nome}</option>)}
            </select>
            {erroCampo('pgt-formacao-existente')&&<small role="alert" id="pgt-formacao-existente-erro" className="admin-academico-message">{erroCampo('pgt-formacao-existente')}</small>}
            <p className="admin-academico-note">Dados pedagógicos preservados. Esta nova turma receberá seus próprios horários.</p>
          </div>:<>
            <Campo erro={erroCampo('pgt-nome')} id="pgt-nome" nome="Nome oficial da solução" valor={formacao.nome} mudar={v=>pf('nome',v)} obrigatorio maxLength={120} placeholder="Ex.: Formação de Atores"/>
            <div><label className="admin-academico-label" htmlFor="pgt-tipo">Tipo de solução *</label>
              <select id="pgt-tipo" className="filter-select" value={formacao.tipo} onChange={e=>pf('tipo',e.target.value)}><option value="curso">Curso</option><option value="oficina">Oficina</option></select></div>
            <Campo erro={erroCampo('pgt-chamada')} id="pgt-chamada" nome="Chamada curta para o catálogo" valor={formacao.chamada_curta} mudar={v=>pf('chamada_curta',v)} maxLength={180} placeholder="Ex.: Dois anos de criação e presença cênica"/>
            <Texto id="pgt-proposta" nome="Qual é a proposta desta solução?" valor={formacao.descricao} mudar={v=>pf('descricao',v)}/>
            <Texto id="pgt-objetivos" nome="Quais objetivos e resultados ela oferece?" valor={formacao.objetivos} mudar={v=>pf('objetivos',v)}/>
            <div><label htmlFor="pgt-formato" className="admin-academico-label">Formato de realização *</label>
              <select id="pgt-formato" className="filter-select" value={formacao.formato} onChange={e=>pf('formato',e.target.value)}>
                <option value="presencial">Presencial</option><option value="online">Online</option><option value="hibrido">Híbrido</option>
              </select></div>
            <Campo erro={erroCampo('pgt-publico')} id="pgt-publico" nome="Para quem ela foi criada?" valor={formacao.publico_alvo} mudar={v=>pf('publico_alvo',v)} placeholder="Ex.: Iniciantes a partir de 14 anos"/>
            <Campo erro={erroCampo('pgt-idade')} id="pgt-idade" nome="Idade mínima desta solução" tipo="number" min={0} max={120} valor={formacao.idade_minima} mudar={v=>pf('idade_minima',v)}/>
            <label><input type="checkbox" checked={formacao.exige_experiencia} onChange={e=>pf('exige_experiencia',e.target.checked)}/> Exige experiência anterior</label>
            <div className="admin-academico-dates">
              <Campo erro={erroCampo('pgt-duracao')} id="pgt-duracao" nome="Duração prevista (meses)" tipo="number" min={1} max={240} valor={formacao.duracao_meses} mudar={v=>pf('duracao_meses',v)}/>
              <Campo erro={erroCampo('pgt-carga')} id="pgt-carga" nome="Carga horária total prevista" tipo="number" min={1} max={10000} valor={formacao.carga_horaria_horas} mudar={v=>pf('carga_horaria_horas',v)}/>
            </div>
          </>}
        </div>}
        {etapa===1&&<div style={{display:'grid',gap:14}}>
          <h3>Como esta formação funciona pedagogicamente?</h3>
          <p className="admin-academico-note">Os campos podem permanecer em branco e ser detalhados posteriormente; não geram módulos ou certificados automaticamente.</p>
          <Texto id="pgt-ementa" nome="Quais conteúdos serão ensinados?" valor={formacao.ementa} mudar={v=>pf('ementa',v)}/>
          <Texto id="pgt-modulos" nome="Como o programa se divide em módulos?" valor={formacao.modulos_planejados} mudar={v=>pf('modulos_planejados',v)} placeholder="Resumo pedagógico, não cria módulos reais"/>
          <Texto id="pgt-avaliacao" nome="Haverá avaliação ou atividade final?" valor={formacao.avaliacao} mudar={v=>pf('avaliacao',v)}/>
          <Texto id="pgt-disciplinas" nome="Quais disciplinas ou áreas compõem o curso? (uma por linha)" valor={formacao.disciplinas} mudar={v=>pf('disciplinas',v)} placeholder="Ex.: Interpretação teatral; improvisação; expressão corporal e vocal"/>
          <Texto id="pgt-metodologia" nome="Como será a metodologia de ensino?" valor={formacao.metodologia} mudar={v=>pf('metodologia',v)}/>
          <Texto id="pgt-competencias" nome="Quais habilidades e competências serão desenvolvidas?" valor={formacao.competencias} mudar={v=>pf('competencias',v)}/>
          <Texto id="pgt-praticas" nome="Quais atividades práticas, apresentações ou oficinas haverá?" valor={formacao.atividades_praticas} mudar={v=>pf('atividades_praticas',v)}/>
          <Texto id="pgt-conclusao" nome="Quais serão os critérios de conclusão?" valor={formacao.criterios_conclusao} mudar={v=>pf('criterios_conclusao',v)}/>
          <Texto id="pgt-certificacao" nome="Qual certificado é oferecido e por quem?" valor={formacao.certificacao} mudar={v=>pf('certificacao',v)} placeholder="Ex.: Certificado de conclusão de curso livre"/>
          <Texto id="pgt-projeto-final" nome="Haverá espetáculo, mostra ou projeto final?" valor={formacao.projeto_final} mudar={v=>pf('projeto_final',v)}/>
        </div>}
        {etapa===3&&<div style={{display:'grid',gap:14}}>
          <h3>Professor responsável</h3>
          <p className="admin-academico-note">Escolha um docente já cadastrado na aba Docentes. Um professor pode participar de diferentes turmas, sem criar outra identidade.</p>
          <p className="admin-academico-note">Docente escolhido: {docentes.find(d=>d.id===docenteId)?.nome_completo||'A definir'}</p>
          <p className="admin-academico-note">Se o professor ainda não aparece aqui, abra a aba Docentes para cadastrá-lo e depois retorne a esta etapa.</p>
          <div><label className="admin-academico-label" htmlFor="pgt-docente">Docente responsável * (cadastro existente)</label>
            <select id="pgt-docente" className="filter-select" required value={docenteId}
              aria-invalid={Boolean(erroCampo('pgt-docente'))}
              aria-describedby={erroCampo('pgt-docente')?'pgt-docente-erro':undefined}
              onChange={e=>{setDocenteId(e.target.value);limparErroCampo();}}>
              <option value="">Selecione o(a) professor(a)</option>
              {docentes.map(d=><option key={d.id} value={d.id}>{d.nome_completo}</option>)}
            </select>
            {erroCampo('pgt-docente')&&<small role="alert" id="pgt-docente-erro" className="admin-academico-message">{erroCampo('pgt-docente')}</small>}
            {!docentes.length&&<p className="admin-academico-note" role="alert">Cadastre um docente ativo na aba Docentes antes de criar a turma.</p>}
          </div>
        </div>}
        {etapa===2&&<div style={{display:'grid',gap:14}}>
          <h3>Como apresentaremos a oferta comercial?</h3>
          <p className="admin-academico-note">Campos informativos, derivados da ficha da Formação de Atores 1.0. Não criam cobrança, plano R11 ou anúncio público.</p>
          <div className="admin-academico-dates">
            <Campo erro={erroCampo('pgt-matricula-preco')} id="pgt-matricula-preco" nome="Preço de matrícula (R$)" valor={formacao.valor_matricula_reais} mudar={v=>pf('valor_matricula_reais',v)} placeholder="50,00"/>
            <Campo erro={erroCampo('pgt-mensalidade-preco')} id="pgt-mensalidade-preco" nome="Mensalidade de referência (R$)" valor={formacao.valor_mensalidade_reais} mudar={v=>pf('valor_mensalidade_reais',v)} placeholder="320,00"/>
          </div>
          <Campo erro={erroCampo('pgt-mensalidades')} id="pgt-mensalidades" nome="Quantidade prevista de mensalidades" tipo="number" min={1} max={120}
            valor={formacao.quantidade_mensalidades_referencia} mudar={v=>pf('quantidade_mensalidades_referencia',v)}
            ajuda="O plano financeiro de cada estudante continua independente e sujeito à conferência."/>
          <Texto id="pgt-materiais" nome="Quais materiais, atividades ou benefícios estão incluídos?" valor={formacao.materiais_inclusos} mudar={v=>pf('materiais_inclusos',v)}/>
          <Texto id="pgt-faq" nome="Quais são as perguntas frequentes e respostas da oferta?" valor={formacao.perguntas_frequentes} mudar={v=>pf('perguntas_frequentes',v)}/>
          <p className="admin-academico-note">Para vender, precisaremos aprovar separadamente a publicação desta solução no catálogo e adaptar a inscrição pública à turma escolhida.</p>
        </div>}
        {etapa===4&&<div style={{display:'grid',gap:14}}>
          <h3>Como será a turma de {tituloFormacao}?</h3>
          <Campo erro={erroCampo('pgt-codigo')} id="pgt-codigo" nome="Código identificador da turma" valor={turma.codigo} mudar={v=>pt('codigo',v)} obrigatorio maxLength={40} placeholder="Ex.: ATORES-2027-T1"/>
          <div className="admin-academico-dates">
            <Campo erro={erroCampo('pgt-inicio')} id="pgt-inicio" nome="Início das aulas" tipo="date" valor={turma.inicio_em} mudar={v=>pt('inicio_em',v)}/>
            <Campo erro={erroCampo('pgt-fim')} id="pgt-fim" nome="Previsão de encerramento" tipo="date" valor={turma.termina_em} mudar={v=>pt('termina_em',v)}/>
          </div>
          <h3>Horários próprios desta turma</h3>
          <p className="admin-academico-note">Escolha os dias e os intervalos de cada encontro. Nenhum horário será herdado de outra turma.</p>
          {horarios.map((h,i)=><div key={i} className="admin-academico-panel" style={{display:'grid',gap:10}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:10}}>
              <strong>Encontro semanal {i+1}</strong>
              {horarios.length>1&&<button className="admin-btn admin-btn-secondary" type="button"
                onClick={()=>setHorarios(a=>a.filter((_,j)=>i!==j))}>Remover</button>}
            </div>
            <div><label htmlFor={'pgt-dia-'+i} className="admin-academico-label">Dia da semana *</label>
              <select className="filter-select" id={'pgt-dia-'+i} value={h.dia}
                aria-invalid={Boolean(erroCampo('pgt-dia-'+i))}
                aria-describedby={erroCampo('pgt-dia-'+i)?'pgt-dia-'+i+'-erro':undefined}
                onChange={e=>editarHorario(i,'dia',e.target.value)}>
                <option value="">Selecione o dia</option>
                {DIAS.map((d,j)=><option key={j} value={String(j)}>{d}</option>)}
              </select>
              {erroCampo('pgt-dia-'+i)&&<small role="alert" id={'pgt-dia-'+i+'-erro'} className="admin-academico-message">{erroCampo('pgt-dia-'+i)}</small>}
              </div>
            <div className="admin-academico-dates">
              <div><label className="admin-academico-label" htmlFor={'pgt-hora-inicio-'+i}>Das *</label>
                <input className="search-input admin-academico-input" type="time" id={'pgt-hora-inicio-'+i}
                  aria-invalid={Boolean(erroCampo('pgt-hora-inicio-'+i))}
                  aria-describedby={erroCampo('pgt-hora-inicio-'+i)?'pgt-hora-inicio-'+i+'-erro':undefined}
                  value={h.inicio} onChange={e=>editarHorario(i,'inicio',e.target.value)}/>
                  {erroCampo('pgt-hora-inicio-'+i)&&<small role="alert" id={'pgt-hora-inicio-'+i+'-erro'} className="admin-academico-message">{erroCampo('pgt-hora-inicio-'+i)}</small>}</div>
              <div><label className="admin-academico-label" htmlFor={'pgt-hora-fim-'+i}>Até *</label>
                <input className="search-input admin-academico-input" type="time" id={'pgt-hora-fim-'+i}
                  aria-invalid={Boolean(erroCampo('pgt-hora-fim-'+i))}
                  aria-describedby={erroCampo('pgt-hora-fim-'+i)?'pgt-hora-fim-'+i+'-erro':undefined}
                  value={h.fim} onChange={e=>editarHorario(i,'fim',e.target.value)}/>
                  {erroCampo('pgt-hora-fim-'+i)&&<small role="alert" id={'pgt-hora-fim-'+i+'-erro'} className="admin-academico-message">{erroCampo('pgt-hora-fim-'+i)}</small>}</div>
            </div>
          </div>)}
          <button type="button" className="admin-btn admin-btn-secondary" disabled={horarios.length>=7} id="pgt-adicionar-horario"
            onClick={()=>{setHorarios(a=>[...a,horarioVazio()]);limparErroCampo();}}>+ Adicionar outro dia/horário</button>
          <Campo erro={erroCampo('pgt-local')} id="pgt-local" nome="Local das aulas" valor={turma.local_nome} mudar={v=>pt('local_nome',v)} placeholder="Ex.: Casa Gameleira" maxLength={150}/>
          <Campo erro={erroCampo('pgt-endereco')} id="pgt-endereco" nome="Endereço ou referência do local" valor={turma.local_endereco} mudar={v=>pt('local_endereco',v)} maxLength={500}/>
          <Campo erro={erroCampo('pgt-vagas')} id="pgt-vagas" nome="Capacidade de vagas" tipo="number" min={1} max={500} valor={turma.capacidade} mudar={v=>pt('capacidade',v)}/>
          <div className="admin-academico-dates">
            <Campo erro={erroCampo('pgt-abertura')} id="pgt-abertura" nome="Abertura prevista das inscrições" tipo="date" valor={turma.inscricoes_abrem_em} mudar={v=>pt('inscricoes_abrem_em',v)}/>
            <Campo erro={erroCampo('pgt-encerramento')} id="pgt-encerramento" nome="Encerramento previsto das inscrições" tipo="date" valor={turma.inscricoes_encerram_em} mudar={v=>pt('inscricoes_encerram_em',v)}/>
          </div>
          <p className="admin-academico-note">A turma será salva como Planejada. Datas de inscrição não significam abertura automática ao público.</p>
        </div>}
        {etapa===5&&<div className="admin-academico-panel">
          <h3>Revise os dados antes de salvar</h3>
          <dl>
            <dt>Formação</dt><dd>{tituloFormacao} · {modo==='nova'?formacao.tipo:'programa já cadastrado'}</dd>
            {modo==='nova'&&<><dt>Investimento editorial</dt><dd>Matrícula: {moeda(formacao.valor_matricula_reais)} · Mensalidade: {moeda(formacao.valor_mensalidade_reais)} · {formacao.quantidade_mensalidades_referencia||'A definir'} mensalidades previstas</dd></>}
            <dt>Turma</dt><dd>{turma.codigo.trim().toUpperCase()||'Não preenchida'}</dd>
            <dt>Período</dt><dd>{turma.inicio_em||'A definir'} até {turma.termina_em||'A definir'}</dd>
            <dt>Horários desta turma</dt>
            <dd>{horarios.map((h,i)=><p key={i}>{DIAS[Number(h.dia)]||'Dia não informado'} · {h.inicio}–{h.fim}</p>)}</dd>
            <dt>Local / responsável</dt><dd>{turma.local_nome||'A definir'} · {docentes.find(d=>d.id===docenteId)?.nome_completo||'Docente não selecionado'}</dd>
            <dt>Vagas</dt><dd>{turma.capacidade||'A definir'}</dd>
            <dt>Inscrições previstas</dt><dd>{turma.inscricoes_abrem_em||'A definir'} até {turma.inscricoes_encerram_em||'A definir'}</dd>
            <dt>Status inicial</dt><dd><strong>Planejada — não publicada</strong></dd>
          </dl>
          {modo==='nova'&&<p className="admin-academico-note">A formação será criada como não publicada. Ementa, avaliação e conclusão, se informadas, ficam armazenadas como planejamento.</p>}
          <p className="admin-academico-note">Salvar grava formação e turma em uma única operação atômica. Não matricula pessoas, não lança cobranças e não envia mensagens.</p>
        </div>}
        </div>
        <div className="admin-academico-wizard-actions" style={{display:'flex',flexWrap:'wrap',gap:12,marginTop:20}}>
          {etapa===2&&modo==='nova'&&<div>
            <button className="admin-btn admin-btn-secondary" type="button" disabled={salvando||!podeGerir}
              onClick={()=>void salvarSolucaoRascunho()}>
              {salvando?'Salvando...':'Guardar apenas a formação (sem turma)'}
            </button>
            <p className="admin-academico-note">Grava um rascunho no DEV somente após confirmação. Não cria turma, matrícula, inscrição ou publicação.</p>
          </div>}
          {etapa>0&&<button type="button" className="admin-btn admin-btn-secondary" onClick={voltar} disabled={salvando}>← Voltar</button>}
          {etapa<5?<button type="button" className="admin-btn admin-btn-primary" onClick={avancar}>Continuar →</button>
            :<button type="submit" className="admin-btn admin-btn-primary" disabled={!podeGerir||salvando}>
              {salvando?'Salvando...':modo==='nova'?'Salvar formação e turma planejada':'Salvar nova turma planejada'}
            </button>}
        </div>
      </form>}
    </AdminRegistroModalDev>}
    {formacaoFicha&&<AdminRegistroModalDev
      titulo={'Formação · '+formacaoFicha.nome}
      descricao="Ficha existente do Supabase DEV · consulta sem alterações"
      onClose={()=>setFichaFormacaoId(null)} amplo>
      <dl className="admin-registro-profile-data">
        <div><dt>Nome</dt><dd>{formacaoFicha.nome}</dd></div>
        <div><dt>Tipo</dt><dd>{formacaoFicha.tipo==='curso'?'Curso':formacaoFicha.tipo==='oficina'?'Oficina':formacaoFicha.tipo}</dd></div>
        <div><dt>Descrição</dt><dd>{formacaoFicha.descricao||'Não informada'}</dd></div>
        <div><dt>Público-alvo</dt><dd>{formacaoFicha.publico_alvo||'Não informado'}</dd></div>
        <div><dt>Duração</dt><dd>{formacaoFicha.duracao_meses===null?'Não informada':formacaoFicha.duracao_meses+' meses'}</dd></div>
        <div><dt>Carga horária</dt><dd>{formacaoFicha.carga_horaria_horas===null?'Não informada':formacaoFicha.carga_horaria_horas+' horas'}</dd></div>
        <div><dt>Publicação do cadastro DEV</dt><dd>{formacaoFicha.publicada?'Marcada como publicada':'Não publicada no cadastro DEV'}</dd></div>
      </dl>
      <p className="admin-academico-note">A visibilidade editorial de um cartão no portal é independente do campo publicada do cadastro DEV. Esta ficha não permite editar nem publicar.</p>
      <h3>Turmas vinculadas ({turmasDaFicha.length})</h3>
      {!turmasDaFicha.length?<p>Esta formação ainda não possui turmas cadastradas no DEV.</p>:
        <ul>{turmasDaFicha.map(t=><li key={t.id}>
          {nomeTurmaSemHorario(t.codigo)} · {situacaoLegivel(t.situacao)}
        </li>)}</ul>}
      <div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>{
          setFiltroFormacaoId(formacaoFicha.id);setFichaFormacaoId(null);setListaAberta('turmas');
        }}>Filtrar turmas desta formação</button>
        {podeGerir&&<button type="button" className="admin-btn admin-btn-primary"
          onClick={()=>iniciarTurmaDaFormacao(formacaoFicha.id)}>Criar turma nesta formação</button>}
        {podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<button type="button"
          className="admin-btn admin-btn-secondary"
          disabled={salvando||carregando||!!excluindoFormacaoId||turmasDaFicha.length>0}
          title={turmasDaFicha.length?'Remova os vínculos de turma antes de excluir':'Excluir formação sem turmas do DEV'}
          onClick={()=>void excluirFormacao(formacaoFicha)}>
          {excluindoFormacaoId===formacaoFicha.id?'Excluindo...':'Excluir formação'}
        </button>}
      </div>
    </AdminRegistroModalDev>}
    {turmaFicha&&<AdminRegistroModalDev
      titulo={'Turma · '+nomeTurmaSemHorario(turmaFicha.codigo)}
      descricao="Ficha existente do Supabase DEV · consulta sem alterações"
      onClose={()=>setFichaTurmaId(null)} amplo>
      <dl className="admin-registro-profile-data">
        <div><dt>Turma</dt><dd>{nomeTurmaSemHorario(turmaFicha.codigo)}</dd></div>
        <div><dt>Formação</dt><dd>{formacoes.find(f=>f.id===turmaFicha.formacao_id)?.nome||'Não identificada no acesso atual'}</dd></div>
        <div><dt>Situação</dt><dd>{situacaoLegivel(turmaFicha.situacao)}</dd></div>
        <div><dt>Horários</dt><dd>{horariosLegiveis(turmaFicha.horarios_semanais)}</dd></div>
        <div><dt>Capacidade</dt><dd>{turmaFicha.capacidade===null?'Não informada':turmaFicha.capacidade}</dd></div>
        <div><dt>Docente cadastrado</dt><dd>{docentes.find(d=>d.id===turmaFicha.docente_id)?.nome_completo||'Não identificado no acesso atual'}</dd></div>
      </dl>
      <p className="admin-academico-note">Esta ficha consulta uma turma existente e não altera matrícula, situação, publicação ou histórico.</p>
      {podeGerir&&<div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-primary"
          onClick={()=>{origemGerirRef.current=botoesTurma.current[turmaFicha.id];abrirGestaoAlunosDaFicha(turmaFicha.id);}}>Gerir alunos</button>
      </div>}
    </AdminRegistroModalDev>}
    {gerirTurmaId&&<AdminRegistroModalDev
      titulo={'Gerir alunos · '+nomeTurmaSemHorario(turmas.find(t=>t.id===gerirTurmaId)?.codigo??'Turma')}
      descricao={'Vínculos existentes e cadastro auditado R12 · Supabase '+(ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD')+' · sem exclusão de matrículas'}
      onClose={confirmarSaidaGerir?()=>setConfirmarSaidaGerir(false):solicitarFechamentoGerirAlunos} amplo cadastro>
      {confirmarSaidaGerir&&<div className="admin-academico-panel" role="group" aria-label="Confirmar saída da gestão de alunos">
        <p role="alert">Ao descartar, os dados preenchidos neste formulário serão perdidos. Permanecer conserva tudo que foi digitado.</p>
        <div className="admin-academico-actions">
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>setConfirmarSaidaGerir(false)}>Permanecer no cadastro</button>
          <button type="button" className="admin-btn admin-btn-primary"
            onClick={descartarGerirAlunos}>Descartar alterações e sair</button>
        </div>
      </div>}
      <div style={confirmarSaidaGerir?{display:'none'}:undefined}>
        <AdminVincularEstudanteTurmaDev key={gerirTurmaId} supabase={supabase}
          podeGerir={podeGerir} turmaInicialId={gerirTurmaId}
          onRascunhoPendenteChange={setRascunhoGerirPendente}
          onOperacaoEmCursoChange={setOperacaoGerirEmCurso}/>
        {avisoFechamentoGerir&&<p role="alert" className="admin-academico-message">{avisoFechamentoGerir}</p>}
        <div className="admin-academico-actions">
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={solicitarFechamentoGerirAlunos}>Cancelar / Fechar</button>
        </div>
      </div>
    </AdminRegistroModalDev>}
  </section>;
}
