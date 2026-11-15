'use client';
/** Clientes EducART 1.1: leitura dos contatos existentes no DEV, sem importar, deduplicar fisicamente ou alterar matrículas. */
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {ACOES_ACADEMICAS_EXCLUSIVAS_DEV} from '@/lib/supabase/client';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {AdminVincularEstudanteTurmaDev} from '@/components/AdminVincularEstudanteTurmaDev';

type Pessoa={id:string;nome_completo:string;email:string|null;telefone:string|null};
type Contato={
 id:string;fonte:string;linha_origem:number;nome_completo:string;
 email:string|null;telefone:string|null;nascimento_texto:string|null;
 pessoa_id:string|null;estado:string;classificacao_legado:string|null;
 criado_em:string;pessoas:Pessoa|null;
};
type Matricula={id:string;situacao:string;origem:string;ingresso_em:string|null;created_at:string};
type Props={supabase:SupabaseClient;podeConsultar:boolean;podeGerirVinculos:boolean};
const PAGINA_BANCO=500;
const PAGINA_TELA=25;
const COLUNAS='id,fonte,linha_origem,nome_completo,email,telefone,nascimento_texto,pessoa_id,estado,classificacao_legado,criado_em,pessoas!educart_contatos_historicos_dev_pessoa_id_fkey(id,nome_completo,email,telefone)';
function dataTecnica(valor:string|null){
 if(!valor)return 'Não informada';
 const data=new Date(valor);
 return Number.isNaN(data.getTime())?'Não informada':new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(data);
}
function normalizar(valor:string|null|undefined){return (valor??'').trim().toLocaleLowerCase('pt-BR');}
export function AdminClientesDev({supabase,podeConsultar,podeGerirVinculos}:Props){
 const [registros,setRegistros]=useState<Contato[]>([]);
 const [carregando,setCarregando]=useState(false);
 const [erro,setErro]=useState('');
 const [busca,setBusca]=useState('');
 const [filtro,setFiltro]=useState<'todos'|'vinculados'|'pendentes'|'principal'|'secundaria'>('todos');
 const [pagina,setPagina]=useState(0);
 const [selecionado,setSelecionado]=useState<Contato|null>(null);
 const [matriculas,setMatriculas]=useState<Matricula[]>([]);
 const [carregandoMatriculas,setCarregandoMatriculas]=useState(false);
 const [erroMatriculas,setErroMatriculas]=useState('');
 const [matriculasPessoaId,setMatriculasPessoaId]=useState<string|null>(null);
 const [contatoParaVinculo,setContatoParaVinculo]=useState<Contato|null>(null);
 const [rascunhoVinculoPendente,setRascunhoVinculoPendente]=useState(false);
 const [operacaoVinculoEmCurso,setOperacaoVinculoEmCurso]=useState(false);
 const [confirmarFechamentoVinculo,setConfirmarFechamentoVinculo]=useState(false);
 const fecharVinculo=()=>{
  if(operacaoVinculoEmCurso)return;
  if(rascunhoVinculoPendente){setConfirmarFechamentoVinculo(true);return;}
  setContatoParaVinculo(null);
  // A ficha precisa reler os vínculos depois de um eventual cadastro concluído.
  setSelecionado(atual=>atual?{...atual}:null);
  void carregar();
 };
 const descartarVinculo=()=>{
  if(operacaoVinculoEmCurso)return;
  setConfirmarFechamentoVinculo(false);setContatoParaVinculo(null);
  setRascunhoVinculoPendente(false);void carregar();
 };
 const carregar=useCallback(async()=>{
  if(!podeConsultar||!ACOES_ACADEMICAS_EXCLUSIVAS_DEV)return;
  setCarregando(true);setErro('');
  try{
   const lista:Contato[]=[];
   for(let paginaBanco=0;paginaBanco<200;paginaBanco++){
    const {data,error}=await supabase.from('educart_contatos_historicos_dev')
      .select(COLUNAS).order('fonte').order('linha_origem').order('id')
      .range(paginaBanco*PAGINA_BANCO,(paginaBanco+1)*PAGINA_BANCO-1);
    if(error)throw new Error('Falha de consulta ou permissão para Clientes.');
    const lote=(data??[]) as unknown as Contato[];
    lista.push(...lote);
    if(lote.length<PAGINA_BANCO){setRegistros(lista);setPagina(0);return;}
   }
   throw new Error('Consulta excedeu o limite seguro: lista parcial bloqueada.');
  }catch(e){
   setRegistros([]);
   setSelecionado(null);
   setErro(e instanceof Error?e.message:'Não foi possível consultar Clientes.');
  }finally{setCarregando(false);}
 },[supabase,podeConsultar]);
 useEffect(()=>{void carregar();},[carregar]);
 useEffect(()=>{
  if(!selecionado?.pessoa_id){setMatriculas([]);setMatriculasPessoaId(null);setErroMatriculas('');setCarregandoMatriculas(false);return;}
  let ativo=true;
  setMatriculas([]);setMatriculasPessoaId(null);setErroMatriculas('');setCarregandoMatriculas(true);
  void (async()=>{
   const {data,error,count}=await supabase.from('matriculas')
     .select('id,situacao,origem,ingresso_em,created_at',{count:'exact'})
     .eq('pessoa_id',selecionado.pessoa_id!).order('created_at',{ascending:false}).range(0,99);
   if(!ativo)return;
   // Lista incompleta ou sem permissão não pode gerar um falso botão amarelo.
   if(error||count===null||count>(data??[]).length){
     setErroMatriculas('Não foi possível conferir todos os vínculos desta pessoa.');setMatriculas([]);
   } else {setMatriculas((data??[]) as Matricula[]);setMatriculasPessoaId(selecionado.pessoa_id);}
   setCarregandoMatriculas(false);
  })();
  return ()=>{ativo=false;};
 },[supabase,selecionado]);
 const resumo=useMemo(()=>{
  const vinculados=registros.filter(r=>r.pessoa_id);
  return {total:registros.length,pessoas:new Set(vinculados.map(r=>r.pessoa_id)).size,
   pendentes:registros.length-vinculados.length,
   principal:registros.filter(r=>normalizar(r.fonte)==='principal').length};
 },[registros]);
 const filtrados=useMemo(()=>{
  const termo=normalizar(busca),numeros=busca.replace(/\D/g,'');
  return registros.filter(r=>{
   if(filtro==='vinculados'&&!r.pessoa_id)return false;
   if(filtro==='pendentes'&&r.pessoa_id)return false;
   if(filtro==='principal'&&normalizar(r.fonte)!=='principal')return false;
   if(filtro==='secundaria'&&normalizar(r.fonte)!=='secundária')return false;
   if(!termo)return true;
   return [r.nome_completo,r.email,r.telefone,r.pessoas?.nome_completo,r.pessoas?.email,r.pessoas?.telefone]
      .some(valor=>normalizar(valor).includes(termo)||(numeros.length>=3&&(valor??'').replace(/\D/g,'').includes(numeros)));
  });
 },[registros,busca,filtro]);
 const totalPaginas=Math.max(1,Math.ceil(filtrados.length/PAGINA_TELA));
 const exibidos=filtrados.slice(pagina*PAGINA_TELA,(pagina+1)*PAGINA_TELA);
 const consultaVinculosConcluida=!selecionado?.pessoa_id||
   (!carregandoMatriculas&&!erroMatriculas&&matriculasPessoaId===selecionado.pessoa_id);
 const jaVinculado=Boolean(selecionado?.pessoa_id&&consultaVinculosConcluida&&
   matriculas.some(m=>!/(conclu|cancelad|desist|trancad|encerrad|inativ)/i.test(m.situacao)));
 const vinculoIndisponivel=carregando||!consultaVinculosConcluida||jaVinculado;
 if(!podeConsultar||!ACOES_ACADEMICAS_EXCLUSIVAS_DEV)return <p className="admin-academico-note" role="status">Clientes históricos disponíveis somente à gestão autenticada no Supabase DEV. Nenhuma consulta ao histórico é feita no PROD.</p>;
 return <section aria-label="Clientes e contatos históricos" className="admin-academico-panel">
  <div className="admin-academico-section-head">
   <div>
    <h2>Clientes <span className="admin-title-accent">.</span></h2>
    <p>Relacionamentos e cadastros históricos da EducART, consultados diretamente no DEV, sem recadastro.</p>
   </div>
   <button type="button" className="admin-btn admin-btn-secondary" disabled={carregando} onClick={()=>void carregar()}>↻ Atualizar</button>
  </div>
  <p className="admin-academico-note" role="note">Contatos históricos não são automaticamente inscrições, matrículas ou estudantes ativos. <strong>Data de inscrição original não comprovada nesta fonte;</strong> a data técnica abaixo registra apenas a entrada no DEV.</p>
  {erro&&<p className="admin-academico-message" role="alert">{erro} A lista incompleta não será exibida.</p>}
  {carregando?<p role="status">Consultando a base histórica autorizada...</p>:!erro&&<>
   <div className="admin-kpi-grid" aria-label="Resumo dos clientes">
    <div className="admin-kpi-card kpi-total"><span className="kpi-label">Registros históricos</span><strong className="kpi-value">{resumo.total}</strong></div>
    <div className="admin-kpi-card kpi-confirmed"><span className="kpi-label">Pessoas distintas vinculadas</span><strong className="kpi-value">{resumo.pessoas}</strong></div>
    <div className="admin-kpi-card kpi-pending"><span className="kpi-label">Vínculos a conferir</span><strong className="kpi-value">{resumo.pendentes}</strong></div>
    <div className="admin-kpi-card kpi-enrolled"><span className="kpi-label">Fonte Principal</span><strong className="kpi-value">{resumo.principal}</strong></div>
   </div>
   <div className="admin-filters-bar">
    <div className="search-input-wrap"><label className="admin-academico-label" htmlFor="clientes-busca">Buscar clientes</label>
     <input id="clientes-busca" className="search-input" type="search" value={busca}
       placeholder="Nome, telefone ou e-mail" onChange={e=>{setBusca(e.target.value);setPagina(0);}}/></div>
    <div><label className="admin-academico-label" htmlFor="clientes-filtro">Filtrar</label>
     <select id="clientes-filtro" className="filter-select" value={filtro} onChange={e=>{setFiltro(e.target.value as typeof filtro);setPagina(0);}}>
      <option value="todos">Todos os históricos</option>
      <option value="vinculados">Com pessoa vinculada</option>
      <option value="pendentes">Sem vínculo de pessoa</option>
      <option value="principal">Fonte Principal</option>
      <option value="secundaria">Fonte Secundária</option>
     </select></div>
   </div>
   <p className="admin-academico-note" role="status">{filtrados.length} registro(s) encontrados. A origem documental permanece individualizada por fonte e linha.</p>
   {selecionado&&<section className="admin-kpi-card" aria-labelledby="cliente-ficha-titulo" style={{marginBottom:20}}>
    <div className="admin-header-row" style={{marginBottom:8}}>
     <h3 id="cliente-ficha-titulo" className="admin-page-title">Ficha · {selecionado.pessoas?.nome_completo??selecionado.nome_completo}</h3>
     <div className="admin-academico-actions">
      {podeGerirVinculos&&<button type="button"
       className={'admin-btn '+(jaVinculado?'admin-btn-vinculo-inativo':'admin-btn-primary')}
       disabled={vinculoIndisponivel} aria-haspopup="dialog"
       title={jaVinculado?'Esta pessoa já tem vínculo acadêmico atual':
         !consultaVinculosConcluida?'Aguardando conferência das matrículas':'Escolher turma para esta pessoa'}
       onClick={()=>{if(vinculoIndisponivel)return;setRascunhoVinculoPendente(false);setContatoParaVinculo(selecionado);}}>
       {jaVinculado?'Já vinculado':!consultaVinculosConcluida?'Conferindo vínculos...':'Vincular à turma'}
      </button>}
      <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setSelecionado(null)}>Fechar ficha</button>
     </div>
    </div>
    <div className="detail-grid">
     <div className="detail-field"><span className="detail-label">Identidade</span><span className="detail-value">{selecionado.pessoa_id?'Vinculada à tabela pessoas':'Pendente de conferência'}</span></div>
     <div className="detail-field"><span className="detail-label">Contato</span><span className="detail-value">{selecionado.pessoas?.telefone??selecionado.telefone??'Telefone não informado'}</span><span className="detail-value">{selecionado.pessoas?.email??selecionado.email??'E-mail não informado'}</span></div>
     <div className="detail-field"><span className="detail-label">Origem histórica</span><span className="detail-value">{selecionado.fonte} · linha {selecionado.linha_origem}</span></div>
     <div className="detail-field"><span className="detail-label">Classificação</span><span className="detail-value">{selecionado.classificacao_legado??'Não classificada'} · {selecionado.estado}</span></div>
     <div className="detail-field"><span className="detail-label">Entrada técnica no DEV</span><span className="detail-value">{dataTecnica(selecionado.criado_em)}</span></div>
     <div className="detail-field"><span className="detail-label">Data original de inscrição</span><span className="detail-value">Não comprovada — não confundir com importação</span></div>
    </div>
    {selecionado.pessoa_id?<div>
      <strong>Matrículas vinculadas a esta pessoa (somente leitura)</strong>
      {carregandoMatriculas?<p role="status">Verificando vínculos acadêmicos...</p>:
       erroMatriculas?<p role="alert">{erroMatriculas}</p>:
       matriculas.length?<ul>{matriculas.map(m=><li key={m.id}>{m.situacao} · {m.origem} · ingresso {m.ingresso_em??'não informado'}</li>)}</ul>:
       <p className="admin-academico-note">Nenhuma matrícula visível para a identidade vinculada. Isso não comprova ausência de histórico fora deste DEV.</p>}
    </div>:<p className="admin-academico-note">Sem pessoa vinculada: não relacionar automaticamente a inscrições ou matrículas apenas por coincidência de nome ou contato.</p>}
   </section>}
   <div className="admin-table-container" style={{overflowX:'auto'}}>
    <table className="admin-table" style={{minWidth:760}}>
     <thead><tr><th>Cliente</th><th>Fonte</th><th>Identidade</th><th>Classificação</th><th>Entrada no DEV</th><th>Ação</th></tr></thead>
     <tbody>{exibidos.map(c=><tr key={c.id}>
      <td><strong>{c.pessoas?.nome_completo??c.nome_completo}</strong></td>
      <td>{c.fonte} · {c.linha_origem}</td>
      <td>{c.pessoa_id?'Vinculada':'A conferir'}</td>
      <td>{c.classificacao_legado??'Não informada'}</td>
      <td>{dataTecnica(c.criado_em)}</td>
      <td><button className="admin-btn admin-btn-secondary" type="button" onClick={()=>setSelecionado(c)}>Ver ficha</button></td>
     </tr>)}</tbody>
    </table>
    {!exibidos.length&&<p className="admin-academico-note">Nenhum registro encontrado para estes filtros.</p>}
   </div>
   <div className="admin-header-row" style={{marginTop:16}}>
    <span className="admin-academico-note">Página {pagina+1} de {totalPaginas}</span>
    <div style={{display:'flex',gap:8}}>
     <button className="admin-btn admin-btn-secondary" type="button" disabled={pagina===0} onClick={()=>setPagina(p=>Math.max(0,p-1))}>Anterior</button>
     <button className="admin-btn admin-btn-secondary" type="button" disabled={pagina+1>=totalPaginas} onClick={()=>setPagina(p=>Math.min(totalPaginas-1,p+1))}>Próxima</button>
    </div>
   </div>
  </>}
  {contatoParaVinculo&&podeGerirVinculos&&<AdminRegistroModalDev
   titulo={'Adicionar à turma · '+(contatoParaVinculo.pessoas?.nome_completo??contatoParaVinculo.nome_completo)}
   descricao="Vínculo no cadastro existente · Supabase DEV · sem cobrança automática"
   onClose={confirmarFechamentoVinculo?()=>setConfirmarFechamentoVinculo(false):fecharVinculo} amplo cadastro>
   {confirmarFechamentoVinculo&&<div className="admin-academico-panel" role="group" aria-label="Descartar vínculo não salvo">
    <p role="alert">Existem informações ainda não salvas. Deseja descartar?</p>
    <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setConfirmarFechamentoVinculo(false)}>Permanecer</button>
    <button type="button" className="admin-btn admin-btn-primary" onClick={descartarVinculo}>Descartar e fechar</button>
   </div>}
   <div style={confirmarFechamentoVinculo?{display:'none'}:undefined}>
    <AdminVincularEstudanteTurmaDev key={contatoParaVinculo.id}
     supabase={supabase} podeGerir={podeGerirVinculos}
     pessoaInicialId={contatoParaVinculo.pessoa_id??undefined}
     contatoInicial={contatoParaVinculo.pessoa_id?undefined:{
       nome_completo:contatoParaVinculo.nome_completo,
       email:contatoParaVinculo.email,telefone:contatoParaVinculo.telefone}}
     onRascunhoPendenteChange={setRascunhoVinculoPendente}
     onOperacaoEmCursoChange={setOperacaoVinculoEmCurso}/>
   </div>
  </AdminRegistroModalDev>}
 </section>;
}
