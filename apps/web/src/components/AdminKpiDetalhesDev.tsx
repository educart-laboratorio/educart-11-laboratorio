'use client';
/** EducART 1.1 — detalhe dos KPIs acadêmicos. Somente leitura autorizada no Supabase DEV. */
import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {nomeGrupoTurma} from '@/lib/academico/nome-grupo-turma';

export type KpiAcademico='formacoes'|'turmas'|'matriculas'|'chamadas';
type Item={id:string;titulo:string;detalhe:string;tipoFormacao?:string|null;publicada?:boolean|null};
type Props={supabase:SupabaseClient;tipo:KpiAcademico;total:number;aoFechar:()=>void;aoAbrirGestao:()=>void;aoGerirFormacao?:(formacaoId:string)=>void;aoGerirTurma?:(turmaId:string)=>void};
const DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const NOMES:Record<KpiAcademico,string>={
 formacoes:'Formações',turmas:'Turmas',matriculas:'Matrículas',chamadas:'Chamadas registradas',
};
const MAX=30;

export function AdminKpiDetalhesDev({supabase,tipo,total,aoFechar,aoAbrirGestao,aoGerirFormacao,aoGerirTurma}:Props){
 const [itens,setItens]=useState<Item[]>([]);
 const [carregando,setCarregando]=useState(true);
 const [erro,setErro]=useState('');
 useEffect(()=>{
  let ativo=true;
  async function consultar(){
   setCarregando(true);setErro('');setItens([]);
   if(process.env.NEXT_PUBLIC_SUPABASE_URL!==DEV){
    if(ativo){setErro('Consulta acadêmica disponível somente no DEV privado.');setCarregando(false);}
    return;
   }
   try{
    let lista:Item[]=[];
    if(tipo==='formacoes'){
     const {data,error}=await supabase.from('formacoes').select('id,nome,tipo,publicada').order('nome').limit(MAX);
     if(error)throw error;
     lista=(data??[]).map(f=>({id:f.id,titulo:f.nome,detalhe:`${f.tipo} · ${f.publicada?'publicada':'não publicada'}`,tipoFormacao:f.tipo,publicada:f.publicada}));
    }else if(tipo==='turmas'){
     const {data,error}=await supabase.from('turmas').select('id,codigo,local_nome,situacao').order('codigo').limit(MAX);
     if(error)throw error;
     lista=(data??[]).map(t=>({id:t.id,titulo:nomeGrupoTurma(t.codigo),detalhe:`${t.local_nome??'Local a conferir'} · ${t.situacao.replaceAll('_',' ')}`}));
    }else if(tipo==='matriculas'){
     const {data,error}=await supabase.from('matriculas').select('id,situacao').limit(MAX);
     if(error)throw error;
     lista=(data??[]).map((m,i)=>({id:m.id,titulo:`Matrícula ${i+1}`,detalhe:`Situação: ${m.situacao.replaceAll('_',' ')}`}));
    }else{
     const {data,error}=await supabase.from('educart_chamadas_dev').select('id,situacao').limit(MAX);
     if(error)throw error;
     lista=(data??[]).map((c,i)=>({id:c.id,titulo:`Chamada ${i+1}`,detalhe:`Situação: ${c.situacao.replaceAll('_',' ')}`}));
    }
    if(ativo)setItens(lista);
   }catch{
    if(ativo)setErro('Não foi possível consultar os registros com a sessão e as permissões atuais.');
   }finally{if(ativo)setCarregando(false);}
  }
  void consultar();
  return()=>{ativo=false;};
 },[supabase,tipo]);
 return <AdminRegistroModalDev titulo={NOMES[tipo]} descricao={`Total no Supabase DEV: ${total} · consulta sem alterações`} onClose={aoFechar} amplo>
  {carregando&&<p role="status">Consultando registros reais...</p>}
  {erro&&<p role="alert">{erro}</p>}
  {!carregando&&!erro&&itens.length===0&&<p>Não há registros disponíveis nesta categoria.</p>}
  {!carregando&&!erro&&itens.length>0&&
   <ul style={{listStyle:'none',margin:'12px 0',padding:0,display:'grid',gap:10}}>
    {itens.map(item=><li key={item.id}
      className={tipo==='formacoes'?'admin-academico-ficha educart-formacao-card':'admin-academico-ficha'}
      style={tipo==='formacoes'?undefined:{display:'grid',gap:4}}>
      {tipo==='formacoes'?<>
        <strong>{item.titulo}</strong>
        <div>
          <small>Tipo: {item.tipoFormacao||'Não informado'}</small>
          <small>Publicação: {item.publicada===true?'Publicada':item.publicada===false?'Não publicada':'Não informada'}</small>
        </div>
      </>:<><strong>{item.titulo}</strong><small>{item.detalhe}</small></>}
      {tipo==='formacoes'&&aoGerirFormacao&&<div><button type="button" className="admin-btn admin-btn-secondary"
        onClick={()=>aoGerirFormacao(item.id)}>Gerir formação</button></div>}
      {tipo==='turmas'&&aoGerirTurma&&<div><button type="button" className="admin-btn admin-btn-secondary"
        onClick={()=>aoGerirTurma(item.id)}>Gerir turma</button></div>}
    </li>)}
   </ul>}
  {!carregando&&!erro&&total>MAX&&<p className="admin-academico-note">Exibindo no máximo {MAX} dos {total} registros; abra a gestão para consultar mais.</p>}
  <div className="admin-academico-actions">
   <button type="button" className="admin-btn admin-btn-primary" onClick={aoAbrirGestao}>Abrir gestão</button>
   <button type="button" className="admin-btn admin-btn-secondary" onClick={aoFechar}>Voltar ao painel</button>
  </div>
 </AdminRegistroModalDev>;
}
