'use client';
/** EducART 1.1 · R14: gestão operativa na identidade aprovada, sobre a inscrição original. */
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import { AdminAjuda } from '@/components/AdminAjuda';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {AdminIndicadoresInscricoesDev,type TipoIndicadorInscricao} from '@/components/AdminIndicadoresInscricoesDev';
import {AdminAtendimentoR12Dev} from '@/components/AdminAtendimentoR12Dev';
import {obterPapeisGestao} from '@/lib/admin/autorizar-gestao';
import {classificarCampanha,NOME_GRUPO_CAMPANHA} from '@/lib/campanhas';
import {idsPossivelmenteDuplicados} from '@/lib/inscricoes/duplicidades';
import {linkPrimeiroContatoSecretaria} from '@/lib/atendimento/whatsapp-equipe-dev';

type Situacao='pendente_confirmacao'|'confirmado'|'matriculado'|'cancelado';
type InscricaoGestao={
 id:string;nome_completo:string;email:string;telefone_whatsapp:string;
 endereco_bairro:string;cidade_estado:string;objetivo:string;como_conheceu:string;
 origem:string;turma_campanha:string;status:Situacao;created_at:string;
};
type CamposEditaveis='nome_completo'|'email'|'telefone_whatsapp'|'endereco_bairro'|'cidade_estado'|'objetivo'|'como_conheceu';
const CAMPOS:readonly {chave:CamposEditaveis;rotulo:string}[]=[
 {chave:'nome_completo',rotulo:'Nome completo'},
 {chave:'email',rotulo:'E-mail'},
 {chave:'telefone_whatsapp',rotulo:'WhatsApp'},
 {chave:'endereco_bairro',rotulo:'Bairro'},
 {chave:'cidade_estado',rotulo:'Cidade / Estado'},
 {chave:'objetivo',rotulo:'Objetivo'},
 {chave:'como_conheceu',rotulo:'Como conheceu a EducART'},
];
type Acao='cancelar'|'arquivar'|'desarquivar'|'editar';
type Evento={id:string;acao:string;motivo:string;antes:Record<string,unknown>;depois:Record<string,unknown>;registrado_em:string};
type AnaliseExclusao={sem_vinculos_conhecidos:boolean;exclusao_habilitada:boolean;matriculas:number;ingressos:number;atendimentos:number;auditorias:number;aviso:string};
type Props={
 inscricoes:InscricaoGestao[];erroConsulta?:string|null;
 supabase:SupabaseClient;podeGerir:boolean;podeAtender:boolean;
 onAbrirFicha:(id:string)=>void;
 onAtualizar:(id:string,alteracao:Partial<InscricaoGestao>)=>void;
 onExportar:(ids:string[])=>Promise<void>;
 onRascunhoPendenteChange?:(pendente:boolean)=>void;
};
const percentual=(n:number,t:number)=>t?Math.round(100*n/t)+'%':'—';
const DESCRICAO_OPERACAO:Record<Acao,string>={cancelar:'Cancelar inscrição',arquivar:'Arquivar inscrição',desarquivar:'Reabrir arquivo',editar:'Salvar correção'};
const fmt=(data:string)=>new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(data));
export function AdminGestaoInscricoesDev({inscricoes,erroConsulta,supabase,podeGerir,podeAtender,onAbrirFicha,onAtualizar,onExportar,onRascunhoPendenteChange}:Props){
 const [busca,setBusca]=useState('');
 const [campanha,setCampanha]=useState('todas');
 const [situacao,setSituacao]=useState('todos');
 const [arquivos,setArquivos]=useState('ativos');
 const [soDuplicados,setSoDuplicados]=useState(false);
 const [arquivados,setArquivados]=useState<Set<string>>(new Set());
 const [pronto,setPronto]=useState(false);
 const [carregandoEstado,setCarregandoEstado]=useState(true);
 const [selecionados,setSelecionados]=useState<string[]>([]);
 const [op,setOp]=useState<{acao:Acao;ids:string[]}|null>(null);
 const [motivo,setMotivo]=useState('');
 const [confirmacao,setConfirmacao]=useState(false);
 const [edicao,setEdicao]=useState<InscricaoGestao|null>(null);
 const [campos,setCampos]=useState<Record<CamposEditaveis,string>>({nome_completo:'',email:'',telefone_whatsapp:'',endereco_bairro:'',cidade_estado:'',objetivo:'',como_conheceu:''});
 const [salvando,setSalvando]=useState(false);
 const [operacaoConcluida,setOperacaoConcluida]=useState(false);
 const [mensagem,setMensagem]=useState('');
 const [falha,setFalha]=useState('');
 const [historicoId,setHistoricoId]=useState<string|null>(null);
 const [historico,setHistorico]=useState<Evento[]>([]);
 const [analise,setAnalise]=useState<{id:string;resultado:AnaliseExclusao}|null>(null);
 const duplicados=useMemo(()=>idsPossivelmenteDuplicados(inscricoes),[inscricoes]);
 const carregarEstado=useCallback(async()=>{
   setCarregandoEstado(true);
   const todos=new Set<string>();
   let falhou=false;
   for(let pagina=0;pagina<200;pagina++){
     const {data,error}=await supabase.from('educart_inscricoes_estado_r14_dev')
       .select('inscricao_id,arquivada').order('inscricao_id')
       .range(pagina*500,(pagina+1)*500-1);
     if(error){falhou=true;break;}
     const lote=data??[];
     for(const e of lote)if(e.arquivada)todos.add(e.inscricao_id as string);
     if(lote.length<500)break;
     if(pagina===199)falhou=true;
   }
   setPronto(!falhou);setArquivados(falhou?new Set():todos);
   setCarregandoEstado(false);
 },[supabase]);
 useEffect(()=>{void carregarEstado();},[carregarEstado]);
 const filtrados=useMemo(()=>inscricoes.filter(i=>{
   const termo=busca.trim().toLocaleLowerCase('pt-BR');
   const contato=!termo||[i.nome_completo,i.email,i.telefone_whatsapp].some(x=>x.toLocaleLowerCase('pt-BR').includes(termo));
   const arquivo=arquivos==='todos'||(arquivos==='arquivados'?arquivados.has(i.id):!arquivados.has(i.id));
   return contato&&arquivo&&(campanha==='todas'||classificarCampanha(i.turma_campanha)===campanha)
     &&(situacao==='todos'||i.status===situacao)&&(!soDuplicados||duplicados.has(i.id));
 }),[inscricoes,busca,arquivos,arquivados,campanha,situacao,soDuplicados,duplicados]);
 const estatisticas=useMemo(()=>{
   const porCampanha=new Map<string,{total:number;matriculados:number}>();
   const porCanal=new Map<string,number>();
   for(const i of inscricoes){
     const c=NOME_GRUPO_CAMPANHA[classificarCampanha(i.turma_campanha)];
     const g=porCampanha.get(c)??{total:0,matriculados:0};
     g.total++;if(i.status==='matriculado')g.matriculados++;porCampanha.set(c,g);
     const canal=(i.como_conheceu||i.origem||'Não informado').trim().slice(0,120)||'Não informado';
     porCanal.set(canal,(porCanal.get(canal)??0)+1);
   }
   return {total:inscricoes.length,
     pendentes:inscricoes.filter(i=>i.status==='pendente_confirmacao').length,
     confirmadas:inscricoes.filter(i=>i.status==='confirmado').length,
     matriculadas:inscricoes.filter(i=>i.status==='matriculado').length,
     campanhas:[...porCampanha].sort((a,b)=>b[1].total-a[1].total),
     canais:[...porCanal].sort((a,b)=>b[1]-a[1])};
 },[inscricoes]);
 const escolha=(id:string,valor:boolean)=>setSelecionados(prev=>{
   if(!valor)return prev.filter(x=>x!==id);
   if(prev.includes(id))return prev;
   if(prev.length>=25){setFalha('Limite de 25 inscrições por lote. Remova uma seleção antes de incluir outra.');return prev;}
   return [...prev,id];
 });
 const alterarFiltro=(fn:()=>void)=>{fn();setSelecionados([]);setOp(null);};
 const iniciarAcao=(acao:Acao,ids:string[])=>{
   if(!podeGerir||!pronto||!ids.length)return;
   setOp({acao,ids});setEdicao(null);setMotivo('');setConfirmacao(false);
   setOperacaoConcluida(false);setFalha('');setMensagem('');setAnalise(null);setHistoricoId(null);
 };
 const iniciarEdicao=(i:InscricaoGestao)=>{
   if(!podeGerir||!pronto||i.status==='matriculado')return;
   setEdicao(i);setOp({acao:'editar',ids:[i.id]});setMotivo('');setConfirmacao(false);
   setOperacaoConcluida(false);setFalha('');setMensagem('');setAnalise(null);setHistoricoId(null);
   setCampos(Object.fromEntries(CAMPOS.map(f=>[f.chave,i[f.chave]])) as Record<CamposEditaveis,string>);
 };
 const rascunhoOperacao=Boolean(op&&!operacaoConcluida&&
   (motivo.trim()||confirmacao||(edicao&&CAMPOS.some(f=>campos[f.chave]!==edicao[f.chave]))));
 useEffect(()=>{
   onRascunhoPendenteChange?.(rascunhoOperacao||salvando);
   return()=>onRascunhoPendenteChange?.(false);
 },[rascunhoOperacao,salvando,onRascunhoPendenteChange]);
 const fecharOperacao=()=>{
   if(salvando)return;
   const mudouCadastro=edicao&&CAMPOS.some(f=>campos[f.chave]!==edicao[f.chave]);
   if(!operacaoConcluida&&(motivo.trim()||confirmacao||mudouCadastro)&&
      !window.confirm('Descartar a justificativa e as alterações não salvas?'))return;
   setOp(null);setEdicao(null);setMotivo('');setConfirmacao(false);
   setOperacaoConcluida(false);setFalha('');
 };
 const validarCoordenacao=async()=>{
   if(!podeGerir||!pronto)throw Error('Operação bloqueada: Coordenação ou contrato DEV indisponível.');
   const {data:{user},error}=await supabase.auth.getUser();
   const papeis=(!error&&user&&!user.is_anonymous)?await obterPapeisGestao(supabase,user.id):[];
   if(!papeis.includes('coordenacao'))throw Error('Sua sessão não possui Coordenação autorizada.');
 };
 const gravar=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(!op||salvando)return;
   const qtd=motivo.trim().length;
   if(qtd<8||qtd>500||!confirmacao){
     setFalha(qtd<8?'A justificativa precisa de mais '+(8-qtd)+' caractere(s).':
       qtd>500?'Limite de 500 caracteres excedido.':
       'Marque a confirmação de que conferiu os registros e suas consequências.');
     return;
   }
   if(!e.currentTarget.checkValidity()){
     e.currentTarget.reportValidity();
     setFalha('Revise os campos obrigatórios antes de continuar.');return;
   }
   const registros=op.ids.map(id=>inscricoes.find(i=>i.id===id));
   if(registros.some(i=>!i)){setFalha('Seleção mudou. Recarregue e tente novamente.');return;}
   const alteracoes=edicao&&op.acao==='editar'
     ?Object.fromEntries(CAMPOS.filter(f=>campos[f.chave].trim()!==edicao[f.chave]).map(f=>[f.chave,campos[f.chave].trim()]))
     :{};
   const anteriores=edicao&&op.acao==='editar'
     ?Object.fromEntries(CAMPOS.filter(f=>f.chave in alteracoes).map(f=>[f.chave,edicao[f.chave]])):{};
   if(op.acao==='editar'&&!Object.keys(alteracoes).length){setFalha('Nenhum dado foi modificado.');return;}
   setSalvando(true);setFalha('');setMensagem('');
   try{
     await validarCoordenacao();
     const {data,error}=await supabase.rpc('educart_r14_gerir_inscricoes_dev',{
       p_ids:op.ids,p_operacao:op.acao,p_motivo:motivo.trim(),
       p_edicao:alteracoes,p_antes:anteriores,
       p_esperados:Object.fromEntries(registros.filter((i):i is InscricaoGestao=>Boolean(i)).map(i=>[i.id,i.status]))
     });
     if(error||!data||data.alteradas!==op.ids.length)throw Error('Operação não confirmada. Verifique autorização e contrato R14 no DEV; nenhuma conclusão foi presumida.');
     if(op.acao==='cancelar')for(const id of op.ids)onAtualizar(id,{status:'cancelado'});
     if(op.acao==='editar'&&edicao)onAtualizar(edicao.id,alteracoes);
     if(op.acao==='arquivar'||op.acao==='desarquivar')await carregarEstado();
     setSelecionados([]);setEdicao(null);setMotivo('');setConfirmacao(false);
     setMensagem(data.alteradas+' inscrição(ões): '+DESCRICAO_OPERACAO[op.acao]+'. Auditoria registrada.');
     setOperacaoConcluida(true);
   }catch(x){setFalha(x instanceof Error?x.message:'Erro de conexão ao salvar.');}
   finally{setSalvando(false);}
 };
 const abrirHistorico=async(id:string)=>{
   setHistoricoId(id);setAnalise(null);setOp(null);setHistorico([]);setFalha('');
   if(!pronto)return;
   const {data,error}=await supabase.from('educart_inscricoes_eventos_r14_dev')
     .select('id,acao,motivo,antes,depois,registrado_em')
     .eq('inscricao_id',id).order('registrado_em',{ascending:false}).limit(50);
   if(error)setFalha('Não foi possível consultar as auditorias desta inscrição.');
   else setHistorico((data??[]) as Evento[]);
 };
 const analisarExclusao=async(id:string)=>{
   setAnalise(null);setHistoricoId(null);setOp(null);setFalha('');setMensagem('');
   try{
     await validarCoordenacao();
     const {data,error}=await supabase.rpc('educart_r14_analisar_exclusao_dev',{p_id:id});
     if(error||!data||data.exclusao_habilitada!==false)
       throw Error('Análise indisponível. Nenhuma exclusão será realizada.');
     setAnalise({id,resultado:data as AnaliseExclusao});
   }catch(x){setFalha(x instanceof Error?x.message:'Não foi possível analisar os vínculos.');}
 };
 const checadosVisiveis=filtrados.filter(i=>selecionados.includes(i.id));
 const grupo=checadosVisiveis.slice(0,25);
 const abrirIndicadorNaLista=(tipo:TipoIndicadorInscricao)=>{
   alterarFiltro(()=>{
     setBusca('');setSoDuplicados(false);setCampanha('todas');setArquivos('todos');
     setSituacao(tipo==='total'?'todos':tipo==='pendentes'?'pendente_confirmacao':
       tipo==='confirmadas'?'confirmado':'matriculado');
   });
 };
 return <section aria-label="Gestão de inscrições da EducART" className="admin-academico">
   <div className="admin-header-row"><div>
     <span className="admin-kicker">EDUCART 1.1 · GESTÃO INTEGRADA</span>
     <h1 className="admin-page-title">Gestão de inscrições<span className="admin-title-accent">.</span> <AdminAjuda titulo="Gestão de inscrições" descricao="Consultar, acompanhar e tratar inscrições existentes." passos="Pesquise, filtre, selecione e confirme ações autorizadas; cada alteração exige motivo e auditoria." cuidado="Exclusão definitiva não está habilitada." /></h1>
     <p className="admin-page-desc">Os registros vêm da inscrição oficial. Matrículas, históricos e pagamentos permanecem vinculados.</p>
   </div></div>
   {erroConsulta&&<p role="alert" className="admin-academico-message">{erroConsulta}</p>}
   {falha&&<p role="alert" className="admin-academico-message">{falha}</p>}
   {mensagem&&<p role="status" className="admin-academico-message">{mensagem}</p>}
   {carregandoEstado&&<p role="status">Validando permissões de arquivo e auditoria no Supabase DEV...</p>}
   {!carregandoEstado&&!pronto&&<p role="alert" className="admin-academico-message">O contrato transacional R14 ainda não está disponível no DEV. Consulta, detecção de duplicidade e exportação continuam disponíveis; cancelar, editar e arquivar estão bloqueados até a aplicação autorizada da migração.</p>}
   <AdminIndicadoresInscricoesDev inscricoes={inscricoes}
     onAbrirFicha={onAbrirFicha} onExibirLista={abrirIndicadorNaLista}/>
   <div className="admin-academico-panel">
     <h2>Todos os inscritos <AdminAjuda titulo="Todos os inscritos" descricao="Pesquisa por todas as campanhas, inclusive arquivadas." passos="Filtre, abra ficha ou selecione até 25 registros por operação em lote." cuidado="Duplicidade é apenas um alerta; nunca há mesclagem automática." /></h2>
     <p className="admin-page-desc">{filtrados.length} de {inscricoes.length} inscrições exibidas · {duplicados.size} com contatos possivelmente repetidos.</p>
     <div className="admin-filters-bar" style={{flexWrap:'wrap',gap:12}}>
       <div className="search-input-wrap">
         <label className="login-label" htmlFor="gestao-busca">Buscar inscrição</label>
         <input id="gestao-busca" type="search" className="search-input" placeholder="Nome, e-mail ou telefone"
           value={busca} onChange={e=>alterarFiltro(()=>setBusca(e.target.value))}/>
       </div>
       <div>
         <label className="login-label" htmlFor="gestao-campanha">Campanha</label>
         <select id="gestao-campanha" className="filter-select" value={campanha}
           onChange={e=>alterarFiltro(()=>setCampanha(e.target.value))}>
           <option value="todas">Todas as campanhas</option><option value="formacao">Formação atual</option>
           <option value="historico">Histórico</option><option value="outras">Outras</option>
         </select>
       </div>
       <div>
         <label className="login-label" htmlFor="gestao-situacao">Situação</label>
         <select id="gestao-situacao" className="filter-select" value={situacao}
           onChange={e=>alterarFiltro(()=>setSituacao(e.target.value))}>
           <option value="todos">Todos</option><option value="pendente_confirmacao">Pendente</option>
           <option value="confirmado">Confirmada</option><option value="matriculado">Matriculada</option>
           <option value="cancelado">Cancelada</option>
         </select>
       </div>
       <div>
         <label className="login-label" htmlFor="gestao-arquivo">Arquivo</label>
         <select id="gestao-arquivo" className="filter-select" disabled={!pronto} value={arquivos}
           onChange={e=>alterarFiltro(()=>setArquivos(e.target.value))}>
           <option value="ativos">Não arquivadas</option><option value="arquivados">Arquivadas</option>
           <option value="todos">Todas</option>
         </select>
       </div>
       <label className="admin-academico-label">
         <input type="checkbox" checked={soDuplicados}
           onChange={e=>alterarFiltro(()=>setSoDuplicados(e.target.checked))}/> Apenas possíveis duplicados
       </label>
     </div>
     <div className="admin-academico-actions" style={{flexWrap:'wrap'}}>
       <button type="button" className="admin-btn admin-btn-secondary"
         disabled={!podeGerir||!filtrados.length}
         onClick={()=>void onExportar(filtrados.map(i=>i.id))}>Exportar CSV filtrado</button>
       <button type="button" className="admin-btn admin-btn-secondary"
         disabled={!podeGerir||!pronto||!filtrados.length}
         onClick={()=>setSelecionados(filtrados.slice(0,25).map(i=>i.id))}>
         Selecionar {Math.min(filtrados.length,25)} visíveis
       </button>
       <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setSelecionados([])}>Limpar seleção</button>
     </div>
     {selecionados.length>0&&<div className="admin-academico-panel" role="group" aria-label="Ações em lote">
       <p>{selecionados.length} selecionada(s). Máximo de 25 por operação. Ações com confirmação e motivo obrigatório.</p>
       <div className="admin-academico-actions" style={{flexWrap:'wrap'}}>
         <button type="button" className="admin-btn admin-btn-secondary"
           disabled={!podeGerir||!pronto||grupo.some(i=>arquivados.has(i.id))}
           onClick={()=>iniciarAcao('arquivar',grupo.map(i=>i.id))}>Arquivar selecionadas</button>
         <button type="button" className="admin-btn admin-btn-secondary"
           disabled={!podeGerir||!pronto||grupo.some(i=>!arquivados.has(i.id))}
           onClick={()=>iniciarAcao('desarquivar',grupo.map(i=>i.id))}>Desarquivar selecionadas</button>
         <button type="button" className="admin-btn admin-btn-secondary"
           disabled={!podeGerir||!pronto||grupo.some(i=>i.status==='matriculado'||i.status==='cancelado')}
           onClick={()=>iniciarAcao('cancelar',grupo.map(i=>i.id))}>Cancelar selecionadas</button>
       </div>
     </div>}
     <div className="admin-table-container">
       {filtrados.length===0?<p style={{padding:20}}>Nenhuma inscrição encontrada nos filtros.</p>:<table className="admin-table">
         <thead><tr><th>Seleção</th><th>Data</th><th>Inscrito</th><th>Campanha</th><th>Situação</th><th>Ações</th></tr></thead>
         <tbody>{filtrados.map(i=><tr key={i.id}>
           <td data-label="Selecionar"><input type="checkbox" disabled={!podeGerir||!pronto}
             checked={selecionados.includes(i.id)}
             aria-label={'Selecionar '+i.nome_completo}
             onChange={e=>escolha(i.id,e.target.checked)}/></td>
           <td data-label="Data">{fmt(i.created_at)}</td>
           <td data-label="Inscrito"><strong>{i.nome_completo}</strong>
             <small style={{display:'block'}}>{i.email}</small>
             <small style={{display:'block'}}>{i.telefone_whatsapp}</small>
             {duplicados.has(i.id)&&<small role="note" style={{display:'block'}}>⚠ Possível duplicidade de contato</small>}
             {arquivados.has(i.id)&&<small style={{display:'block'}}>Arquivada · histórico preservado</small>}
           </td>
           <td data-label="Campanha">{NOME_GRUPO_CAMPANHA[classificarCampanha(i.turma_campanha)]}</td>
           <td data-label="Situação"><span className={'status-badge status-'+i.status}>{i.status.replaceAll('_',' ')}</span></td>
           <td data-label="Ações"><div className="action-buttons-cell" style={{flexWrap:'wrap'}}>
             <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>onAbrirFicha(i.id)}>Ficha</button>
             <a href={linkPrimeiroContatoSecretaria(i.telefone_whatsapp,i.nome_completo)}
               className="admin-btn admin-btn-secondary" target="_blank" rel="noopener noreferrer">WhatsApp</a>
             <button type="button" className="admin-btn admin-btn-secondary" disabled={!podeGerir||!pronto||i.status==='matriculado'}
               onClick={()=>iniciarEdicao(i)}>Corrigir</button>
             <button type="button" className="admin-btn admin-btn-secondary" disabled={!podeGerir||!pronto}
               onClick={()=>iniciarAcao(arquivados.has(i.id)?'desarquivar':'arquivar',[i.id])}>
               {arquivados.has(i.id)?'Desarquivar':'Arquivar'}
             </button>
             <button type="button" className="admin-btn admin-btn-secondary"
               disabled={!podeGerir||!pronto||!['pendente_confirmacao','confirmado'].includes(i.status)}
               onClick={()=>iniciarAcao('cancelar',[i.id])}>Cancelar</button>
             <button type="button" className="admin-btn admin-btn-secondary" disabled={!pronto}
               onClick={()=>void abrirHistorico(i.id)}>Histórico</button>
             <button type="button" className="admin-btn admin-btn-secondary" disabled={!podeGerir||!pronto}
               onClick={()=>void analisarExclusao(i.id)}>Analisar exclusão</button>
           </div></td>
         </tr>)}</tbody>
       </table>}
     </div>
   </div>
   {op&&<AdminRegistroModalDev
     titulo={operacaoConcluida?'Operação concluída':DESCRICAO_OPERACAO[op.acao]}
     descricao="Confirmação auditada · Supabase DEV · sem exclusão definitiva"
     onClose={fecharOperacao} amplo={op.acao==='editar'} cadastro>
     {operacaoConcluida?<div className="admin-academico-panel" role="status" aria-live="polite">
       <p><strong>{mensagem}</strong></p>
       <p>A ação foi confirmada pela RPC protegida, com auditoria. Nenhuma cobrança ou mensagem foi enviada.</p>
       <div className="admin-academico-actions">
         <button type="button" className="admin-btn admin-btn-primary" onClick={fecharOperacao}>Concluir e voltar à lista</button>
       </div>
     </div>:<form noValidate onSubmit={e=>void gravar(e)}>
       <p>{op.ids.length} inscrição(ões) incluída(s). Nenhum envio de WhatsApp ou cobrança automática.</p>
       {falha&&<p role="alert" className="admin-academico-message">{falha}</p>}
       {op.acao==='editar'&&edicao&&<div className="detail-grid">
         {CAMPOS.map(({chave,rotulo})=><div className="detail-field" key={chave}>
           <label className="admin-academico-label" htmlFor={'gestao-editar-'+chave}>{rotulo}</label>
           <input className="search-input" id={'gestao-editar-'+chave} value={campos[chave]} required
             maxLength={chave==='email'?254:250} disabled={salvando}
             onChange={e=>setCampos(prev=>({...prev,[chave]:e.target.value}))}/>
         </div>)}
       </div>}
       <label className="admin-academico-label" htmlFor="gestao-motivo">Motivo obrigatório para auditoria (8–500 caracteres)</label>
       <textarea id="gestao-motivo" className="admin-academico-textarea" rows={3} required minLength={8} maxLength={500}
         autoFocus aria-describedby="gestao-motivo-ajuda"
         value={motivo} disabled={salvando} onChange={e=>{setMotivo(e.target.value);setFalha('');}}/>
       <p id="gestao-motivo-ajuda" className="admin-academico-note" role="status" aria-live="polite">
         {motivo.trim().length<8
           ? 'Faltam '+(8-motivo.trim().length)+' caractere(s) para o mínimo de 8.'
           : motivo.trim().length+' de 500 caracteres · justificativa suficiente.'}
       </p>
       <label className="admin-academico-label"><input type="checkbox" checked={confirmacao} disabled={salvando}
         onChange={e=>{setConfirmacao(e.target.checked);setFalha('');}}/> Conferi registros, vínculos e consequências da ação.</label>
       {!confirmacao&&<p className="admin-academico-note">Marque a confirmação antes de executar a operação.</p>}
       <div className="admin-academico-actions">
         <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>
           {salvando?'Registrando...':DESCRICAO_OPERACAO[op.acao]}
         </button>
         <button type="button" className="admin-btn admin-btn-secondary" disabled={salvando}
           onClick={fecharOperacao}>Voltar sem alterar</button>
       </div>
     </form>}
   </AdminRegistroModalDev>}
   {historicoId&&<AdminRegistroModalDev titulo="Auditoria da inscrição"
     descricao="Histórico R14 de operações · somente leitura"
     onClose={()=>setHistoricoId(null)} amplo>
     <h2>Auditoria da inscrição <AdminAjuda titulo="Auditoria" descricao="Exibe o histórico imutável de operações R14, sem alterar registros." /></h2>
     <div className="admin-academico-fichas">{historico.map(evento=><article className="admin-academico-ficha" key={evento.id}>
       <div><strong>{evento.acao} · {fmt(evento.registrado_em)}</strong><small>{evento.motivo}</small>
         <small>Campos auditados: {Object.keys(evento.depois??{}).join(', ')||'nenhum'}</small>
       </div>
     </article>)}
     {!historico.length&&<p>Nenhum evento R14 registrado para esta inscrição.</p>}</div>
     <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setHistoricoId(null)}>Fechar histórico</button>
   </AdminRegistroModalDev>}
   {analise&&<AdminRegistroModalDev titulo="Análise preliminar de exclusão"
     descricao="Consulta de vínculos · exclusão definitiva indisponível"
     onClose={()=>setAnalise(null)}>
     <h2>Análise preliminar de exclusão <AdminAjuda titulo="Exclusão controlada" descricao="Verifica vínculos conhecidos em modo somente leitura." cuidado="Não existe botão, chamada ou permissão de exclusão definitiva nesta versão." /></h2>
     <p>{inscricoes.find(i=>i.id===analise.id)?.nome_completo??'Inscrição'}</p>
     <p>Matrículas: {analise.resultado.matriculas} · Ingressos: {analise.resultado.ingressos} ·
       Atendimentos: {analise.resultado.atendimentos} · Auditorias: {analise.resultado.auditorias}.</p>
     <p>{analise.resultado.sem_vinculos_conhecidos?'Sem vínculos conhecidos nas tabelas verificadas. Ainda exige revisão.':'Há vínculos ou situações que impedem tratamento automático.'}</p>
     <p><strong>Exclusão desabilitada.</strong> {analise.resultado.aviso}</p>
     <div className="admin-academico-actions">
       <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setAnalise(null)}>Fechar análise</button>
     </div>
   </AdminRegistroModalDev>}
   {podeAtender&&<AdminAtendimentoR12Dev supabase={supabase} podeGerir={podeAtender}
     modo="fila" onAbrirFicha={onAbrirFicha}/>}
   <div className="admin-academico-panels">
     <article className="admin-academico-panel">
       <h2>Inscrições por campanha <AdminAjuda titulo="Inscrições por campanha" descricao="Quantifica inscrições e matrículas por campanha." /></h2>
       {!estatisticas.campanhas.length?<p>Ainda não há inscrições no ambiente DEV.</p>:
       <div className="admin-academico-fichas">{estatisticas.campanhas.map(([nome,d])=><div className="admin-academico-ficha" key={nome}>
         <div><strong>{nome}</strong><small>Inscrições: {d.total} · Matriculados: {d.matriculados}</small></div>
         <strong>{percentual(d.matriculados,d.total)}</strong>
       </div>)}</div>}
     </article>
     <article className="admin-academico-panel">
       <h2>Como as pessoas conheceram a EducART <AdminAjuda titulo="Como as pessoas conheceram a EducART" descricao="Canais informados pelos inscritos, não tráfego medido." /></h2>
       {!estatisticas.canais.length?<p>Nenhuma origem cadastrada.</p>:
       <div className="admin-academico-fichas">{estatisticas.canais.map(([nome,total])=><div className="admin-academico-ficha" key={nome}><strong>{nome}</strong><span>{total}</span></div>)}</div>}
     </article>
   </div>
   <p className="admin-academico-note">Sem CRM paralelo. Exclusão definitiva não implementada. Alterações exigem Coordenação, RPC protegida e registro de auditoria. Histórico privado de atendimento permanece independente do WhatsApp.</p>
 </section>;
}
