'use client';
/** Visão minimalista do financeiro individual; dados exclusivamente do Supabase DEV. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminAjuda } from '@/components/AdminAjuda';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import { AdminFinanceiroEdicaoR11Dev, type ClienteR11, type PlanoR11, type ParcelaR11 } from '@/components/AdminFinanceiroEdicaoR11Dev';
import { montarProgresso24, historicoAteMesAtual, type StatusParcela } from '@/lib/financeiro/progresso-24';

type Props={supabase:SupabaseClient;podeGerir:boolean;onRascunhoPendenteChange?:(pendente:boolean)=>void};
type Pessoa={id:string;nome_completo:string};
type Turma={id:string;codigo:string};
type Matricula={id:string;pessoa_id:string;turma_id:string;situacao:string};
type Baixa={id:string;origem:'historico_conferido'|'recebimento';pago_em:string|null;valor_pago_centavos:number|null};
type ComprovanteChat={id:string;identificador_pix:string;pagador_nome:string;valor_centavos:number;ocorrido_em:string|null;matricula_id:string|null;situacao:'pendente_conferencia'|'conciliado'|'descartado';registrado_em:string};
const NOMES:Record<StatusParcela,string>={
 paga:'Paga',vencida:'Vencida',pendente:'Pendente',futura:'Futura',cancelada:'Cancelada',
 sem_lancamento:'Sem lançamento',sem_plano:'Sem plano aprovado',
};
const MOEDA=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const hoje=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const mesBahia=(s:string)=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bahia',year:'numeric',month:'2-digit'}).format(new Date(s));
async function lerTudo<T>(db:SupabaseClient,tabela:string,colunas:string,ordem:string):Promise<T[]>{
 const out:T[]=[],TAMANHO=300;
 for(let pagina=0;pagina<100;pagina++){
   const ini=pagina*TAMANHO;
   const {data,error}=await db.from(tabela).select(colunas).order(ordem,{ascending:true}).range(ini,ini+TAMANHO-1);
   if(error)throw Error('Falha de consulta em '+tabela+'. Confira autenticação e RLS.');
   const lote=(data??[]) as unknown as T[];out.push(...lote);
   if(lote.length<TAMANHO)return out;
 }
 throw Error('Consulta grande demais nesta prévia. Não classificar pagamentos com dados parciais.');
}
export function AdminFinanceiroEssencialR11Dev({supabase,podeGerir,onRascunhoPendenteChange}:Props){
 const [aba,setAba]=useState<'clientes'|'mes'|'pagamento'>('clientes');
 const [rascunhos,setRascunhos]=useState<Record<string,boolean>>({});
 const reportarRascunho=useCallback((id:string,pendente:boolean)=>setRascunhos(prev=>
   prev[id]===pendente?prev:{...prev,[id]:pendente}),[]);
 const rascunhoInline=useCallback((v:boolean)=>reportarRascunho('pagamento-inline',v),[reportarRascunho]);
 const rascunhoPlano=useCallback((v:boolean)=>reportarRascunho('plano-modal',v),[reportarRascunho]);
 const rascunhoPagamento=useCallback((v:boolean)=>reportarRascunho('pagamento-modal',v),[reportarRascunho]);
 const haRascunho=Object.values(rascunhos).some(Boolean);
 const mudarAba=(destino:typeof aba)=>{
   if(destino!==aba&&rascunhos['pagamento-inline']&&
     !window.confirm('Descartar as alterações financeiras não salvas?'))return;
   setAba(destino);
 };
 const fecharEditorPlano=()=>{
   if(rascunhos['plano-modal']&&!window.confirm('Descartar o acordo não salvo?'))return;
   setEditorPlano(false);
 };
 const fecharEditorPagamento=()=>{
   if(rascunhos['pagamento-modal']&&!window.confirm('Descartar o recebimento não salvo?'))return;
   setEditorPagamento(false);
 };
 useEffect(()=>{
   onRascunhoPendenteChange?.(haRascunho);
   return()=>onRascunhoPendenteChange?.(false);
 },[haRascunho,onRascunhoPendenteChange]);
 const [busca,setBusca]=useState('');
 const [mes,setMes]=useState(()=>hoje().slice(0,7));
 const [clientes,setClientes]=useState<ClienteR11[]>([]);
 const [baixas,setBaixas]=useState<Baixa[]>([]);
 const [comprovantesChat,setComprovantesChat]=useState<ComprovanteChat[]>([]);
 const [parcelaSelecionada,setParcelaSelecionada]=useState('');
 const [clienteSelecionado,setClienteSelecionado]=useState('');
 const [editorPlano,setEditorPlano]=useState(false);
 const [editorPagamento,setEditorPagamento]=useState(false);
 const [indicadorAberto,setIndicadorAberto]=useState<'recebido'|'vencidas'|'planos'|null>(null);
 const [parcelaAberta,setParcelaAberta]=useState<{id:string;numero:number}|null>(null);
 const [carregando,setCarregando]=useState(true);
 const [erro,setErro]=useState('');
 const atualizar=useCallback(async()=>{
  setCarregando(true);setErro('');
  if(!podeGerir){setCarregando(false);return;}
  try{
   const [ps,ts,ms,plans,pars,receipts,comprovantes]=await Promise.all([
     lerTudo<Pessoa>(supabase,'pessoas','id,nome_completo','id'),
     lerTudo<Turma>(supabase,'turmas','id,codigo','id'),
     lerTudo<Matricula>(supabase,'matriculas','id,pessoa_id,turma_id,situacao','id'),
     lerTudo<PlanoR11>(supabase,'educart_planos_financeiros_r11_dev',
       'matricula_id,competencia_inicial,dia_vencimento,valor_parcela_centavos,situacao,referencia_acordo','matricula_id'),
     lerTudo<ParcelaR11>(supabase,'educart_parcelas_financeiras_r11_dev',
       'id,matricula_id,numero,competencia,vencimento_em,valor_centavos,situacao,confirmado_em','id'),
     lerTudo<Baixa>(supabase,'educart_baixas_financeiras_r11_dev',
       'id,origem,pago_em,valor_pago_centavos','id'),
     lerTudo<ComprovanteChat>(supabase,'educart_comprovantes_triagem_chat_dev',
       'id,identificador_pix,pagador_nome,valor_centavos,ocorrido_em,matricula_id,situacao,registrado_em','registrado_em'),
   ]);
   const nomes=new Map(ps.map(p=>[p.id,p.nome_completo]));
   const turmas=new Map(ts.map(t=>[t.id,t.codigo]));
   setClientes(ms.map(m=>({
     id:m.id,nome:nomes.get(m.pessoa_id)??'Perfil não encontrado',
     turma:turmas.get(m.turma_id)??'Turma não encontrada',situacao:m.situacao,
     plano:plans.find(p=>p.matricula_id===m.id)??null,
     parcelas:pars.filter(p=>p.matricula_id===m.id).sort((a,b)=>a.numero-b.numero),
   })).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')||a.turma.localeCompare(b.turma,'pt-BR')));
   setBaixas(receipts);
   setComprovantesChat(comprovantes);
  }catch(e){setErro(e instanceof Error?e.message:'Consulta financeira indisponível.');setClientes([]);setBaixas([]);setComprovantesChat([]);}
  finally{setCarregando(false);}
 },[supabase,podeGerir]);
 useEffect(()=>{void atualizar();},[atualizar]);
 // Ao retornar do WhatsApp/ChatGPT, consulta o DEV novamente; sem polling ou publicacao.
 useEffect(()=>{
  let ultima=0;
  const aoRetomar=()=>{
   if(document.visibilityState!=='visible'||Date.now()-ultima<2000)return;
   ultima=Date.now();void atualizar();
  };
  window.addEventListener('focus',aoRetomar);
  document.addEventListener('visibilitychange',aoRetomar);
  return()=>{window.removeEventListener('focus',aoRetomar);document.removeEventListener('visibilitychange',aoRetomar);};
 },[atualizar]);
 const referencia=hoje();
 const fichas=useMemo(()=>clientes.map(c=>{
   const ativo=c.plano?.situacao==='ativo';
   const linhas=ativo?c.parcelas.map(p=>({
     competencia:p.competencia,vencimento_em:p.vencimento_em,
     status:(p.situacao==='paga'?'pago':'pendente') as 'pago'|'pendente',
     confirmado_em:p.confirmado_em,
   })):[];
   return {...c,
     progresso:montarProgresso24(ativo?c.plano!.competencia_inicial.slice(0,7):null,linhas,referencia),
     incompleto:Boolean(ativo&&c.parcelas.length!==24),
   };
 }),[clientes,referencia]);
 const filtrados=fichas.filter(c=>(c.nome+' '+c.turma).toLocaleLowerCase('pt-BR')
   .includes(busca.toLocaleLowerCase('pt-BR')));
 const vencidas=fichas.reduce((n,c)=>n+(c.incompleto?0:c.progresso.vencidas),0);
 const atuais=baixas.filter(b=>b.origem==='recebimento'&&b.pago_em&&mesBahia(b.pago_em)===referencia.slice(0,7))
   .reduce((s,b)=>s+(b.valor_pago_centavos??0),0);
 const recebidoSelecionado=baixas.filter(b=>b.origem==='recebimento'&&b.pago_em&&mesBahia(b.pago_em)===mes)
   .reduce((s,b)=>s+(b.valor_pago_centavos??0),0);
 const devidoSelecionado=fichas.filter(c=>!c.incompleto).reduce((s,c)=>
   s+c.parcelas.filter(p=>p.competencia.startsWith(mes)&&p.situacao==='pendente').reduce((v,p)=>v+p.valor_centavos,0),0);
 const abrirPlano=(id:string)=>{setClienteSelecionado(id);setEditorPlano(true);setAba('clientes');};
 const abrirPagamento=(id:string,parcela='')=>{
   setClienteSelecionado(id);setParcelaSelecionada(parcela);setEditorPagamento(true);
 };
 const clienteParcela=parcelaAberta?fichas.find(c=>c.id===parcelaAberta.id):undefined;
 const detalheParcela=clienteParcela?.progresso.parcelas.find(p=>p.numero===parcelaAberta?.numero);
 const registroParcela=clienteParcela?.parcelas.find(p=>p.numero===parcelaAberta?.numero);
 const aptaAPagamento=Boolean(clienteParcela?.plano?.situacao==='ativo'&&!clienteParcela.incompleto
  &&registroParcela?.situacao==='pendente'&&detalheParcela&&
  !['sem_plano','sem_lancamento','cancelada'].includes(detalheParcela.estado));
 const vencidasDetalhe=fichas.filter(c=>!c.incompleto).flatMap(c=>c.progresso.parcelas
  .filter(p=>p.estado==='vencida').map(p=>({id:c.id,nome:c.nome,numero:p.numero,competencia:p.competencia})));
 const planosAtivos=fichas.filter(c=>c.plano?.situacao==='ativo');
 return <section className="admin-r11" aria-label="Financeiro essencial da EducART">
   <div className="admin-r11-cabecalho">
     <div><span className="admin-kicker">FINANCEIRO · DEV · 24 PARCELAS POR MATRÍCULA</span>
       <h1 className="admin-page-title">Financeiro <AdminAjuda titulo="Financeiro"
         descricao="Acompanhe o progresso de pagamento de cada cliente e registre valores recebidos com identificação."
         cuidado="O histórico antigo não entra como receita do mês. A turma não determina quem pagou." /></h1>
       <p className="admin-page-desc">Controles essenciais, sem sincronizar os alunos da mesma turma.</p>
     </div>
     <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>void atualizar()} disabled={carregando}>↻ Atualizar</button>
   </div>
   <nav className="admin-r11-abas" aria-label="Seções do financeiro">
     {([
      ['clientes','Todos os clientes','Veja o avanço individual das 24 parcelas, com cores por situação.'],
      ['mes','Este mês','Consulte o mês atual ou anteriores, por cliente.'],
      ['pagamento','Registrar pagamento','Registre recebimento por dinheiro, débito, crédito ou Pix.'],
     ] as const).map(([id,nome,dica])=><div key={id} className="admin-r11-aba">
       <button type="button" className={aba===id?'active':''}
         aria-current={aba===id?'page':undefined} onClick={()=>mudarAba(id)}>{nome}</button>
       <AdminAjuda titulo={nome} descricao={dica}/></div>)}
   </nav>
   {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
   {!podeGerir&&<p role="alert">Esta área exige sua conta administrativa autorizada.</p>}
   {carregando&&<p role="status">Consultando matrículas, planos e pagamentos...</p>}
   {!carregando&&podeGerir&&!erro&&<>
    <div className="admin-r11-resumo" role="group" aria-label="Indicadores financeiros clicáveis">
      <button type="button" aria-haspopup="dialog" onClick={()=>setIndicadorAberto('recebido')}>
        <small>Recebido neste mês</small><strong>{MOEDA(atuais)}</strong></button>
      <button type="button" aria-haspopup="dialog" onClick={()=>setIndicadorAberto('vencidas')}>
        <small>Parcelas vencidas</small><strong>{vencidas}</strong></button>
      <button type="button" aria-haspopup="dialog" onClick={()=>setIndicadorAberto('planos')}>
        <small>Planos ativos</small><strong>{planosAtivos.length}</strong></button>
     </div>
     {aba==='clientes'&&<div className="admin-r11-principal">
      <div className="admin-r11-linha">
        <h2>Todos os clientes <AdminAjuda titulo="Todos os clientes" descricao="Cada matrícula possui 24 parcelas próprias. Verde é quitação confirmada, vermelho é vencimento devido não pago." /></h2>
        <small>{filtrados.length} matrícula(s) exibida(s)</small>
      </div>
      <div className="admin-r11-legenda" aria-label="Legenda das parcelas">
        <span className="admin-r11-legenda-item"><i className="admin-r11-paga" aria-hidden="true"/>Paga</span>
        <span className="admin-r11-legenda-item"><i className="admin-r11-vencida" aria-hidden="true"/>Vencida</span>
        <span className="admin-r11-legenda-item"><i className="admin-r11-pendente" aria-hidden="true"/>Pendente no prazo</span>
        <span className="admin-r11-legenda-item"><i className="admin-r11-futura" aria-hidden="true"/>Futura</span>
        <span className="admin-r11-legenda-item"><i className="admin-r11-sem_plano" aria-hidden="true"/>Sem plano / sem lançamento</span>
      </div>
      <label htmlFor="r11-busca" className="admin-academico-label">Buscar por cliente ou turma</label>
      <input id="r11-busca" className="admin-academico-input" value={busca}
        onChange={e=>setBusca(e.target.value)} placeholder="Nome ou turma"/>
      <div className="admin-r11-lista">
       {filtrados.map(c=><article className="admin-r11-cliente" key={c.id}>
        <div className="admin-r11-linha">
          <div><strong>{c.nome}</strong><small>{c.turma} · {c.situacao}</small></div>
          <strong>{c.progresso.pagas}/24 pagas</strong>
        </div>
        <div className="admin-r11-grade" role="group" aria-label={'24 parcelas de '+c.nome}>
         {c.progresso.parcelas.map(p=><button type="button" key={p.numero}
           className={'admin-r11-parcela admin-r11-'+p.estado}
           title={'Parcela '+p.numero+': '+NOMES[p.estado]}
           aria-label={'Parcela '+p.numero+': '+NOMES[p.estado]}
           aria-haspopup="dialog"
           onClick={()=>setParcelaAberta({id:c.id,numero:p.numero})}>{p.numero}</button>)}
        </div>
        <div className="admin-r11-linha">
          <small>{c.incompleto?'Registros incompletos: confira antes de classificar.':
            c.plano?.situacao==='rascunho'?'Rascunho sem cobrança ativa':
            !c.plano?'Sem plano financeiro confirmado':
            c.progresso.vencidas+' vencidas · '+c.progresso.pendentes+' pendentes no prazo'}</small>
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>abrirPlano(c.id)}>{c.plano?.situacao==='ativo'?'Importar histórico':'Configurar plano'}</button>
        </div>
       </article>)}
       {!filtrados.length&&<p>Nenhuma matrícula encontrada. A criação de turmas e vínculos pertence à Secretaria.</p>}
      </div>
    </div>}
    {aba==='mes'&&<div className="admin-r11-principal">
      <div className="admin-r11-linha"><h2>Este mês <AdminAjuda titulo="Este mês"
        descricao="Compare a situação da competência escolhida e o histórico anterior até o mês atual." /></h2>
        <label className="admin-academico-label" htmlFor="r11-mes">Mês de referência
          <input id="r11-mes" type="month" max={referencia.slice(0,7)} value={mes}
            onChange={e=>setMes(e.target.value)}/></label></div>
      <div className="admin-r11-resumo">
       <div><small>Recebido na competência selecionada (por data do pagamento)</small><strong>{MOEDA(recebidoSelecionado)}</strong></div>
       <div><small>Parcelas pendentes dessa competência</small><strong>{MOEDA(devidoSelecionado)}</strong></div>
      </div>
      <div className="admin-r11-lista">{fichas.map(c=>{
       const p=c.progresso.parcelas.find(p=>p.competencia===mes);
       const anteriores=historicoAteMesAtual(c.progresso,referencia)
         .filter(p=>p.competencia!==null&&p.competencia<=mes);
       return <article className="admin-r11-cliente" key={c.id}>
        <div className="admin-r11-linha">
          <div><strong>{c.nome}</strong><small>{c.turma} · {c.progresso.pagas}/24 pagas</small></div>
          <span className={'admin-r11-estado admin-r11-'+(p?.estado??'sem_plano')}>
            {p?NOMES[p.estado]:'Sem parcela prevista'}</span>
        </div>
        {c.incompleto?<p>Histórico parcial, classificação indisponível.</p>:
          <details><summary>Ver meses anteriores e atual</summary>
           <div className="admin-r11-meses">{anteriores.map(x=>
            <span key={x.numero} className={'admin-r11-mes admin-r11-'+x.estado}>
              {x.competencia} · {NOMES[x.estado]}</span>)}
            {!anteriores.length&&<small>Sem histórico de parcelas nesse período.</small>}
           </div>
          </details>}
       </article>;
      })}</div>
    </div>}
    {aba==='pagamento'&&<div className="admin-r11-principal">
      <details className="admin-r11-cliente">
        <summary>Comprovantes recebidos por conversa ({comprovantesChat.filter(c=>c.situacao==='pendente_conferencia').length} aguardando conferência)</summary>
        <p className="admin-academico-note">Triagem de imagens recebidas pela Direção. Não comprova crédito bancário, não registra quitação nem cria matrícula.</p>
        {!comprovantesChat.length&&<p>Nenhum comprovante em triagem no DEV.</p>}
        <div className="admin-r11-lista">
          {comprovantesChat.slice().reverse().slice(0,40).map(c=>{
            const clienteVinculado=c.matricula_id?clientes.find(x=>x.id===c.matricula_id):null;
            return <article className="admin-r11-cliente" key={c.id}>
              <strong>{c.pagador_nome} · {MOEDA(c.valor_centavos)}</strong>
              <small>Pix: {c.identificador_pix} · {c.situacao==='pendente_conferencia'?'Aguardando conferência':c.situacao==='conciliado'?'Conciliado':'Descartado'}</small>
              <small>{clienteVinculado?'Matrícula vinculada: '+clienteVinculado.nome+' · '+clienteVinculado.turma:'Matrícula não vinculada neste comprovante'}</small>
              {c.situacao==='pendente_conferencia'&&clienteVinculado?.plano?.situacao==='ativo'&&
                <button type="button" className="admin-btn admin-btn-secondary"
                  onClick={()=>{setClienteSelecionado(clienteVinculado.id);setParcelaSelecionada('');}}>
                  Selecionar matrícula para conferência
                </button>}
            </article>;
          })}
        </div>
      </details>
      <AdminFinanceiroEdicaoR11Dev supabase={supabase} podeGerir={podeGerir}
        clientes={clientes} modo="pagamento" inicial={clienteSelecionado}
        parcelaInicial={parcelaSelecionada} aoAtualizar={atualizar}
         onRascunhoPendenteChange={rascunhoInline}/>
      {!clientes.some(c=>c.plano?.situacao==='ativo')&&
        <p role="note">Antes de registrar o primeiro pagamento, configure e ative o plano individual em Todos os clientes.</p>}
    </div>}
   </>}
   {indicadorAberto&&<AdminRegistroModalDev
      titulo={indicadorAberto==='recebido'?'Recebido neste mês':
        indicadorAberto==='vencidas'?'Parcelas vencidas':'Planos ativos'}
      descricao="Detalhes de registros financeiros do DEV · somente consulta"
      onClose={()=>setIndicadorAberto(null)} amplo>
      {indicadorAberto==='recebido'&&<>
        <p>Total recebido no mês: <strong>{MOEDA(atuais)}</strong>. Histórico de outros períodos não é receita nova.</p>
        {!baixas.some(b=>b.origem==='recebimento'&&b.pago_em&&mesBahia(b.pago_em)===referencia.slice(0,7))
         ?<p>Nenhum recebimento confirmado no período.</p>
         :<ul>{baixas.filter(b=>b.origem==='recebimento'&&b.pago_em&&mesBahia(b.pago_em)===referencia.slice(0,7))
          .slice(0,40).map(b=><li key={b.id}>{b.pago_em?.slice(0,10)} · {MOEDA(b.valor_pago_centavos??0)}</li>)}</ul>}
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>{setIndicadorAberto(null);setAba('mes');}}>Consultar visão mensal</button>
      </>}
      {indicadorAberto==='vencidas'&&<>
        {!vencidasDetalhe.length?<p>Nenhuma parcela vencida nos registros completos.</p>:
          <ul className="admin-academico-fichas" style={{listStyle:'none',padding:0}}>
            {vencidasDetalhe.slice(0,40).map(p=><li className="admin-academico-ficha" key={p.id+'-'+p.numero}>
              <div><strong>{p.nome}</strong><small>Parcela {p.numero}/24 · {p.competencia}</small></div>
              <button type="button" className="admin-btn admin-btn-secondary"
                onClick={()=>{setIndicadorAberto(null);setParcelaAberta({id:p.id,numero:p.numero});}}>
                Consultar parcela</button>
            </li>)}
          </ul>}
        {vencidasDetalhe.length>40&&<p>Exibindo 40 parcelas. As demais ficam na lista individual.</p>}
      </>}
      {indicadorAberto==='planos'&&<>
        {!planosAtivos.length?<p>Nenhum plano financeiro ativo no DEV.</p>:
          <ul className="admin-academico-fichas" style={{listStyle:'none',padding:0}}>
            {planosAtivos.slice(0,40).map(c=><li className="admin-academico-ficha" key={c.id}>
              <div><strong>{c.nome}</strong><small>{c.turma} · {c.progresso.pagas}/24 pagas</small></div>
              <button type="button" className="admin-btn admin-btn-secondary"
                onClick={()=>{setIndicadorAberto(null);abrirPlano(c.id);}}>Ver acordo</button>
            </li>)}
          </ul>}
        {planosAtivos.length>40&&<p>Exibindo 40 planos. Veja os demais na lista.</p>}
      </>}
      <div className="admin-academico-actions">
        <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setIndicadorAberto(null)}>Fechar</button>
      </div>
    </AdminRegistroModalDev>}
    {parcelaAberta&&clienteParcela&&detalheParcela&&<AdminRegistroModalDev
      titulo={'Parcela '+parcelaAberta.numero+'/24'}
      descricao={clienteParcela.nome+' · '+clienteParcela.turma+' · '+NOMES[detalheParcela.estado]}
      onClose={()=>setParcelaAberta(null)}>
      <p><strong>Situação:</strong> {NOMES[detalheParcela.estado]}.
        {detalheParcela.competencia?' Competência '+detalheParcela.competencia+'.':
          ' Sem competência financeira lançada para este número.'}</p>
      {registroParcela&&clienteParcela.plano?.situacao==='ativo'&&
        <p>Valor previsto: {MOEDA(registroParcela.valor_centavos)} ·
          Vencimento: {registroParcela.vencimento_em}.</p>}
      {clienteParcela.incompleto&&<p role="alert">Registros incompletos: nenhuma classificação manual autorizada.</p>}
      {!clienteParcela.plano&&<p role="note">Sem plano aprovado, os 24 números são apenas posições de uma grade, não parcelas devidas ou quitadas.</p>}
      {clienteParcela.plano?.situacao==='rascunho'&&<p role="note">O acordo permanece em rascunho. Nenhuma cobrança foi ativada.</p>}
      {detalheParcela.estado==='paga'&&<p role="note">Pagamento confirmado. Mudar para pendente exigiria estorno auditado, indisponível neste fluxo.</p>}
      <div className="admin-academico-actions">
        {aptaAPagamento&&<button type="button" className="admin-btn admin-btn-primary"
          onClick={()=>{setParcelaAberta(null);abrirPagamento(clienteParcela.id,registroParcela!.id);}}>
          Registrar como paga — conferir recebimento</button>}
        {registroParcela?.situacao==='pendente'&&clienteParcela.plano?.situacao==='ativo'&&!clienteParcela.incompleto&&
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>setParcelaAberta(null)}>Manter pendente — sem alteração</button>}
        {(!clienteParcela.plano||clienteParcela.plano.situacao==='rascunho')&&
          <button type="button" className="admin-btn admin-btn-secondary"
            onClick={()=>{setParcelaAberta(null);abrirPlano(clienteParcela.id);}}>Consultar/configurar plano</button>}
        <button type="button" className="admin-btn admin-btn-secondary" onClick={()=>setParcelaAberta(null)}>
          Fechar sem alterar</button>
      </div>
    </AdminRegistroModalDev>}
    {editorPlano&&<AdminRegistroModalDev titulo="Configurar acordo financeiro" amplo cadastro
      descricao="Conferência de plano e histórico; não cria dívida sem confirmação"
      onClose={fecharEditorPlano}>
       <AdminFinanceiroEdicaoR11Dev supabase={supabase} podeGerir={podeGerir}
         clientes={clientes} modo="plano" inicial={clienteSelecionado} aoAtualizar={atualizar}
          onRascunhoPendenteChange={rascunhoPlano}/>
    </AdminRegistroModalDev>}
    {editorPagamento&&<AdminRegistroModalDev titulo="Registrar pagamento" amplo cadastro
      descricao="Confira valor, pagador, recebedor e comprovante antes da baixa"
      onClose={fecharEditorPagamento}>
       <AdminFinanceiroEdicaoR11Dev supabase={supabase} podeGerir={podeGerir}
         clientes={clientes} modo="pagamento" inicial={clienteSelecionado}
         parcelaInicial={parcelaSelecionada} aoAtualizar={atualizar}
          onRascunhoPendenteChange={rascunhoPagamento}/>
    </AdminRegistroModalDev>}
    <p className="admin-academico-footer">R11 DEV · parcelas integrais · nenhuma cobrança automática · confirmação humana.</p>
 </section>;
}
