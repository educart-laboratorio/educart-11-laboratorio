'use client';
/** R35: entrada pública da proposta docente, sem acesso ao painel ou gravação em formações. */
import {useEffect, useState, type FormEvent} from 'react';
import Link from 'next/link';
import {createClient} from '@supabase/supabase-js';
import {EducartLogo} from '@/components/EducartLogo';
import {PROPOSTAS_DOCENTES_HABILITADAS} from '@/lib/supabase/client';
import './criar.css';

type Campo = {id:string;nome:string;tipo?:'text'|'date'|'number'|'email'|'tel'|'textarea'|'select'|'boolean';opcoes?:string[];obrigatorio?:boolean;limite?:number};
const ETAPAS=['Solução','Conteúdo','Oferta','Professor','Turma','Revisão'] as const;
const BUCKET_FOTOS='educart-fotos-propostas-docentes-dev';
const LIMITE_FOTO=8*1024*1024;
const TIPOS_FOTO:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
const CAMPOS:Campo[][]=[
 [
  {id:'nome',nome:'Nome oficial da solução',obrigatorio:true,limite:120},
  {id:'tipo',nome:'Tipo de solução',tipo:'select',opcoes:['curso','oficina','aula','solucao']},
  {id:'chamada_curta',nome:'Chamada curta para o catálogo',limite:180},
  {id:'descricao',nome:'Qual é a proposta desta solução?',tipo:'textarea'},
  {id:'objetivos',nome:'Quais objetivos e resultados ela oferece?',tipo:'textarea'},
  {id:'formato',nome:'Formato de realização',tipo:'select',opcoes:['presencial','online','hibrido']},
  {id:'publico_alvo',nome:'Para quem ela foi criada?'},
  {id:'idade_minima',nome:'Idade mínima desta solução',tipo:'number'},
  {id:'exige_experiencia',nome:'Exige experiência anterior',tipo:'boolean'},
  {id:'duracao_meses',nome:'Duração prevista (meses)',tipo:'number'},
  {id:'carga_horaria_horas',nome:'Carga horária total prevista',tipo:'number'},
 ],
 [
  {id:'ementa',nome:'Quais conteúdos serão ensinados?',tipo:'textarea'},
  {id:'modulos_planejados',nome:'Como o programa se divide em módulos?',tipo:'textarea'},
  {id:'avaliacao',nome:'Haverá avaliação ou atividade final?',tipo:'textarea'},
  {id:'disciplinas',nome:'Quais disciplinas ou áreas compõem o curso?',tipo:'textarea'},
  {id:'metodologia',nome:'Como será a metodologia de ensino?',tipo:'textarea'},
  {id:'competencias',nome:'Quais habilidades e competências serão desenvolvidas?',tipo:'textarea'},
  {id:'atividades_praticas',nome:'Quais atividades práticas ou apresentações haverá?',tipo:'textarea'},
  {id:'criterios_conclusao',nome:'Quais serão os critérios de conclusão?',tipo:'textarea'},
  {id:'certificacao',nome:'Qual certificado é oferecido e por quem?',tipo:'textarea'},
  {id:'projeto_final',nome:'Haverá espetáculo, mostra ou projeto final?',tipo:'textarea'},
 ],
 [
  {id:'valor_matricula_reais',nome:'Preço de matrícula sugerido (R$)'},
  {id:'valor_mensalidade_reais',nome:'Mensalidade sugerida (R$)'},
  {id:'quantidade_mensalidades_referencia',nome:'Quantidade prevista de mensalidades',tipo:'number'},
  {id:'materiais_inclusos',nome:'Quais materiais ou benefícios estão incluídos?',tipo:'textarea'},
  {id:'perguntas_frequentes',nome:'Perguntas frequentes e respostas',tipo:'textarea'},
 ],
 [
  {id:'nome_professor',nome:'Seu nome completo',obrigatorio:true,limite:150},
  {id:'email_professor',nome:'Seu e-mail',tipo:'email',limite:254},
  {id:'whatsapp_professor',nome:'Seu WhatsApp',tipo:'tel',limite:30},
 ],
 [
  {id:'codigo',nome:'Código sugerido da turma',limite:40},
  {id:'inicio_em',nome:'Início das aulas',tipo:'date'},
  {id:'termina_em',nome:'Previsão de encerramento',tipo:'date'},
  {id:'local_nome',nome:'Local das aulas',limite:150},
  {id:'local_endereco',nome:'Endereço ou referência do local',limite:500},
  {id:'capacidade',nome:'Capacidade de vagas',tipo:'number'},
  {id:'inscricoes_abrem_em',nome:'Abertura prevista das inscrições',tipo:'date'},
  {id:'inscricoes_encerram_em',nome:'Encerramento previsto das inscrições',tipo:'date'},
 ],
];
const DIAS=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
type Horario={dia:string;inicio:string;fim:string};
const novoHorario=():Horario=>({dia:'',inicio:'',fim:''});
const nomesSelecionados:Record<string,string>={curso:'Curso',oficina:'Oficina',aula:'Aula',solucao:'Solução',presencial:'Presencial',online:'Online',hibrido:'Híbrido'};
function CampoFormulario({campo,valor,mudar}: {campo:Campo;valor:string;mudar:(valor:string)=>void}){
 const id='educart-criar-'+campo.id;
 return <div className="criar-campo">
  <label htmlFor={id}>{campo.nome}{campo.obrigatorio?' *':''}</label>
  {campo.tipo==='textarea'?
   <textarea id={id} maxLength={4000} rows={3} value={valor} onChange={e=>mudar(e.target.value)}/>:
   campo.tipo==='select'?
   <select id={id} value={valor} onChange={e=>mudar(e.target.value)}>
    {campo.opcoes?.map(o=><option key={o} value={o}>{nomesSelecionados[o]||o}</option>)}
   </select>:
   campo.tipo==='boolean'?
   <select id={id} value={valor} onChange={e=>mudar(e.target.value)}>
    <option value="false">Não</option><option value="true">Sim</option>
   </select>:
   <input id={id} type={campo.tipo||'text'} maxLength={campo.limite||250} value={valor}
    required={campo.obrigatorio} min={campo.tipo==='number'?0:undefined}
    onChange={e=>mudar(e.target.value)}/>
  }
 </div>;
}
export function FormularioPropostaDocente(){
 const [etapa,setEtapa]=useState(0);
 const [valores,setValores]=useState<Record<string,string>>({tipo:'curso',formato:'presencial',exige_experiencia:'false'});
 const [horarios,setHorarios]=useState<Horario[]>([novoHorario()]);
 const [foto,setFoto]=useState<File|null>(null);
 const [fotoDimensoes,setFotoDimensoes]=useState('');
 const [fotoPreview,setFotoPreview]=useState('');
 const [consentimento,setConsentimento]=useState(false);
 const [honeypot,setHoneypot]=useState('');
 const [gravando,setGravando]=useState(false);
 const [concluido,setConcluido]=useState(false);
 const [erro,setErro]=useState('');
 useEffect(()=>{
  if(!foto){setFotoPreview('');return;}
  const url=URL.createObjectURL(foto);setFotoPreview(url);
  return ()=>URL.revokeObjectURL(url);
 },[foto]);
 const selecionarFoto=async(file:File|null)=>{
  if(!file){setFoto(null);setFotoDimensoes('');setErro('');return;}
  if(!TIPOS_FOTO[file.type]||file.size>LIMITE_FOTO||file.size===0){
   setFoto(null);setFotoDimensoes('');setErro('Selecione JPG, PNG ou WebP de até 8 MB.');return;
  }
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();img.src=url;await img.decode();
   const w=img.naturalWidth,h=img.naturalHeight;
   if(Math.min(w,h)<1000||w*h<1500000){
    setFoto(null);setFotoDimensoes('');
    setErro('A foto precisa ter pelo menos 1,5 megapixel e 1.000 pixels no lado menor.');return;
   }
   setFoto(file);setFotoDimensoes(w+' × '+h+' px');setErro('');
  }catch{
   setFoto(null);setFotoDimensoes('');setErro('Não foi possível ler a imagem. Tente outro arquivo JPG, PNG ou WebP.');
  }finally{URL.revokeObjectURL(url);}
 };
 const mudar=(id:string,value:string)=>{setValores(a=>({...a,[id]:value}));setErro('');};
 const mudarHorario=(n:number,campo:keyof Horario,v:string)=>setHorarios(a=>a.map((h,i)=>i===n?{...h,[campo]:v}:h));
 const validarEtapa=()=>{
  if(etapa===0 && (valores.nome||'').trim().length<3)return 'Informe o nome da solução (mínimo de três caracteres).';
  if(etapa===3 && (valores.nome_professor||'').trim().length<3)return 'Informe seu nome completo.';
  if(etapa===3 && !((valores.email_professor||'').trim()||(valores.whatsapp_professor||'').trim()))
   return 'Informe um e-mail ou WhatsApp para contato.';
  if(etapa===3 && valores.email_professor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email_professor.trim()))
   return 'Confira o endereço de e-mail.';
  if(etapa===4 && horarios.some(h=>(h.dia||h.inicio||h.fim)&&!(h.dia&&h.inicio&&h.fim&&h.inicio<h.fim)))
   return 'Complete ou remova os horários parcialmente preenchidos.';
  return '';
 };
 const continuar=()=>{
  const falha=validarEtapa();if(falha){setErro(falha);return;}
  setErro('');setEtapa(e=>Math.min(5,e+1));window.scrollTo({top:0,behavior:'smooth'});
 };
 const enviar=async(e:FormEvent<HTMLFormElement>)=>{
  e.preventDefault();
  if(gravando||concluido)return;
  if(!PROPOSTAS_DOCENTES_HABILITADAS){setErro('O recebimento de propostas ainda não está homologado neste ambiente.');return;}
  if(honeypot){setErro('Não foi possível enviar o formulário.');return;}
  if(!consentimento){setErro('Confirme a autorização de contato sobre a sua proposta.');return;}
  const nome=(valores.nome_professor||'').trim(),email=(valores.email_professor||'').trim();
  const whatsapp=(valores.whatsapp_professor||'').trim();
  if(nome.length<3||!(email||whatsapp)||(valores.nome||'').trim().length<3){setErro('Revise os campos obrigatórios da solução e do professor.');return;}
  if(horarios.some(h=>(h.dia||h.inicio||h.fim)&&!(h.dia&&h.inicio&&h.fim&&h.inicio<h.fim))){setErro('Revise os horários informados.');return;}
  setGravando(true);setErro('');
  try{
   const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
   });
   const proposta=Object.fromEntries(Object.entries(valores).filter(([id])=>!id.endsWith('_professor')));
   proposta.nome=(valores.nome||'').trim();
   if(foto){
    const ext=TIPOS_FOTO[foto.type];
    const path='propostas/'+crypto.randomUUID()+'/foto.'+ext;
    const {error:uploadError}=await supabase.storage.from(BUCKET_FOTOS)
     .upload(path,foto,{cacheControl:'3600',contentType:foto.type,upsert:false});
    if(uploadError)throw Error('Não foi possível anexar a foto. Verifique sua conexão e tente novamente.');
    proposta.foto_professor_storage_path=path;
    proposta.foto_professor_dimensoes=fotoDimensoes;
   }
   const {error}=await supabase.from('educart_propostas_solucoes_docentes_dev').insert({
    nome_professor:nome,email:email||null,whatsapp:whatsapp||null,
    proposta:{...proposta,horarios_semanais:horarios.filter(h=>h.dia&&h.inicio&&h.fim),
     origem:'educart_formulario_docente_r35'}
   });
   if(error)throw Error('Não foi possível receber a proposta. Tente novamente mais tarde.');
   setConcluido(true);
  }catch(x){setErro(x instanceof Error?x.message:'Erro ao enviar formulário.');}
  finally{setGravando(false);}
 };
 if(!PROPOSTAS_DOCENTES_HABILITADAS)return <section className="criar-resultado" role="status">
   <h2>Envio de propostas temporariamente indisponível.</h2>
   <p>A EducART está preparando a recepção oficial de propostas docentes. Não solicite o envio de dados pessoais por esta prévia.</p>
   <Link href="/" className="eg-button">Voltar ao portal</Link>
  </section>;
 if(concluido)return <section className="criar-resultado" role="status">
   <h2>Proposta recebida!</h2>
   <p>A EducART recebeu sua proposta para análise da Coordenação. Isso não significa publicação, contratação ou abertura de turma.</p>
   <Link href="/" className="eg-button">Conhecer a EducART</Link>
  </section>;
 return <form className="criar-formulario" onSubmit={enviar} noValidate>
  <p className="criar-etapa">Etapa {etapa+1} de 6 · {ETAPAS[etapa]}</p>
  <nav aria-label="Etapas do formulário" className="criar-etapas">
   {ETAPAS.map((n,i)=><span key={n} aria-current={etapa===i?'step':undefined}
    className={etapa===i?'criar-etapa-ativa':''}>{n}</span>)}
  </nav>
  {etapa!==5?<div className="criar-campos">
   {CAMPOS[etapa].map(c=><CampoFormulario key={c.id} campo={c} valor={valores[c.id]||''}
    mudar={v=>mudar(c.id,v)}/>)}
   {etapa===3&&<>
    <div className="criar-campo criar-campo-foto">
     <label htmlFor="educart-criar-foto">Foto recente do(a) professor(a) em alta resolução</label>
     <p className="criar-nota">Envie uma foto sua, preferencialmente dos últimos 12 meses, com boa iluminação e rosto visível. Aceitamos JPG, PNG ou WebP de até 8 MB; mínimo de 1,5 megapixel e 1.000 pixels no lado menor. A foto só será vista pela Coordenação.</p>
     <input id="educart-criar-foto" type="file" accept="image/jpeg,image/png,image/webp"
      onChange={e=>void selecionarFoto(e.currentTarget.files?.[0]||null)} />
     {fotoPreview&&<div className="criar-foto-preview">
      <img src={fotoPreview} alt="Prévia da fotografia selecionada, ainda não enviada" width="160" height="180" />
      <p><strong>{foto?.name}</strong> · {fotoDimensoes} · {foto?(foto.size/(1024*1024)).toFixed(1)+' MB':''}</p>
      <button type="button" className="criar-secundario" onClick={()=>{setFoto(null);setFotoDimensoes('');}}>Remover foto</button>
     </div>}
    </div>
    <p className="criar-nota">Se você ainda não tem cadastro docente, a Coordenação poderá conferir seus dados. Este link não cria acesso ao painel.</p>
   </>}
   {etapa===4&&<div className="criar-horarios">
    <h3>Horários semanais sugeridos</h3>
    {horarios.map((h,i)=><fieldset key={i}>
     <legend>Encontro {i+1}</legend>
     <div className="criar-horarios-linha">
      <label>Dia
       <select value={h.dia} onChange={e=>mudarHorario(i,'dia',e.target.value)}>
        <option value="">A definir</option>{DIAS.map((d,j)=><option key={d} value={String(j)}>{d}</option>)}
       </select>
      </label>
      <label>Das <input type="time" value={h.inicio} onChange={e=>mudarHorario(i,'inicio',e.target.value)}/></label>
      <label>Até <input type="time" value={h.fim} onChange={e=>mudarHorario(i,'fim',e.target.value)}/></label>
     </div>
     {horarios.length>1&&<button type="button" className="criar-secundario"
      onClick={()=>setHorarios(a=>a.filter((_,j)=>j!==i))}>Remover encontro</button>}
    </fieldset>)}
    <button type="button" className="criar-secundario" disabled={horarios.length>=7}
     onClick={()=>setHorarios(a=>[...a,novoHorario()])}>+ Adicionar dia</button>
   </div>}
  </div>:<div className="criar-revisao">
   <h2>Revise sua proposta</h2>
   <p><strong>Solução:</strong> {valores.nome} · {nomesSelecionados[valores.tipo||'curso']}</p>
   <p><strong>Professor:</strong> {valores.nome_professor}</p>
   <p><strong>Contato:</strong> {valores.email_professor||valores.whatsapp_professor}</p>
   <p><strong>Foto recente:</strong> {foto?foto.name+' · '+fotoDimensoes:'Não anexada'}</p>
   <p><strong>Turma:</strong> {valores.codigo||'A definir'} · {valores.local_nome||'Local a definir'}</p>
   <p>A proposta será recebida como <strong>pendente de análise</strong>. Nenhuma turma será criada e nada será publicado automaticamente.</p>
   <label className="criar-consentimento"><input type="checkbox" checked={consentimento}
    onChange={e=>setConsentimento(e.target.checked)}/>
    Autorizo o uso destes dados pela EducART para analisar minha proposta e entrar em contato.</label>
   <div aria-hidden="true" className="criar-armadilha">
    <label>Deixe este campo em branco <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={e=>setHoneypot(e.target.value)}/></label>
   </div>
  </div>}
  {erro&&<p role="alert" className="criar-erro">{erro}</p>}
  <div className="criar-acoes">
   {etapa>0&&<button type="button" className="criar-secundario" disabled={gravando}
    onClick={()=>{setErro('');setEtapa(s=>s-1);}}>← Voltar</button>}
   {etapa<5?<button type="button" className="eg-button" onClick={continuar}>Continuar →</button>:
    <button type="submit" className="eg-button" disabled={gravando}>{gravando?'Enviando...':'Enviar proposta à EducART'}</button>}
  </div>
 </form>;
}
