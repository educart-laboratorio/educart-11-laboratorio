'use client';
/** Propostas de professores: caixa de entrada privada, nenhuma aprovação automática. */
import {useCallback,useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {PROPOSTAS_DOCENTES_HABILITADAS} from '@/lib/supabase/client';

type Proposta={
 id:string;nome_professor:string;email:string|null;whatsapp:string|null;
 proposta:Record<string,unknown>;estado:string;criado_em:string;
};
const CAMPOS:Record<string,string>={
 nome:'Solução',tipo:'Tipo',descricao:'Proposta',chamada_curta:'Chamada curta',
 formato:'Formato',objetivos:'Objetivos',publico_alvo:'Público-alvo',
 idade_minima:'Idade mínima',exige_experiencia:'Exige experiência anterior',
 duracao_meses:'Duração em meses',carga_horaria_horas:'Carga horária total',
 ementa:'Ementa',modulos_planejados:'Módulos',avaliacao:'Avaliação',
 disciplinas:'Disciplinas',metodologia:'Metodologia',competencias:'Competências',
 atividades_praticas:'Atividades práticas',criterios_conclusao:'Conclusão',
 certificacao:'Certificação',projeto_final:'Projeto final',valor_matricula_reais:'Matrícula sugerida (R$)',
 valor_mensalidade_reais:'Mensalidade sugerida (R$)',quantidade_mensalidades_referencia:'Quantidade de mensalidades',
 materiais_inclusos:'Materiais incluídos',perguntas_frequentes:'Perguntas frequentes',
 codigo:'Código sugerido da turma',inicio_em:'Início',termina_em:'Término',
 local_nome:'Local',local_endereco:'Endereço',capacidade:'Capacidade',
 inscricoes_abrem_em:'Abertura de inscrições',inscricoes_encerram_em:'Encerramento de inscrições',
 horarios_semanais:'Horários',foto_professor_dimensoes:'Foto docente (resolução)',
};
export function AdminPropostasDocentesDev({supabase,podeGerir}:{
 supabase:SupabaseClient;podeGerir:boolean;
}){
 const [dados,setDados]=useState<Proposta[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState('');
 const [fotoLinks,setFotoLinks]=useState<Record<string,string>>({});
 const [fotoErro,setFotoErro]=useState<Record<string,string>>({});
 const [fotoCarregando,setFotoCarregando]=useState<string|null>(null);
 const carregar=useCallback(async()=>{
  if(!podeGerir||!PROPOSTAS_DOCENTES_HABILITADAS)return;
  setLoading(true);setError('');
  const {data,error}=await supabase.from('educart_propostas_solucoes_docentes_dev')
   .select('id,nome_professor,email,whatsapp,proposta,estado,criado_em')
   .order('criado_em',{ascending:false}).limit(250);
  if(error){setError('Não foi possível consultar propostas. Verifique o acesso da Coordenação.');setDados([]);}
  else setDados((data??[]) as Proposta[]);
  setLoading(false);
 },[supabase,podeGerir]);
 useEffect(()=>{void carregar();},[carregar]);
 const prepararFoto=async(p:Proposta)=>{
  const path=p.proposta?.foto_professor_storage_path;
  if(typeof path!=='string'||!/^propostas\/[0-9a-f-]{36}\/foto\.(jpg|png|webp)$/.test(path))return;
  setFotoCarregando(p.id);setFotoErro(a=>({...a,[p.id]:''}));
  try{
   const {data,error}=await supabase.storage.from('educart-fotos-propostas-docentes-dev').createSignedUrl(path,120);
   if(error||!data?.signedUrl)throw Error('Acesso à foto indisponível. Confira as permissões da Coordenação.');
   setFotoLinks(a=>({...a,[p.id]:data.signedUrl}));
  }catch(e){setFotoErro(a=>({...a,[p.id]:e instanceof Error?e.message:'Não foi possível abrir a foto.'}));}
  finally{setFotoCarregando(null);}
 };
 if(!podeGerir||!PROPOSTAS_DOCENTES_HABILITADAS)return null;
 return <section className="admin-academico-panel" aria-label="Propostas docentes recebidas">
  <div className="admin-academico-section-head">
   <div><h3>Propostas recebidas pelo link /criar</h3>
    <p className="admin-academico-note">Recebimentos pendentes de análise; não são cursos publicados nem docentes aprovados.</p></div>
   <button type="button" className="admin-btn admin-btn-secondary" disabled={loading} onClick={()=>void carregar()}>
    {loading?'Consultando...':'Atualizar propostas'}
   </button>
  </div>
  {error&&<p role="alert" className="admin-academico-message">{error}</p>}
  {!loading&&!error&&<p role="status">{dados.length===0
    ? 'Nenhuma proposta docente recebida até o momento.'
    : dados.length===1?'1 proposta docente recebida.':`${dados.length} propostas docentes recebidas.`}</p>}
  <div className="admin-academico-fichas">
   {dados.map(p=><details key={p.id} className="admin-academico-ficha">
    <summary style={{cursor:'pointer'}}>
     <strong>{typeof p.proposta?.nome==='string'?p.proposta.nome:'Solução sem nome'}</strong>
     <span> · {p.nome_professor} · Pendente de análise</span>
    </summary>
    <p><strong>Contato privado:</strong> {p.email||p.whatsapp||'Não informado'}</p>
    <p><strong>Recebido:</strong> {new Date(p.criado_em).toLocaleString('pt-BR')}</p>
    {typeof p.proposta?.foto_professor_storage_path==='string'&&<div className="admin-academico-actions">
     <button type="button" className="admin-btn admin-btn-secondary" disabled={fotoCarregando===p.id} onClick={()=>void prepararFoto(p)}>
      {fotoCarregando===p.id?'Preparando acesso...':'Preparar visualização da foto'}
     </button>
     {fotoLinks[p.id]&&<a className="admin-btn admin-btn-secondary" href={fotoLinks[p.id]} target="_blank" rel="noopener noreferrer">Ver foto (link privado temporário)</a>}
     {fotoErro[p.id]&&<p role="alert">{fotoErro[p.id]}</p>}
    </div>}
    <dl className="admin-registro-profile-data">
     {Object.entries(p.proposta??{}).filter(([k,v])=>k!=='origem'&&k!=='foto_professor_storage_path'&&v!==''&&v!==null&&v!==undefined)
      .map(([k,v])=><div key={k}>
       <dt>{CAMPOS[k]||k.replaceAll('_',' ')}</dt>
       <dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>
        {Array.isArray(v)?v.map(h=>typeof h==='object'&&h?Object.values(h).join(' · '):String(h)).join(' / '):
         typeof v==='object'?JSON.stringify(v):String(v)}
       </dd>
      </div>)}
    </dl>
   </details>)}
  </div>
 </section>;
}
