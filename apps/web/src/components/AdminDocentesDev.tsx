'use client';
/** EducART 1.1 — docentes no esquema DEV existente; sem contas, publicação ou matrícula. */
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {AdminAjuda} from '@/components/AdminAjuda';
import {AdminPropostasDocentesDev} from '@/components/AdminPropostasDocentesDev';
import {AdminRegistroModalDev} from '@/components/AdminRegistroModalDev';
import {PerfilPublicoDocente} from '@/components/PerfilPublicoDocente';
import {obterPapeisGestao} from '@/lib/admin/autorizar-gestao';
import {ACOES_ACADEMICAS_EXCLUSIVAS_DEV} from '@/lib/supabase/client';

type Docente={
  id:string;nome_completo:string;nome_artistico:string|null;email:string|null;
  whatsapp:string|null;instagram:string|null;formacao_profissional:string|null;
  areas_atuacao:string|null;experiencia_profissional:string|null;
  minibiografia:string|null;disponibilidade:string|null;
  autorizou_divulgacao:boolean;apresentacao_publica:string|null;situacao:'ativo'|'inativo'|'pendente_validacao';
};
type Turma={id:string;codigo:string;docente_id:string|null;situacao:string;formacao_id:string;inicio_em:string|null;termina_em:string|null};
type Formacao={id:string;nome:string};
type Ficha={nome_completo:string;nome_artistico:string;email:string;whatsapp:string;
  instagram:string;formacao_profissional:string;areas_atuacao:string;
  experiencia_profissional:string;minibiografia:string;disponibilidade:string;
  autorizou_divulgacao:boolean;apresentacao_publica:string};
const VAZIA:Ficha={nome_completo:'',nome_artistico:'',email:'',whatsapp:'',instagram:'',
 formacao_profissional:'',areas_atuacao:'',experiencia_profissional:'',
 minibiografia:'',disponibilidade:'',autorizou_divulgacao:false,apresentacao_publica:''};
const CAMPOS:{chave:Exclude<keyof Ficha,'autorizou_divulgacao'>;rotulo:string;grande?:boolean}[]=[
 {chave:'nome_completo',rotulo:'Nome completo do(a) docente'},
 {chave:'nome_artistico',rotulo:'Nome artístico'},
 {chave:'email',rotulo:'E-mail'}, {chave:'whatsapp',rotulo:'WhatsApp'},
 {chave:'instagram',rotulo:'Instagram'},
 {chave:'formacao_profissional',rotulo:'Formação profissional',grande:true},
 {chave:'areas_atuacao',rotulo:'Áreas de atuação',grande:true},
 {chave:'experiencia_profissional',rotulo:'Experiência profissional',grande:true},
 {chave:'minibiografia',rotulo:'Minibiografia privada',grande:true},
 {chave:'disponibilidade',rotulo:'Disponibilidade',grande:true},
 {chave:'apresentacao_publica',rotulo:'Apresentação pública autorizada (não inclua contatos)',grande:true},
];
const PERGUNTAS_PROFESSOR = [
  'EducART · Ficha de professor(a)',
  '1. Nome completo e nome artístico',
  '2. WhatsApp e e-mail profissional',
  '3. Cidade e Instagram profissional',
  '4. Formação e qualificações',
  '5. Disciplinas e áreas que pode ministrar',
  '6. Experiência artística e pedagógica',
  '7. Breve apresentação profissional',
  '8. Dias e horários disponíveis',
  '9. Autoriza divulgação futura de perfil? (sim/não)',
  'A Coordenação confere tudo antes de cadastrar. Não envie documentos nem dados sensíveis pelo WhatsApp.'
].join('\n');
type Props={supabase:SupabaseClient;podeGerir:boolean};
export function AdminDocentesDev({supabase,podeGerir}:Props){
 const [docentes,setDocentes]=useState<Docente[]>([]);
 const [turmas,setTurmas]=useState<Turma[]>([]);
 const [formacoes,setFormacoes]=useState<Formacao[]>([]);
 const [visualizarId,setVisualizarId]=useState<string|null>(null);
 const [gerandoId,setGerandoId]=useState<string|null>(null);
 const [avisoPerfil,setAvisoPerfil]=useState('');
 const [erroPerfil,setErroPerfil]=useState('');
 const [carregando,setCarregando]=useState(true);
 const [salvando,setSalvando]=useState(false);
 const [erro,setErro]=useState('');
 const [aviso,setAviso]=useState('');
 const [busca,setBusca]=useState('');
 const [editarId,setEditarId]=useState<string|null>(null);
 const [formAberto,setFormAberto]=useState(false);
 const [ficha,setFicha]=useState<Ficha>(VAZIA);
 const [situacaoEdicao,setSituacaoEdicao]=useState<Docente['situacao']>('pendente_validacao');
 const carregar=useCallback(async()=>{
   setCarregando(true);setErro('');
   if(!podeGerir){setDocentes([]);setTurmas([]);setFormacoes([]);setCarregando(false);return;}
   const [d,t,f]=await Promise.all([
    supabase.from('educart_docentes_dev')
      .select('id,nome_completo,nome_artistico,email,whatsapp,instagram,formacao_profissional,areas_atuacao,experiencia_profissional,minibiografia,disponibilidade,autorizou_divulgacao,apresentacao_publica,situacao')
      .order('nome_completo').limit(1001),
    supabase.from('turmas').select('id,codigo,docente_id,situacao,formacao_id,inicio_em,termina_em').order('codigo').limit(1001),
    supabase.from('formacoes').select('id,nome').order('nome').limit(1001),
   ]);
   if(d.error||t.error||f.error||(d.data??[]).length>1000||(t.data??[]).length>1000||(f.data??[]).length>1000){
     setErro('Consulta de docentes ou turmas indisponível ou incompleta. Não exibir cadastros parciais.');
     setDocentes([]);setTurmas([]);
   } else {setDocentes((d.data??[]) as Docente[]);setTurmas((t.data??[]) as Turma[]);setFormacoes((f.data??[]) as Formacao[]);}
   setCarregando(false);
 },[supabase,podeGerir]);
 useEffect(()=>{void carregar();},[carregar]);
 const encontrados=useMemo(()=>docentes.filter(d=>[d.nome_completo,d.nome_artistico??'',d.areas_atuacao??'']
   .some(c=>c.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))),[docentes,busca]);
 const editar=(d:Docente)=>{
   setSituacaoEdicao(d.situacao);
   setEditarId(d.id);setFicha({
     nome_completo:d.nome_completo,nome_artistico:d.nome_artistico??'',
     email:d.email??'',whatsapp:d.whatsapp??'',instagram:d.instagram??'',
     formacao_profissional:d.formacao_profissional??'',areas_atuacao:d.areas_atuacao??'',
     experiencia_profissional:d.experiencia_profissional??'',minibiografia:d.minibiografia??'',
     disponibilidade:d.disponibilidade??'',autorizou_divulgacao:d.autorizou_divulgacao,
     apresentacao_publica:d.apresentacao_publica??''
   });setVisualizarId(null);setFormAberto(true);setAviso('');setErro('');
 };
 const abrirNovo=()=>{setFicha(VAZIA);setSituacaoEdicao('pendente_validacao');setEditarId(null);setVisualizarId(null);setFormAberto(true);setAviso('');setErro('');};
 const copiarPerguntas=async()=>{
   try {
     await navigator.clipboard.writeText(PERGUNTAS_PROFESSOR);
     setAviso('Perguntas copiadas. Nada foi enviado automaticamente.');
     setErro('');
   } catch {setErro('Cópia indisponível neste navegador; use a ficha normalmente.');}
 };

 const visualizar=(d:Docente)=>{
   setFormAberto(false);setEditarId(null);setVisualizarId(d.id);
   setAvisoPerfil('');setErroPerfil('');
 };
 const compartilhar=async(d:Docente)=>{
   if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV||!podeGerir||gerandoId)return;
   if(!d.autorizou_divulgacao||!d.apresentacao_publica?.trim()){
     setErroPerfil('Antes de compartilhar, registre a autorização do professor e sua apresentação pública na edição da ficha.');return;
   }
   setGerandoId(d.id);setErroPerfil('');setAvisoPerfil('');
   try{
     const {data:{user},error:authError}=await supabase.auth.getUser();
     const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
     if(!papeis.includes('coordenacao'))throw Error('Somente Coordenação pode gerar este link.');
     const {data,error}=await supabase.rpc('educart_publicar_perfil_docente_dev',{p_docente_id:d.id});
     if(error||typeof data!=='string'||!/^[0-9a-f-]{36}$/i.test(data))
       throw Error('O link não foi gerado. Confira autorização, apresentação pública e permissões.');
     const url=new URL('/docentes/perfil/'+data,window.location.origin).toString();
     await navigator.clipboard.writeText(url);
     setAvisoPerfil('Link copiado. A prévia ainda exige acesso ao Codespaces; o domínio público não foi publicado.');
   }catch(x){setErroPerfil(x instanceof Error?x.message:'Não foi possível gerar ou copiar o link.');}
   finally{setGerandoId(null);}
 };
 const revogar=async(d:Docente)=>{
   if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV||!podeGerir||gerandoId)return;
   if(!window.confirm('Desativar o link compartilhado deste professor? Qualquer link anterior deixará de funcionar.'))return;
   setGerandoId(d.id);setErroPerfil('');setAvisoPerfil('');
   try{
     const {data:{user},error:authError}=await supabase.auth.getUser();
     const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
     if(!papeis.includes('coordenacao'))throw Error('Ação restrita à Coordenação.');
     const {error}=await supabase.rpc('educart_revogar_perfil_docente_dev',{p_docente_id:d.id});
     if(error)throw Error('Não foi possível desativar este link.');
     setAvisoPerfil('Link desativado no DEV; nenhuma ficha foi excluída.');
   }catch(x){setErroPerfil(x instanceof Error?x.message:'Falha ao desativar link.');}
   finally{setGerandoId(null);}
 };
 const visualizado=docentes.find(d=>d.id===visualizarId);
 const vinculos=visualizado?turmas.filter(t=>t.docente_id===visualizado.id)
   .sort((a,b)=>(b.inicio_em??'').localeCompare(a.inicio_em??'')):[];
 const atuais=vinculos.filter(t=>!/(encerrad|conclu|cancelad|inativ)/i.test(t.situacao));
 const anteriores=vinculos.filter(t=>/(encerrad|conclu|cancelad|inativ)/i.test(t.situacao));
 const nomeTurma=(t:Turma)=>{
   const nome=formacoes.find(f=>f.id===t.formacao_id)?.nome;
   return t.codigo+(nome?' · '+nome:'');
 };

 const gravar=async(e:FormEvent<HTMLFormElement>)=>{
   e.preventDefault();if(salvando||!podeGerir)return;
   if(ficha.nome_completo.trim().length<3||ficha.nome_completo.trim().length>150){
     setErro('Nome completo precisa ter entre 3 e 150 caracteres.');return;
   }
   if(ficha.email&&(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ficha.email.trim())||ficha.email.length>254)){
     setErro('Verifique o e-mail informado.');return;
   }
   // Alterar situação de ficha existente exige decisão explícita da Coordenação.
   const docenteAnterior=editarId?docentes.find(d=>d.id===editarId):null;
   if(editarId&&!docenteAnterior){setErro('A ficha mudou. Atualize a lista antes de alterar a situação.');return;}
   if(docenteAnterior&&docenteAnterior.situacao!==situacaoEdicao&&
      !window.confirm('Confirmar situação acadêmica do docente: '+situacaoEdicao+'? A divulgação do perfil é uma autorização separada.'))return;
   setSalvando(true);setErro('');setAviso('');
   try {
     const {data:{user},error}=await supabase.auth.getUser();
     const papeis=user&&!user.is_anonymous&&!error?await obterPapeisGestao(supabase,user.id):[];
     if(!user||!papeis.includes('coordenacao'))throw new Error('Somente Coordenação pode cadastrar ou editar docentes.');
     const dados={...Object.fromEntries(CAMPOS.map(c=>[c.chave,ficha[c.chave].trim()||null])),
       nome_completo:ficha.nome_completo.trim(),autorizou_divulgacao:ficha.autorizou_divulgacao,
       situacao:editarId?situacaoEdicao:'pendente_validacao'};
     const resultado=editarId
       ?await supabase.from('educart_docentes_dev').update(dados).eq('id',editarId).select('id').maybeSingle()
       :await supabase.from('educart_docentes_dev').insert({...dados,criado_por:user.id,situacao:'pendente_validacao'}).select('id').maybeSingle();
     if(resultado.error||!resultado.data)throw new Error('Operação não confirmada pelo banco DEV. Verifique permissão e dados.');
     setFormAberto(false);setEditarId(null);setFicha(VAZIA);
     await carregar();setAviso('Cadastro docente salvo no Supabase '+(ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD')+'. Nenhuma conta foi criada e nenhuma informação foi divulgada.');
   } catch(x){setErro(x instanceof Error?x.message:'Erro ao gravar docente.');}
   finally{setSalvando(false);}
 };
 return <section className="admin-academico-panel admin-docentes" aria-label="Docentes da EducART">
  <div className="admin-academico-section-head">
    <div><h2>Docentes <AdminAjuda titulo="Docentes" descricao="Cadastre professores antes de criar turmas." passos="Registre o perfil profissional; no cadastro da turma selecione um docente ativo." cuidado="Dados privados. O consentimento de divulgação não publica automaticamente nenhum perfil." /></h2>
    <p>Professores e responsáveis pedagógicos vinculados a turmas existentes. Não é um sistema de login docente.</p></div>
    {podeGerir&&<div style={{display:'flex',gap:9,flexWrap:'wrap'}}>
      <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>void copiarPerguntas()}>Copiar ficha para WhatsApp</button>
      <button className="admin-btn admin-btn-primary" type="button" onClick={abrirNovo}>+ Cadastrar docente</button>
    </div>}
  </div>
  <AdminPropostasDocentesDev supabase={supabase} podeGerir={podeGerir}/>
  {!podeGerir&&<p role="note">Cadastros profissionais são privados e exigem Coordenação autorizada.</p>}
  {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
  {aviso&&<p role="status" className="admin-academico-message">{aviso}</p>}
  {carregando?<p role="status">Consultando cadastro docente {ACOES_ACADEMICAS_EXCLUSIVAS_DEV?'DEV':'PROD'}...</p>:<>
    <label className="admin-academico-label" htmlFor="docentes-busca">Localizar professor</label>
    <input id="docentes-busca" className="search-input admin-academico-input" type="search" placeholder="Nome ou área de atuação" value={busca} onChange={e=>setBusca(e.target.value)}/>
    <div className="admin-academico-fichas">
      {encontrados.map(d=>{
        const nomeArtistico=d.nome_artistico?.trim();
        const exibirNomeArtistico=nomeArtistico&&nomeArtistico.toLocaleLowerCase('pt-BR')!==d.nome_completo.trim().toLocaleLowerCase('pt-BR');
        const turmasVinculadas=turmas.filter(t=>t.docente_id===d.id).length;
        const situacaoLegivel=d.situacao==='ativo'?'Ativo':d.situacao==='pendente_validacao'?'Pendente de validação':'Inativo';
        return <article className="admin-academico-ficha admin-docentes-card" key={d.id}>
          <div className="admin-docentes-card-main">
            <div className="admin-docentes-card-header">
              <div>
                <h3 className="admin-docentes-card-name">{d.nome_completo}</h3>
                {exibirNomeArtistico&&<span className="admin-docentes-card-artistic">Nome artístico: {nomeArtistico}</span>}
              </div>
              <span className={'admin-docentes-status '+(d.situacao==='ativo'?'is-active':d.situacao==='pendente_validacao'?'is-pending':'is-inactive')}>{situacaoLegivel}</span>
            </div>
            <p className="admin-docentes-card-areas">{d.areas_atuacao||'Área de atuação não informada'}</p>
            <p className="admin-docentes-card-cohorts">
              {turmasVinculadas?turmasVinculadas+' '+(turmasVinculadas===1?'turma vinculada':'turmas vinculadas')+' no cadastro DEV':'Nenhuma turma vinculada no cadastro DEV'}
            </p>
          </div>
          <div className="admin-registro-action-row admin-docentes-card-actions">
            <button className="admin-btn admin-btn-secondary" type="button" aria-label={'Ver detalhes de '+d.nome_completo} onClick={()=>visualizar(d)}>👁 Ver perfil</button>
            <button className="admin-btn admin-btn-secondary" type="button" disabled={!podeGerir} onClick={()=>editar(d)}>Editar ficha</button>
          </div>
        </article>;
      })}
      {!encontrados.length&&<p>{docentes.length?'Nenhum resultado para essa busca.':'Nenhum docente cadastrado. Cadastre um antes de criar uma turma.'}</p>}
    </div>
  </>}
  {formAberto&&podeGerir&&<AdminRegistroModalDev titulo={editarId?'Editar ficha docente':'Cadastrar docente'}
   descricao="Formulário privado de Coordenação; alterações só são salvas ao confirmar."
   onClose={()=>{if(!salvando){setFormAberto(false);setEditarId(null);}}} amplo>
   <form className="admin-academico-panel" onSubmit={e=>void gravar(e)}>
    <h3>{editarId?'Editar docente':'Cadastrar docente'}</h3>
    <div style={{display:'grid',gap:12}}>
      {CAMPOS.map(c=><div key={c.chave}>
        <label className="admin-academico-label" htmlFor={'docente-'+c.chave}>{c.rotulo}{c.chave==='nome_completo'?' *':''}</label>
        {c.grande?<textarea id={'docente-'+c.chave} className="admin-academico-textarea" rows={2}
          maxLength={c.chave==='minibiografia'?4000:1000} value={ficha[c.chave]}
          onChange={e=>setFicha(p=>({...p,[c.chave]:e.target.value}))}/>:
          <input id={'docente-'+c.chave} className="search-input admin-academico-input"
            type={c.chave==='email'?'email':c.chave==='whatsapp'?'tel':'text'}
            maxLength={c.chave==='email'?254:c.chave==='whatsapp'?30:150}
            required={c.chave==='nome_completo'} value={ficha[c.chave]}
            onChange={e=>setFicha(p=>({...p,[c.chave]:e.target.value}))}/>}
      </div>)}
      {editarId&&<div>
        <label className="admin-academico-label" htmlFor="docente-situacao">Situação do docente · autorização da Coordenação</label>
        <select id="docente-situacao" className="filter-select" value={situacaoEdicao}
          disabled={salvando} onChange={e=>setSituacaoEdicao(e.target.value as Docente['situacao'])}>
          <option value="pendente_validacao">Pendente de validação</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <p className="admin-academico-note">Ativar permite selecionar este docente em novas turmas. A divulgação pública exige consentimento separado.</p>
      </div>}
      <label className="admin-academico-check"><input type="checkbox" checked={ficha.autorizou_divulgacao}
        onChange={e=>setFicha(p=>({...p,autorizou_divulgacao:e.target.checked}))}/>
        Há autorização explícita para divulgar os dados públicos do perfil. Este formulário não publica nada.</label>
    </div>
    <div className="admin-academico-actions">
      <button type="submit" className="admin-btn admin-btn-primary" disabled={salvando}>{salvando?'Salvando...':'Salvar docente'}</button>
      <button type="button" className="admin-btn admin-btn-secondary" disabled={salvando}
        onClick={()=>{setFormAberto(false);setEditarId(null);}}>Cancelar</button>
    </div>
  </form>
  </AdminRegistroModalDev>}
  {visualizado&&<AdminRegistroModalDev titulo={'Perfil de '+visualizado.nome_completo}
    descricao="Dados institucionais privados e histórico real de turmas. Nada é publicado automaticamente."
    onClose={()=>setVisualizarId(null)} amplo>
    <dl className="admin-registro-profile-data">
      <div><dt>Nome</dt><dd>{visualizado.nome_completo}</dd></div>
      <div><dt>Nome artístico</dt><dd>{visualizado.nome_artistico||'Não informado'}</dd></div>
      <div><dt>Áreas de atuação</dt><dd>{visualizado.areas_atuacao||'Não informado'}</dd></div>
      <div><dt>Formação profissional</dt><dd>{visualizado.formacao_profissional||'Não informado'}</dd></div>
      <div><dt>Experiência profissional</dt><dd>{visualizado.experiencia_profissional||'Não informado'}</dd></div>
      <div><dt>Disponibilidade (privada)</dt><dd>{visualizado.disponibilidade||'Não informada'}</dd></div>
      <div><dt>Contato interno</dt><dd>{visualizado.email||visualizado.whatsapp||'Não informado'}</dd></div>
      <div><dt>Autorização de divulgação</dt><dd>{visualizado.autorizou_divulgacao?'Registrada':'Não registrada'}</dd></div>
    </dl>
    <h3>Turmas atuais ou planejadas ({atuais.length})</h3>
    <ul className="admin-registro-cohort-list">
      {atuais.map(t=><li key={t.id}><strong>{nomeTurma(t)}</strong><small>{t.situacao} · {t.inicio_em||'Início a definir'} até {t.termina_em||'Sem data final'}</small></li>)}
      {!atuais.length&&<li>Nenhuma turma atual ou planejada vinculada.</li>}
    </ul>
    <h3>Últimas participações / histórico ({anteriores.length})</h3>
    <ul className="admin-registro-cohort-list">
      {anteriores.map(t=><li key={t.id}><strong>{nomeTurma(t)}</strong><small>{t.situacao} · {t.inicio_em||'Início não registrado'} até {t.termina_em||'Sem data final'}</small></li>)}
      {!anteriores.length&&<li>Nenhuma participação anterior registrada nesta base.</li>}
    </ul>
    <h3>Prévia do perfil compartilhável</h3>
    <p className="admin-academico-note">Somente os campos abaixo podem aparecer no link. Contatos, disponibilidade e histórico de turmas não são compartilhados.</p>
    <PerfilPublicoDocente nome={visualizado.nome_artistico||visualizado.nome_completo}
      areas={visualizado.areas_atuacao} formacao={visualizado.formacao_profissional}
      apresentacao={visualizado.apresentacao_publica}/>
    {erroPerfil&&<p className="admin-academico-message" role="alert">{erroPerfil}</p>}
    {avisoPerfil&&<p className="admin-academico-message" role="status">{avisoPerfil}</p>}
    <div className="admin-registro-action-row" style={{marginTop:18}}>
      {podeGerir&&<button className="admin-btn admin-btn-secondary" type="button"
        onClick={()=>editar(visualizado)}>Editar ficha</button>}
      {podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<button className="admin-btn admin-btn-primary" type="button"
        disabled={!!gerandoId||!visualizado.autorizou_divulgacao||!visualizado.apresentacao_publica?.trim()}
        onClick={()=>void compartilhar(visualizado)}>
        {gerandoId===visualizado.id?'Preparando link...':'Copiar link do perfil'}
      </button>}
      {podeGerir&&ACOES_ACADEMICAS_EXCLUSIVAS_DEV&&<button className="admin-btn admin-btn-secondary" type="button"
        disabled={!!gerandoId} onClick={()=>void revogar(visualizado)}>Desativar link</button>}
    </div>
    {!ACOES_ACADEMICAS_EXCLUSIVAS_DEV?<p className="admin-academico-note">Links públicos de docentes aguardam homologação na 1.1. Os perfis privados permanecem disponíveis.</p>:!visualizado.autorizou_divulgacao&&<p className="admin-academico-note">Compartilhamento bloqueado: registre primeiro a autorização explícita no cadastro.</p>}
  </AdminRegistroModalDev>}
 </section>;
}
