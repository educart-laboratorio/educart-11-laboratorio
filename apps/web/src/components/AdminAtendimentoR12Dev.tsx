'use client';
/** Q11: atendimento é registrado manualmente; não lê mensagens externas nem dispara WhatsApp. */
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminAjuda} from '@/components/AdminAjuda';
import {obterPapeisGestao} from '@/lib/admin/autorizar-gestao';
type Atendimento={id:string;inscricao_id:string;canal:string;resultado:string;observacao:string;proximo_retorno_em:string|null;registrado_em:string};
type Candidato={id:string;nome_completo:string};
type Props={supabase:SupabaseClient;podeGerir:boolean;modo:'fila'|'ficha';inscricaoId?:string;onAbrirFicha?:(id:string)=>void};
const CANAIS=[['whatsapp','WhatsApp manual'],['telefone','Telefone'],['presencial','Presencial'],['email','E-mail'],['outro','Outro']] as const;
const RESULTADOS=[['contatado','Contatado'],['aguardando','Aguardando'],['interessado','Interessado'],['retornar','Retornar'],['sem_resposta','Sem resposta']] as const;
const rotulo=(v:string)=>RESULTADOS.find(x=>x[0]===v)?.[1]??v;
export function AdminAtendimentoR12Dev({supabase,podeGerir,modo,inscricaoId,onAbrirFicha}:Props){
 const [eventos,setEventos]=useState<Atendimento[]>([]);
 const [nomes,setNomes]=useState<Candidato[]>([]);
 const [canal,setCanal]=useState('whatsapp');
 const [resultado,setResultado]=useState('contatado');
 const [observacao,setObservacao]=useState('');
 const [proximo,setProximo]=useState('');
 const [carregando,setCarregando]=useState(true);
 const [gravando,setGravando]=useState(false);
 const [erro,setErro]=useState('');
 const [sucesso,setSucesso]=useState('');
 const [truncado,setTruncado]=useState(false);
 const carregar=useCallback(async()=>{
  setCarregando(true);setErro('');
  if(!podeGerir){setCarregando(false);return;}
  let consulta=supabase.from('educart_atendimentos_r12_dev')
    .select('id,inscricao_id,canal,resultado,observacao,proximo_retorno_em,registrado_em')
    .order('registrado_em',{ascending:false}).limit(1501);
  if(modo==='ficha'&&inscricaoId)consulta=consulta.eq('inscricao_id',inscricaoId);
  const [a,b]=await Promise.all([
    consulta,
    modo==='fila'?supabase.from('inscricoes_oficina').select('id,nome_completo').order('created_at',{ascending:false}).limit(1501):
      Promise.resolve({data:[] as Candidato[],error:null}),
  ]);
  if(a.error||b.error){setErro('Não foi possível consultar histórico de atendimento com as permissões atuais.');setEventos([]);setNomes([]);}
  else {
    setTruncado((a.data??[]).length>1500||(b.data??[]).length>1500);
    setEventos(((a.data??[]) as Atendimento[]).slice(0,1500));
    setNomes(((b.data??[]) as Candidato[]).slice(0,1500));
  }
  setCarregando(false);
 },[supabase,podeGerir,modo,inscricaoId]);
 useEffect(()=>{void carregar();},[carregar]);
 const fila=useMemo(()=>{
   if(modo!=='fila'||truncado)return [];
   const visto=new Set<string>();
   return eventos.filter(e=>{
     if(visto.has(e.inscricao_id))return false;
     visto.add(e.inscricao_id);
     return e.resultado==='retornar'&&Boolean(e.proximo_retorno_em);
   }).sort((a,b)=>(a.proximo_retorno_em??'').localeCompare(b.proximo_retorno_em??''));
 },[eventos,modo,truncado]);
 const cadastrar=async(e:FormEvent)=>{
  e.preventDefault();if(gravando||!podeGerir||!inscricaoId)return;
  if(resultado==='retornar'&&!proximo){setErro('Defina a data do próximo retorno.');return;}
  setGravando(true);setErro('');setSucesso('');
  try{
    const {data:{user},error:authError}=await supabase.auth.getUser();
    const roles=!authError&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];
    if(!user||!roles.some(x=>x==='secretaria'||x==='coordenacao'))
      throw Error('Apenas o operador autorizado pode registrar atendimento.');
    const {error}=await supabase.from('educart_atendimentos_r12_dev').insert({
      inscricao_id:inscricaoId,canal,resultado,observacao:observacao.trim(),
      proximo_retorno_em:resultado==='retornar'?proximo:null,registrado_por:user.id,
    });
    if(error)throw Error('Registro de atendimento recusado. Confira data, permissão e inscrição.');
    setCanal('whatsapp');setResultado('contatado');setObservacao('');setProximo('');
    await carregar();setSucesso('Interação manual registrada no histórico privado; nenhuma mensagem foi enviada.');
  }catch(x){setErro(x instanceof Error?x.message:'Não foi possível salvar o atendimento.');}
  finally{setGravando(false);}
 };
 return <section className="admin-academico-panel" aria-label={modo==='fila'?'Fila de retornos':'Histórico de atendimento'}>
  <h2>{modo==='fila'?'Fila de retornos':'Histórico de atendimento'} <AdminAjuda
    titulo={modo==='fila'?'Fila de retornos':'Histórico de atendimento'}
    descricao={modo==='fila'?'Mostra a ação mais recente que ainda pede retorno de cada inscrição.':'Registre manualmente canal, resultado e próximo contato nesta inscrição.'}
    cuidado="Não lemos conversas do WhatsApp e não enviamos mensagens automáticas. Registros ficam auditados." /></h2>
  {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
  {sucesso&&<p role="status" className="admin-academico-message">{sucesso}</p>}
  {carregando&&<p role="status">Consultando atendimentos privados...</p>}
  {truncado&&<p role="alert">Histórico muito extenso para esta consulta. Não considerar esta fila completa; filtre uma inscrição.</p>}
  {!carregando&&modo==='fila'&&<div className="admin-academico-fichas">
    {fila.map(e=><article className="admin-academico-ficha" key={e.id}>
      <div><strong>{nomes.find(n=>n.id===e.inscricao_id)?.nome_completo??'Inscrição não localizada'}</strong>
        <small>Retorno em {e.proximo_retorno_em} · via {e.canal}</small>
        <small>Registre o novo contato na ficha da inscrição.</small>
        {onAbrirFicha&&<button type="button" className="admin-btn admin-btn-secondary"
          onClick={()=>onAbrirFicha(e.inscricao_id)}>Abrir ficha e atender</button>}</div>
    </article>)}
    {!fila.length&&!truncado&&<p>Não há retornos agendados nos registros consultados.</p>}
  </div>}
  {modo==='ficha'&&<>
    <form className="admin-academico-panel" onSubmit={cadastrar}>
      <label className="admin-academico-label" htmlFor="r12-atend-canal">Canal do contato</label>
      <select id="r12-atend-canal" className="filter-select" value={canal}
        onChange={e=>setCanal(e.target.value)} disabled={gravando}>
        {CANAIS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
      <label className="admin-academico-label" htmlFor="r12-atend-result">Resultado</label>
      <select id="r12-atend-result" className="filter-select" value={resultado}
        onChange={e=>{setResultado(e.target.value);setProximo('');}} disabled={gravando}>
        {RESULTADOS.map(([value,label])=><option key={value} value={value}>{label}</option>)}
      </select>
      {resultado==='retornar'&&<>
        <label className="admin-academico-label" htmlFor="r12-atend-retorno">Data do próximo contato</label>
        <input id="r12-atend-retorno" type="date" required className="search-input admin-academico-input"
          value={proximo} onChange={e=>setProximo(e.target.value)} disabled={gravando}/>
      </>}
      <label className="admin-academico-label" htmlFor="r12-atend-obs">Observação breve e privada (sem dados sensíveis)</label>
      <textarea id="r12-atend-obs" rows={3} maxLength={500} className="admin-academico-textarea"
        value={observacao} onChange={e=>setObservacao(e.target.value)} disabled={gravando}/>
      <button type="submit" className="admin-btn admin-btn-primary" disabled={gravando||!podeGerir}>
        {gravando?'Registrando...':'Registrar contato manual'}
      </button>
      <p className="admin-academico-note">O histórico é imutável para preservar autoria e data. Uma nova tentativa é um novo registro.</p>
    </form>
    <h3>Interações desta inscrição</h3>
    <div className="admin-academico-fichas">{eventos.map(e=><article className="admin-academico-ficha" key={e.id}>
      <div><strong>{rotulo(e.resultado)} · {e.canal}</strong>
        <small>{new Date(e.registrado_em).toLocaleString('pt-BR',{timeZone:'America/Bahia'})}</small>
        {e.proximo_retorno_em&&<small>Próximo contato: {e.proximo_retorno_em}</small>}
        {e.observacao&&<p>{e.observacao}</p>}
      </div>
    </article>)}
    {!eventos.length&&<p>Nenhum contato registrado nesta ficha.</p>}</div>
  </>}
 </section>;
}
