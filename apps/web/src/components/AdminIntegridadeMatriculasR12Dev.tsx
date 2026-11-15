'use client';
/** Q3/Q14: auditoria visual conservadora de divergências, sem escrita. */
import {useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminAjuda} from '@/components/AdminAjuda';
type Inscricao={id:string;nome_completo:string;status:string};
type Vinculo={id:string;candidatura_id:string|null;situacao:string};
type Props={supabase:SupabaseClient;podeGerir:boolean;inscricoes:Inscricao[];aoAbrir:(id:string)=>void};
export function AdminIntegridadeMatriculasR12Dev({supabase,podeGerir,inscricoes,aoAbrir}:Props){
 const [vinculos,setVinculos]=useState<Vinculo[]>([]);
 const [consultando,setConsultando]=useState(true);
 const [erro,setErro]=useState('');
 const [amostraParcial,setAmostraParcial]=useState(false);
 useEffect(()=>{
  let ativo=true;
  const consultar=async()=>{
    setConsultando(true);setErro('');
    if(!podeGerir){if(ativo)setConsultando(false);return;}
    const {data,error,count}=await supabase.from('matriculas')
      .select('id,candidatura_id,situacao',{count:'exact'})
      .not('candidatura_id','is',null).limit(1001);
    if(!ativo)return;
    if(error){setErro('Não foi possível auditar as matrículas. Nenhum status foi alterado.');setVinculos([]);}
    else{
      setVinculos((data??[]) as Vinculo[]);
      setAmostraParcial((count??0)>1000||(data??[]).length>1000||inscricoes.length>=1000);
    }
    setConsultando(false);
  };
  void consultar();
  return()=>{ativo=false;};
 },[supabase,podeGerir,inscricoes.length]);
 const anomalias=useMemo(()=>{
  if(amostraParcial)return [];
  const mapa=new Map(vinculos.filter(m=>m.candidatura_id).map(m=>[m.candidatura_id,m]));
  return inscricoes.filter(i=>{
    const m=mapa.get(i.id);
    const efetiva=Boolean(m&&['ativa','concluida','trancada'].includes(m.situacao));
    return (i.status==='matriculado'&&!efetiva)||
      (i.status!=='matriculado'&&efetiva);
  }).map(i=>({inscricao:i,matricula:mapa.get(i.id)??null}));
 },[inscricoes,vinculos,amostraParcial]);
 if(!podeGerir)return null;
 return <section className="admin-academico-panel" aria-label="Integridade entre inscrição e matrícula">
  <h2>Conferir inscrições e matrículas <AdminAjuda titulo="Conferência de matrículas"
   descricao="Compara status da inscrição com o vínculo acadêmico efetivo."
   passos="Abra fichas divergentes para consultar o histórico e a comprovação do ingresso."
   cuidado="Não conserta dados automaticamente. Status matriculado não substitui matrícula ativa, Pix conferido ou bolsa autorizada." /></h2>
  {consultando?<p role="status">Conferindo a base acadêmica DEV...</p>:
   erro?<p role="alert">{erro}</p>:
   amostraParcial?<p role="alert">A amostra pode estar incompleta. Não classifique inscrições sem revisão; consulte a base paginada.</p>:
   anomalias.length===0?<p role="status">Nenhuma divergência detectada nos registros consultados. Isso não substitui a homologação.</p>:
   <div>
    <p role="alert"><strong>{anomalias.length} divergência(s) cadastral(is)</strong> identificada(s). Revise as fichas antes de ativar cobrança ou convite.</p>
    <div className="admin-academico-fichas">{anomalias.map(({inscricao,matricula})=>
      <article key={inscricao.id} className="admin-academico-ficha">
        <div><strong>{inscricao.nome_completo}</strong>
          <small>Inscrição: {inscricao.status} · Matrícula: {matricula?.situacao??'não localizada'}</small>
          <small>Nenhuma correção automática aplicada.</small></div>
        <button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>aoAbrir(inscricao.id)}>Revisar ficha</button>
      </article>)}</div>
   </div>}
 </section>;
}
