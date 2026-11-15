'use client';
/** Inventário histórico privado. Inscrição não equivale a matrícula ou aluno confirmado. */
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {obterPapeisGestao} from '@/lib/admin/autorizar-gestao';

type Historico={id:string;fonte:string;linha_origem:number;nome_completo:string|null;email:string|null;telefone:string|null;pessoa_id:string|null;estado:string;classificacao_legado:string;evidencia_legado:string|null};
type Classificacao='nao_verificado'|'possivel_legado'|'legado_confirmado'|'nao_legado';
const opcoes:{valor:Classificacao;rotulo:string}[]=[
 {valor:'nao_verificado',rotulo:'Não verificado'},
 {valor:'possivel_legado',rotulo:'Possível legado'},
 {valor:'legado_confirmado',rotulo:'Legado confirmado'},
 {valor:'nao_legado',rotulo:'Não legado'},
];
export function AdminHistoricosDev({supabase,podeGerir}:{supabase:SupabaseClient;podeGerir:boolean}){
 const [registros,setRegistros]=useState<Historico[]>([]);
 const [busca,setBusca]=useState('');
 const [aberto,setAberto]=useState<string|null>(null);
 const [classificacao,setClassificacao]=useState<Classificacao>('nao_verificado');
 const [evidencia,setEvidencia]=useState('');
 const [carregando,setCarregando]=useState(true);
 const [salvando,setSalvando]=useState(false);
 const [erro,setErro]=useState('');
 const [aviso,setAviso]=useState('');
 const [podeClassificar,setPodeClassificar]=useState(false);
 useEffect(()=>{let ativo=true;void (async()=>{const {data:{user},error}=await supabase.auth.getUser();const papeis=!error&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];if(ativo)setPodeClassificar(papeis.includes('coordenacao'));})();return()=>{ativo=false;};},[supabase]);
 const carregar=useCallback(async()=>{
  if(!podeGerir){setCarregando(false);return;}
  setCarregando(true);
  const {data,error}=await supabase.from('educart_contatos_historicos_dev')
   .select('id,fonte,linha_origem,nome_completo,email,telefone,pessoa_id,estado,classificacao_legado,evidencia_legado')
   .order('fonte').order('linha_origem').limit(1000);
  if(error||!data){setErro('Não foi possível consultar o inventário histórico com a autorização atual.');setRegistros([]);}
  else {setRegistros(data as Historico[]);setErro('');}
  setCarregando(false);
 },[supabase,podeGerir]);
 useEffect(()=>{void carregar();},[carregar]);
 const filtrados=useMemo(()=>{
  const termo=busca.trim().toLocaleLowerCase('pt-BR');
  const digitos=termo.replace(/\D/g,'');
  return registros.filter(r=>!termo||[r.nome_completo,r.email,r.telefone].some(v=>(v??'').toLocaleLowerCase('pt-BR').includes(termo))||
   (digitos.length>=4&&(r.telefone??'').replace(/\D/g,'').includes(digitos)));
 },[registros,busca]);
 const selecionado=registros.find(r=>r.id===aberto);
 const abrir=(r:Historico)=>{setAberto(r.id);setClassificacao(r.classificacao_legado as Classificacao);setEvidencia(r.evidencia_legado??'');setErro('');setAviso('');};
 const salvar=async()=>{
  if(!selecionado||salvando||!podeGerir)return;
  if(classificacao!=='nao_verificado'&&evidencia.trim().length<12){setErro('Registre uma referência de conferência com pelo menos 12 caracteres.');return;}
  if(classificacao==='legado_confirmado'&&(!selecionado.pessoa_id||selecionado.estado==='cadastro_provisorio_identidade_a_conferir')){setErro('Confirme primeiro a identidade provisória da pessoa e sua documentação acadêmica.');return;}
  setSalvando(true);setErro('');
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser();
   const papeis=!authError&&user&&!user.is_anonymous?await obterPapeisGestao(supabase,user.id):[];
   if(!papeis.includes('coordenacao'))throw Error('Somente a Coordenação pode classificar legados.');
   const {error}=await supabase.from('educart_contatos_historicos_dev')
    .update({classificacao_legado:classificacao,evidencia_legado:evidencia.trim()||null}).eq('id',selecionado.id);
   if(error)throw Error('O banco recusou a classificação; verifique as permissões.');
   setRegistros(antigos=>antigos.map(r=>r.id===selecionado.id?{...r,classificacao_legado:classificacao,evidencia_legado:evidencia.trim()||null}:r));
   setAviso('Classificação salva no DEV. Nenhuma matrícula foi criada.');
  }catch(e){setErro(e instanceof Error?e.message:'Falha ao salvar.');}
  finally{setSalvando(false);}
 };
 return <section className="admin-academico-panel" aria-label="Contatos históricos">
  <span className="admin-kicker">SECRETARIA · ACERVO HISTÓRICO · DEV</span>
  <h3>Inscrições históricas e identificação de legados</h3>
  <p>Registros antigos são contatos, não estudantes matriculados. Identidades provisórias exigem conferência antes de qualquer vínculo.</p>
  {erro&&!selecionado&&<p role="alert" className="admin-academico-message">{erro}</p>}
  {carregando?<p role="status">Consultando registros históricos...</p>:<>
   <label className="admin-academico-label" htmlFor="historicos-busca">Buscar nome, e-mail ou telefone</label>
   <input id="historicos-busca" className="search-input admin-academico-input" type="search"
    value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Localizar inscrição histórica"/>
   <p role="status">{filtrados.length} de {registros.length} inscrição(ões) histórica(s)</p>
   <div className="admin-academico-fichas">
    {filtrados.slice(0,100).map(r=><article className="admin-academico-ficha" key={r.id}>
     <div><strong>{r.nome_completo||'Nome a conferir'}</strong>
      <small>{r.estado==='cadastro_provisorio_identidade_a_conferir'?'Identidade provisória · ':''}{opcoes.find(o=>o.valor===r.classificacao_legado)?.rotulo||'Não verificado'}</small>
      <small>{r.email||r.telefone||'Contato não informado'}</small></div>
     <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>abrir(r)}
      aria-label={'Ver detalhes de '+(r.nome_completo||'inscrição sem nome')}>👁 Ver ficha</button>
    </article>)}
   </div>
   {filtrados.length>100&&<p>Exibindo os primeiros 100 resultados. Refine a busca para localizar outros registros.</p>}
  </>}
  {selecionado&&<AdminRegistroModalDev titulo={'Ficha histórica · '+(selecionado.nome_completo||'Nome a conferir')}
   descricao="Consulta privada de inscrição histórica. Não confirma matrícula ou identidade."
   onClose={()=>{if(!salvando){setAberto(null);setErro('');setAviso('');}}} amplo>
   <dl className="admin-registro-profile-data">
    <div><dt>Nome</dt><dd>{selecionado.nome_completo||'Não informado'}</dd></div>
    <div><dt>E-mail</dt><dd>{selecionado.email||'Não informado'}</dd></div>
    <div><dt>Telefone</dt><dd>{selecionado.telefone||'Não informado'}</dd></div>
    <div><dt>Origem</dt><dd>{selecionado.fonte} · linha {selecionado.linha_origem}</dd></div>
    <div><dt>Identidade</dt><dd>{selecionado.estado==='cadastro_provisorio_identidade_a_conferir'?'Provisória — conferir':selecionado.pessoa_id?'Cadastro de pessoa vinculado':'Sem pessoa vinculada'}</dd></div>
   </dl>
   <label className="admin-academico-label" htmlFor="historico-classificacao">Classificação acadêmica</label>
   <select id="historico-classificacao" className="filter-select" value={classificacao}
    onChange={e=>setClassificacao(e.target.value as Classificacao)} disabled={salvando||!podeClassificar}>
    {opcoes.map(o=><option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
   </select>
   <label className="admin-academico-label" htmlFor="historico-evidencia">Referência documental da conferência</label>
   <textarea id="historico-evidencia" className="admin-academico-textarea" rows={3} maxLength={1000}
    value={evidencia} onChange={e=>setEvidencia(e.target.value)} disabled={salvando||!podeClassificar}
    placeholder="Identifique o registro físico ou documento conferido; não cole dados sensíveis."/>
   {erro&&<p role="alert">{erro}</p>}{aviso&&<p role="status">{aviso}</p>}
   {!podeClassificar&&<p className="admin-academico-note">Consulta disponível; classificação reservada à Coordenação.</p>}
   {podeClassificar&&<button type="button" className="admin-btn admin-btn-primary" onClick={()=>void salvar()} disabled={salvando}>
    {salvando?'Salvando...':'Salvar classificação (Coordenação)'}
   </button>}
  </AdminRegistroModalDev>}
 </section>;
}
