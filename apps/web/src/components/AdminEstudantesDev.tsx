'use client';
/** EducART 1.1 — estudantes pela mesma base de pessoas, matrículas e turmas; sem recadastro paralelo. */
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {precisaConfirmarSaidaCadastro} from '@/lib/academico/proteger-saida-cadastro-a1';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminAjuda} from '@/components/AdminAjuda';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {AdminVincularEstudanteTurmaDev} from '@/components/AdminVincularEstudanteTurmaDev';
import {AdminHistoricosDev} from '@/components/AdminHistoricosDev';
import {ACOES_ACADEMICAS_EXCLUSIVAS_DEV} from '@/lib/supabase/client';
type Pessoa={id:string;nome_completo:string;email:string|null;telefone:string|null};
type Matricula={id:string;pessoa_id:string;turma_id:string;situacao:string;origem:string;ingresso_em:string|null;created_at:string};
type Turma={id:string;codigo:string;formacao_id:string;situacao:string;inicio_em:string|null;termina_em:string|null};
type Formacao={id:string;nome:string};
type Props={supabase:SupabaseClient;podeGerir:boolean;buscaInicial?:string;focarBuscaInicial?:boolean;onRascunhoPendenteChange?:(pendente:boolean)=>void};
async function todas<T>(supabase:SupabaseClient,tabela:string,colunas:string,ordenar:string):Promise<T[]>{
 const resultado:T[]=[];
 for(let pagina=0;pagina<200;pagina++){
  const {data,error}=await supabase.from(tabela).select(colunas).order(ordenar).range(pagina*500,(pagina+1)*500-1);
  if(error)throw Error('Erro ao consultar '+tabela);
  const lote=(data??[]) as T[];
  resultado.push(...lote);
  if(lote.length<500)return resultado;
 }
 throw Error('Consulta '+tabela+' excede o limite. Não exibir lista incompleta.');
}
export function AdminEstudantesDev({supabase,podeGerir,buscaInicial='',focarBuscaInicial=false,onRascunhoPendenteChange}:Props){
 const [pessoas,setPessoas]=useState<Pessoa[]>([]);
 const [matriculas,setMatriculas]=useState<Matricula[]>([]);
 const [turmas,setTurmas]=useState<Turma[]>([]);
 const [formacoes,setFormacoes]=useState<Formacao[]>([]);
 const [carregando,setCarregando]=useState(true);
 const [erro,setErro]=useState('');
 const [busca,setBusca]=useState(buscaInicial);
 const buscaRef=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(focarBuscaInicial)buscaRef.current?.focus();},[focarBuscaInicial]);
 const [turmaId,setTurmaId]=useState('');
 const [mostrarVinculo,setMostrarVinculo]=useState(false);
 const [rascunhoPendente,setRascunhoPendente]=useState(false);
 const [operacaoEmCurso,setOperacaoEmCurso]=useState(false);
 const [confirmarSaida,setConfirmarSaida]=useState(false);
 const [avisoFechamento,setAvisoFechamento]=useState('');
 const botaoVinculoRef=useRef<HTMLButtonElement>(null);
 const jaAbriuVinculoRef=useRef(false);
 useEffect(()=>{
   if(mostrarVinculo){jaAbriuVinculoRef.current=true;return;}
   if(jaAbriuVinculoRef.current)botaoVinculoRef.current?.focus();
 },[mostrarVinculo]);
 useEffect(()=>{onRascunhoPendenteChange?.(rascunhoPendente);},
   [rascunhoPendente,onRascunhoPendenteChange]);
 const solicitarFechamentoVinculo=()=>{
   if(operacaoEmCurso){setAvisoFechamento('Aguarde a conclusão da operação antes de fechar.');return;}
   if(precisaConfirmarSaidaCadastro(mostrarVinculo,rascunhoPendente)){
     setConfirmarSaida(true);return;
   }
   setMostrarVinculo(false);setPessoaParaVinculoId(null);setAvisoFechamento('');
   // Após salvar vínculo no modal, atualizar fichas e bloquear o atalho.
   void carregar();
 };
 const descartarVinculo=()=>{
   if(operacaoEmCurso)return;
   setConfirmarSaida(false);setMostrarVinculo(false);setPessoaParaVinculoId(null);setAvisoFechamento('');
   setRascunhoPendente(false);
   void carregar();
 };

 const [visualizarPessoaId,setVisualizarPessoaId]=useState<string|null>(null);
 const [pessoaParaVinculoId,setPessoaParaVinculoId]=useState<string|null>(null);
 const [paginaPessoas,setPaginaPessoas]=useState(0);
 const iniciarVinculoPessoa=(id:string)=>{
  // Vínculo acadêmico atual bloqueia uma segunda matrícula por este atalho.
  if(matriculas.some(m=>m.pessoa_id===id&&!/(conclu|cancelad|desist|trancad|encerrad|inativ)/i.test(m.situacao)))return;
  setVisualizarPessoaId(null);setPessoaParaVinculoId(id);
  setConfirmarSaida(false);setMostrarVinculo(true);
 };
 const carregar=useCallback(async()=>{
  setCarregando(true);setErro('');
  try{
    const [p,m,t,f]=await Promise.all([
     todas<Pessoa>(supabase,'pessoas','id,nome_completo,email,telefone','nome_completo'),
     todas<Matricula>(supabase,'matriculas','id,pessoa_id,turma_id,situacao,origem,ingresso_em,created_at','id'),
     todas<Turma>(supabase,'turmas','id,codigo,formacao_id,situacao,inicio_em,termina_em','codigo'),
     todas<Formacao>(supabase,'formacoes','id,nome','nome'),
    ]);
    setPessoas(p);setMatriculas(m);setTurmas(t);setFormacoes(f);
  }catch{setErro('Consulta de estudantes incompleta ou sem permissão no ambiente acadêmico.');
    setPessoas([]);setMatriculas([]);setTurmas([]);setFormacoes([]);}
  finally{setCarregando(false);}
 },[supabase]);
 useEffect(()=>{void carregar();},[carregar]);
 const pessoasPorId=useMemo(()=>new Map(pessoas.map(p=>[p.id,p])),[pessoas]);
 const pessoasEncontradas=useMemo(()=>{
  const termo=busca.trim().toLocaleLowerCase('pt-BR');
  return termo?pessoas.filter(p=>[p.nome_completo,p.email??'',p.telefone??'']
   .some(v=>v.toLocaleLowerCase('pt-BR').includes(termo))):pessoas;
 },[pessoas,busca]);
 const totalPaginasPessoas=Math.max(1,Math.ceil(pessoasEncontradas.length/25));
 const pessoasVisiveis=pessoasEncontradas.slice(paginaPessoas*25,(paginaPessoas+1)*25);
 const turmasPorId=useMemo(()=>new Map(turmas.map(t=>[t.id,t])),[turmas]);
 const formacoesPorId=useMemo(()=>new Map(formacoes.map(f=>[f.id,f.nome])),[formacoes]);
 const pessoaVisualizada=visualizarPessoaId?pessoasPorId.get(visualizarPessoaId):null;
 const vinculosPessoa=visualizarPessoaId?matriculas.filter(m=>m.pessoa_id===visualizarPessoaId)
   .sort((a,b)=>(b.ingresso_em??b.created_at).localeCompare(a.ingresso_em??a.created_at)):[];
 const anteriores=vinculosPessoa.filter(m=>/(conclu|cancelad|desist|trancad|encerrad|inativ)/i.test(m.situacao));
 const atuais=vinculosPessoa.filter(m=>!/(conclu|cancelad|desist|trancad|encerrad|inativ)/i.test(m.situacao));
 const descricaoVinculo=(m:Matricula)=>{
   const t=turmasPorId.get(m.turma_id);
   return (t?.codigo??'Turma não localizada')+' · '+(formacoesPorId.get(t?.formacao_id??'')??'Formação não localizada');
 };
 const encontrados=useMemo(()=>matriculas.filter(m=>{
   const p=pessoasPorId.get(m.pessoa_id);
   const termo=busca.trim().toLocaleLowerCase('pt-BR');
   return (!turmaId||m.turma_id===turmaId)&&(!termo||[p?.nome_completo??'',p?.email??'',p?.telefone??'']
      .some(s=>s.toLocaleLowerCase('pt-BR').includes(termo)));
 }),[matriculas,pessoasPorId,turmaId,busca]);
 return <section className="admin-academico-panel" aria-label="Estudantes e vínculos acadêmicos">
  <div className="admin-academico-section-head">
   <div><h2>Estudantes <AdminAjuda titulo="Estudantes" descricao="Lista de matrículas existentes por turma." passos="Localize alunos pelo nome, escolha uma turma e consulte a situação acadêmica." cuidado="Novos candidatos entram pela Secretaria. Recadastro de antigos exige conferência e não gera pagamento." /></h2>
    <p>Uma matrícula por vínculo acadêmico, usando os cadastros compartilhados com a Secretaria.</p></div>
   {podeGerir&&<button ref={botaoVinculoRef} type="button" className="admin-btn admin-btn-primary"
      aria-haspopup="dialog" aria-expanded={mostrarVinculo} onClick={()=>{setPessoaParaVinculoId(null);setMostrarVinculo(true);}}>
      Adicionar pessoa à turma
   </button>}
  </div>
  {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
  <div className="admin-filters-bar" style={{flexWrap:'wrap',gap:12}}>
   <div><label htmlFor="academico-aluno-busca" className="admin-academico-label">Localizar estudante</label>
    <input ref={buscaRef} id="academico-aluno-busca" type="search" className="search-input admin-academico-input" placeholder="Nome, contato"
      value={busca} onChange={e=>{setBusca(e.target.value);setPaginaPessoas(0);}}/></div>
   <div><label htmlFor="academico-aluno-turma" className="admin-academico-label">Filtrar por turma</label>
    <select id="academico-aluno-turma" className="filter-select" value={turmaId} onChange={e=>setTurmaId(e.target.value)}>
     <option value="">Todas as turmas</option>
     {turmas.map(t=><option value={t.id} key={t.id}>{t.codigo}</option>)}
    </select></div>
   <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>void carregar()} disabled={carregando}>Atualizar</button>
  </div>
  <section className="admin-academico-panel" aria-label="Pessoas cadastradas">
    <h3>Pessoas cadastradas ({pessoas.length})</h3>
    <p className="admin-academico-note">Cadastros acadêmicos com ou sem matrícula. Pesquise e abra a ficha para adicionar à turma.</p>
    {!carregando&&<><p role="status">{pessoasEncontradas.length} pessoa(s) encontrada(s) · página {paginaPessoas+1} de {totalPaginasPessoas}.</p>
    <div className="admin-academico-fichas">{pessoasVisiveis.map(p=><article className="admin-academico-ficha" key={p.id}>
     <div><strong>{p.nome_completo}</strong><small>{p.email??p.telefone??'Contato não informado'}</small></div>
     <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setVisualizarPessoaId(p.id)}>Ver perfil</button>
    </article>)}</div>
    {!pessoasVisiveis.length&&<p>Nenhuma pessoa corresponde à pesquisa.</p>}
    <div className="admin-academico-actions">
     <button type="button" className="admin-btn admin-btn-secondary" disabled={paginaPessoas===0}
      onClick={()=>setPaginaPessoas(p=>Math.max(0,p-1))}>Anterior</button>
     <button type="button" className="admin-btn admin-btn-secondary" disabled={paginaPessoas+1>=totalPaginasPessoas}
      onClick={()=>setPaginaPessoas(p=>Math.min(totalPaginasPessoas-1,p+1))}>Próxima</button>
    </div></>}
   </section>
   {carregando?<p role="status">Consultando matrículas no {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD'}...</p>:
   <><p className="admin-academico-note">{encontrados.length} matrícula(s) nos filtros. Pessoas sem matrícula não são contadas como estudantes ativos.</p>
    <div className="admin-academico-fichas">{encontrados.map(m=>{
      const p=pessoasPorId.get(m.pessoa_id),t=turmasPorId.get(m.turma_id);
      return <article key={m.id} className="admin-academico-ficha">
       <div><strong>{p?.nome_completo??'Cadastro não localizado'}</strong>
        <small>Turma: {t?.codigo??'Não localizada'} · {formacoesPorId.get(t?.formacao_id??'')??'Formação não identificada'}</small>
        <small>Situação: {m.situacao} · Origem: {m.origem}</small>
        <small>Contato privado: {p?.email??p?.telefone??'Não informado'}</small>
       </div>
       {p&&<button className="admin-btn admin-btn-secondary" type="button"
         aria-label={'Ver histórico de '+p.nome_completo} onClick={()=>setVisualizarPessoaId(p.id)}>👁 Ver perfil</button>}
      </article>;
    })}
    {!encontrados.length&&<p>Nenhuma matrícula encontrada para estes filtros.</p>}</div>
   </>}
  {podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<AdminHistoricosDev supabase={supabase} podeGerir={podeGerir}/>}
  {mostrarVinculo&&podeGerir&&<AdminRegistroModalDev
    titulo={confirmarSaida?'Descartar vínculo em andamento?':'Adicionar pessoa à turma'}
    descricao={confirmarSaida?'Há informações ainda não salvas.':'Vínculo acadêmico individual · R12 · Supabase '+(ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD')}
    onClose={confirmarSaida?()=>setConfirmarSaida(false):solicitarFechamentoVinculo} amplo cadastro>
    {confirmarSaida&&<div className="admin-academico-panel" role="group" aria-label="Confirmar saída do vínculo">
      <p role="alert">Ao descartar, os dados preenchidos neste formulário serão perdidos. Permanecer conserva tudo que foi digitado.</p>
      <div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>setConfirmarSaida(false)}>Permanecer no cadastro</button>
        <button type="button" className="admin-btn admin-btn-primary"
          onClick={descartarVinculo}>Descartar alterações e sair</button>
      </div>
    </div>}
    <div style={confirmarSaida?{display:'none'}:undefined}>
      <AdminVincularEstudanteTurmaDev key={pessoaParaVinculoId??'geral'}
        supabase={supabase} podeGerir={podeGerir}
        pessoaInicialId={pessoaParaVinculoId??undefined}
        onRascunhoPendenteChange={setRascunhoPendente}
        onOperacaoEmCursoChange={setOperacaoEmCurso}/>
      {avisoFechamento&&<p role="alert" className="admin-academico-message">{avisoFechamento}</p>}
      <div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={solicitarFechamentoVinculo}>Cancelar / Fechar</button>
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>void carregar()}>Atualizar lista de estudantes</button>
      </div>
    </div>
  </AdminRegistroModalDev>}

  {pessoaVisualizada&&<AdminRegistroModalDev titulo={'Perfil de '+pessoaVisualizada.nome_completo}
    descricao="Consulta interna de estudante. Dados privados, histórico de matrículas e turmas existentes no DEV."
    onClose={()=>setVisualizarPessoaId(null)} amplo>
    <dl className="admin-registro-profile-data">
      <div><dt>Nome completo</dt><dd>{pessoaVisualizada.nome_completo}</dd></div>
      <div><dt>E-mail (privado)</dt><dd>{pessoaVisualizada.email||'Não informado'}</dd></div>
      <div><dt>Telefone (privado)</dt><dd>{pessoaVisualizada.telefone||'Não informado'}</dd></div>
      <div><dt>Vínculos acadêmicos</dt><dd>{vinculosPessoa.length} matrícula(s) registrada(s)</dd></div>
    </dl>
    <h3>Turmas atuais / matrículas em andamento ({atuais.length})</h3>
    <ul className="admin-registro-cohort-list">
      {atuais.map(m=><li key={m.id}><strong>{descricaoVinculo(m)}</strong>
        <small>Situação da matrícula: {m.situacao} · Ingresso: {m.ingresso_em||'Não registrado'} · Origem: {m.origem}</small>
      </li>)}
      {!atuais.length&&<li>Nenhuma matrícula atual encontrada nesta base.</li>}
    </ul>
    <h3>Turmas anteriores / histórico de matrícula ({anteriores.length})</h3>
    <ul className="admin-registro-cohort-list">
      {anteriores.map(m=><li key={m.id}><strong>{descricaoVinculo(m)}</strong>
        <small>Situação da matrícula: {m.situacao} · Ingresso: {m.ingresso_em||'Não registrado'} · Origem: {m.origem}</small>
      </li>)}
      {!anteriores.length&&<li>Sem turmas anteriores registradas nesta base.</li>}
    </ul>
    <p className="admin-academico-note">Consulta privada para a equipe. Não há link público de estudante nem inferência de pagamentos.</p>
    {podeGerir&&<button type="button"
      className={'admin-btn '+(atuais.length>0?'admin-btn-vinculo-inativo':'admin-btn-primary')}
      disabled={atuais.length>0||carregando||!!erro}
      title={atuais.length>0?'Esta pessoa já tem vínculo acadêmico atual':'Escolher turma para esta pessoa'}
      onClick={()=>iniciarVinculoPessoa(pessoaVisualizada.id)}>
      {atuais.length>0?'Já vinculado':'Vincular à turma'}
    </button>}
  </AdminRegistroModalDev>}
 </section>;
}
