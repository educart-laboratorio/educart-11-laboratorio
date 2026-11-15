'use client';
/** Indicadores clicáveis compartilhados pela Gestão de inscrições e Secretaria. */
import {useState} from 'react';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
export type TipoIndicadorInscricao='total'|'pendentes'|'confirmadas'|'matriculadas';
type InscricaoItem={id:string;nome_completo:string;turma_campanha:string;status:'pendente_confirmacao'|'confirmado'|'matriculado'|'cancelado'};
type Props={inscricoes:readonly InscricaoItem[];tituloTotal?:string;descricaoTotal?:string;
 onAbrirFicha:(id:string)=>void;onExibirLista:(tipo:TipoIndicadorInscricao)=>void};
const statuses:Record<TipoIndicadorInscricao,string|null>={
 total:null,pendentes:'pendente_confirmacao',confirmadas:'confirmado',matriculadas:'matriculado'};
const TITULOS:Record<TipoIndicadorInscricao,string>={
 total:'Inscrições recebidas',pendentes:'Pendentes',confirmadas:'Confirmadas',matriculadas:'Matriculadas'};
export function AdminIndicadoresInscricoesDev({
 inscricoes,tituloTotal='Inscrições recebidas',descricaoTotal='Todas as campanhas',onAbrirFicha,onExibirLista
}:Props){
 const [aberto,setAberto]=useState<TipoIndicadorInscricao|null>(null);
 const registros=aberto?inscricoes.filter(i=>!statuses[aberto]||i.status===statuses[aberto]):[];
 const cards=([
  {tipo:'total',titulo:tituloTotal,descricao:descricaoTotal,classe:'kpi-total'},
  {tipo:'pendentes',titulo:'Pendentes',descricao:'Sem presumir pagamento',classe:'kpi-pending'},
  {tipo:'confirmadas',titulo:'Confirmadas',descricao:'Confirmação cadastral',classe:'kpi-confirmed'},
  {tipo:'matriculadas',titulo:'Matriculadas',descricao:'Somente status matriculado',classe:'kpi-enrolled'}
 ] as const);
 return <>
  <div className="admin-kpi-grid" role="group" aria-label="Indicadores de inscrições">
   {cards.map(card=>{
    const total=inscricoes.filter(i=>!statuses[card.tipo]||i.status===statuses[card.tipo]).length;
    return <button type="button" key={card.tipo} className={'admin-kpi-card '+card.classe}
     onClick={()=>setAberto(card.tipo)} aria-haspopup="dialog"
     aria-label={'Abrir detalhes de '+card.titulo+': '+total}>
      <span className="kpi-label">{card.titulo}</span>
      <span className="kpi-value">{total}</span><small>{card.descricao}</small>
    </button>;
   })}
  </div>
  {aberto&&<AdminRegistroModalDev titulo={TITULOS[aberto]}
   descricao={registros.length+' inscrição(ões) neste indicador · somente consulta'} amplo
   onClose={()=>setAberto(null)}>
    {!registros.length?<p>Nenhuma inscrição nesta categoria.</p>:
     <ul className="admin-academico-fichas" style={{listStyle:'none',padding:0}}>
      {registros.slice(0,40).map(i=><li className="admin-academico-ficha" key={i.id}>
       <div><strong>{i.nome_completo}</strong><small>{i.turma_campanha} · {i.status.replaceAll('_',' ')}</small></div>
       <button type="button" className="admin-btn admin-btn-secondary"
        onClick={()=>{setAberto(null);onAbrirFicha(i.id);}}>Abrir ficha</button>
      </li>)}
     </ul>}
    {registros.length>40&&<p>Exibindo 40 de {registros.length}. Consulte as demais pela lista.</p>}
    <div className="admin-academico-actions">
     <button type="button" className="admin-btn admin-btn-primary"
      onClick={()=>{const tipo=aberto;setAberto(null);onExibirLista(tipo);}}>Ver na lista</button>
     <button type="button" className="admin-btn admin-btn-secondary"
      onClick={()=>setAberto(null)}>Fechar</button>
    </div>
  </AdminRegistroModalDev>}
 </>;
}
