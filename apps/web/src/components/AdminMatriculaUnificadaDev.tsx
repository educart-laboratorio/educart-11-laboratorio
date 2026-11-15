'use client';
import { AdminAjuda } from '@/components/AdminAjuda';

/**
 * EducART 1.2 | LAB DEV — matrícula diretamente da ficha oficial.
 *
 * Inscrição -> Pix com comprovante + conferência humana OU bolsa autorizada
 * -> turma -> matrícula ativa -> convite Minha EducART + outbox.
 *
 * Não opera em PROD. O backend é a autoridade final (RLS/RPC).
 */
import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';
import { linkCobrancaMensalidadeEducart } from '@/lib/mensagens-whatsapp';

const BUCKET = 'educart-comprovantes-pix-dev';
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS: Record<string,string> = {
  'application/pdf': 'pdf', 'image/jpeg': 'jpg',
  'image/png': 'png', 'image/webp': 'webp',
};
type Inscricao = {
  id:string; nome_completo:string; email:string;
  telefone_whatsapp:string; status:string;
};
type Turma = {id:string;codigo:string;formacao_id:string;situacao:string;capacidade:number|null};
type Pessoa = {id:string;nome_completo:string;email:string|null;telefone:string|null;data_nascimento:string|null};
type Matricula = {id:string;pessoa_id:string;turma_id:string;situacao:string};
type Convite = {id:string;matricula_id:string;situacao:string;expira_em:string};
type Modalidade = 'pix'|'bolsa';
type Props = {
  supabase:SupabaseClient;
  inscricao:Inscricao;
  podeOperar:boolean;
  podeAutorizarBolsa:boolean;
  aoMatricular:(inscricaoId:string)=>void;
   onRascunhoPendenteChange?:(pendente:boolean)=>void;
};

const n = (s:string|null|undefined) => (s??'').trim().toLocaleLowerCase('pt-BR');
const digits = (s:string|null|undefined) => (s??'').replace(/\D/g,'');
const REAL = (centavos:number) => (centavos/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const centavos = (s:string) => {
  const x=s.trim().replace(/\./g,'').replace(',','.');
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(x))return null;
  const v=Math.round(Number(x)*100);
  return v>0&&v<=100000000?v:null;
};
const ativacao = (id:string) => {
  if(typeof window==='undefined')return '';
  return window.location.origin+'/minha-educart/ativar?convite='+encodeURIComponent(id);
};
const mensagem = (nome:string,turma:string,url:string) => [
  'Olá, '+(nome.trim().split(/\s+/)[0]||'estudante')+'! 🎭',
  '',
  'Sua matrícula na *'+turma+'* foi confirmada pela EducART.',
  'Você já pode ativar sua *Minha EducART*, o espaço para acompanhar a trajetória acadêmica e os benefícios que a nossa comunidade desenvolverá.',
  '',
  'Ative seu acesso por aqui: '+url,
  '',
  'Use o e-mail informado na inscrição para confirmar sua identidade.',
  'Se não reconhecer esta matrícula, responda a esta mensagem para conversarmos.',
  '',
  'Equipe EducART',
].join('\n');
export function AdminMatriculaUnificadaDev({
  supabase,inscricao,podeOperar,podeAutorizarBolsa,aoMatricular,onRascunhoPendenteChange,
}:Props){
  const [turmas,setTurmas]=useState<Turma[]>([]);
  const [pessoas,setPessoas]=useState<Pessoa[]>([]);
  const [matricula,setMatricula]=useState<Matricula|null>(null);
  const [convite,setConvite]=useState<Convite|null>(null);
  const [turmaId,setTurmaId]=useState('');
  const [pessoaId,setPessoaId]=useState('');
  const [modalidade,setModalidade]=useState<Modalidade>('pix');
  const [arquivo,setArquivo]=useState<File|null>(null);
  const [valor,setValor]=useState('');
  const [identificadorPix,setIdentificadorPix]=useState('');
  const [ocorridoEm,setOcorridoEm]=useState('');
  const [referenciaConferencia,setReferenciaConferencia]=useState('');
  const [referenciaBolsa,setReferenciaBolsa]=useState('');
  const [conferi,setConferi]=useState(false);
  const [carregando,setCarregando]=useState(true);
  const [gravando,setGravando]=useState(false);
  const [rascunhoAlterado,setRascunhoAlterado]=useState(false);
  const [erro,setErro]=useState('');
  const [sucesso,setSucesso]=useState('');
  const [conviteIdNovo,setConviteIdNovo]=useState('');

  const carregar=useCallback(async()=>{
    setCarregando(true);
    const [t,p,m]=await Promise.all([
      supabase.from('turmas').select('id,codigo,formacao_id,situacao,capacidade').order('created_at',{ascending:false}),
      supabase.from('pessoas').select('id,nome_completo,email,telefone,data_nascimento').order('nome_completo'),
      supabase.from('matriculas').select('id,pessoa_id,turma_id,situacao').eq('candidatura_id',inscricao.id).maybeSingle(),
    ]);
    if(t.error||p.error||m.error){
      setErro('Não foi possível carregar turmas ou cadastros do Supabase DEV.');
      setCarregando(false);return;
    }
    setTurmas((t.data??[]) as Turma[]);
    setPessoas((p.data??[]) as Pessoa[]);
    const atual=(m.data??null) as Matricula|null;
    setMatricula(atual);
    if(atual){
      setTurmaId(atual.turma_id);
      const c=await supabase.from('educart_convites_dev')
        .select('id,matricula_id,situacao,expira_em').eq('matricula_id',atual.id).maybeSingle();
      if(c.error)setErro('Não foi possível consultar o convite no DEV.');
      else setConvite((c.data??null) as Convite|null);
    }else setConvite(null);
    setCarregando(false);
  },[supabase,inscricao.id]);
  useEffect(()=>{void carregar();},[carregar]);

  const sugestoes=useMemo(()=>pessoas.filter(p=>
    n(p.email)===n(inscricao.email)||
    (digits(p.telefone)!==''&&digits(p.telefone)===digits(inscricao.telefone_whatsapp))
  ),[pessoas,inscricao.email,inscricao.telefone_whatsapp]);
  const turma=turmas.find(x=>x.id===turmaId);
  const vagas=turmas.filter(t=>['planejada','aberta','em_andamento'].includes(t.situacao));
  const precisaPessoa=!matricula&&sugestoes.length>0;
  const conviteAtual=conviteIdNovo || convite?.id || '';
  const linkConvite=conviteAtual?ativacao(conviteAtual):'';
  const matriculada=matricula?.situacao==='ativa';
  useEffect(()=>{
    onRascunhoPendenteChange?.((rascunhoAlterado&&!matriculada)||gravando);
    return()=>onRascunhoPendenteChange?.(false);
  },[rascunhoAlterado,matriculada,gravando,onRascunhoPendenteChange]);
  const inconsistencia=inscricao.status==='matriculado'&&!matriculada;
  const outraSituacao=Boolean(matricula&&matricula.situacao!=='pendente'&&matricula.situacao!=='ativa');
  const mensagemWhatsapp=turma&&linkConvite?
    mensagem(inscricao.nome_completo,turma.codigo,linkConvite):'';
  const linkWhatsapp=mensagemWhatsapp?linkCobrancaMensalidadeEducart(inscricao.telefone_whatsapp,mensagemWhatsapp):null;

  const escolherArquivo=(event:ChangeEvent<HTMLInputElement>)=>{
    const f=event.target.files?.[0]??null;
    setArquivo(null);setConferi(false);setErro('');
    if(!f)return;
    if(!TIPOS[f.type]||f.size<=0||f.size>MAX_BYTES){
      setErro('Comprovante permitido: PDF, JPG, PNG ou WebP de até 5 MB.');return;
    }
    setArquivo(f);
  };
  const efetivar=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    if(gravando||!podeOperar||!turma||!conferi||matriculada||inconsistencia||outraSituacao||carregando)return;
    setErro('');setSucesso('');
    if(modalidade==='bolsa'&&!podeAutorizarBolsa){
      setErro('Somente a Coordenação pode autorizar uma bolsa.');return;
    }
    if(precisaPessoa&&!pessoaId){
      setErro('Foi encontrado cadastro semelhante. Confira e selecione a pessoa correta.');return;
    }
    const valorPix=modalidade==='pix'?centavos(valor):null;
    if(modalidade==='pix'&&(!arquivo||!valorPix||identificadorPix.trim().length<8||
      referenciaConferencia.trim().length<8||!ocorridoEm)){
      setErro('O Pix exige comprovante, valor, identificador, data e conferência do extrato.');return;
    }
    if(modalidade==='bolsa'&&referenciaBolsa.trim().length<8){
      setErro('Registre a referência da autorização da bolsa pela Coordenação.');return;
    }
    setGravando(true);
    try{
      const {data:{user},error:authError}=await supabase.auth.getUser();
      const papeis=user&&!user.is_anonymous&&!authError?await obterPapeisGestao(supabase,user.id):[];
      if(!papeis.some(p=>p==='secretaria'||p==='coordenacao')||
        (modalidade==='bolsa'&&!papeis.includes('coordenacao'))){
        setErro('Sua autorização de Secretaria/Coordenação não está ativa.');return;
      }
      let comprovantePath:string|null=null;
      if(modalidade==='pix'&&arquivo){
        const ext=TIPOS[arquivo.type];
        comprovantePath='inscricoes/'+inscricao.id+'/'+crypto.randomUUID().replace(/-/g,'').slice(0,25)+'.'+ext;
        const up=await supabase.storage.from(BUCKET).upload(comprovantePath,arquivo,
          {upsert:false,contentType:arquivo.type,cacheControl:'0'});
        if(up.error){
          setErro('Comprovante não foi gravado no armazenamento privado. Nenhuma matrícula criada.');return;
        }
      }
      const {data,error}=await supabase.rpc('educart_efetivar_matricula_unificada_dev',{
        p_candidatura_id:inscricao.id,
        p_turma_id:turma.id,
        p_modalidade:modalidade,
        p_comprovante_path:comprovantePath,
        p_valor_centavos:modalidade==='pix'?valorPix:null,
        p_identificador_pix:modalidade==='pix'?identificadorPix.trim():null,
        p_ocorrido_em:modalidade==='pix'?new Date(ocorridoEm).toISOString():null,
        p_referencia_conferencia:modalidade==='pix'?referenciaConferencia.trim():null,
        p_bolsa_referencia:modalidade==='bolsa'?referenciaBolsa.trim():null,
        p_confirmei_documentacao:true,
        p_pessoa_existente_id:precisaPessoa?pessoaId:null,
      });
      const linha=Array.isArray(data)?data[0]:null;
      if(error||!linha?.matricula_id||!linha?.convite_id){
        setErro('Matrícula recusada pelo banco. Revise identidade, comprovante, conferência, bolsa, vagas e permissões. Nenhum e-mail foi enviado.');
        return;
      }
      setConviteIdNovo(linha.convite_id as string);
      setSucesso('Matrícula confirmada no DEV. Minha EducART habilitada; convite e e-mail preparados, aguardando integração do serviço de envio.');
      await carregar();
      aoMatricular(inscricao.id);
    }catch{
      setErro('Conexão indisponível. Verifique o registro da inscrição antes de tentar novamente.');
    }finally{setGravando(false);}
  };
  return <section className="admin-academico-panel"
    onChangeCapture={e=>{if((e.target as HTMLElement).closest('form'))setRascunhoAlterado(true);}}
    aria-label="Efetivar matrícula a partir desta inscrição">
    <span className="admin-kicker">SECRETARIA · MATRÍCULA DIRETO DA INSCRIÇÃO · DEV</span>
    <h3>Efetivar matrícula e liberar Minha EducART <AdminAjuda titulo={"Efetivar matrícula e liberar Minha EducART"} descricao={"Converte candidatura em matrícula e prepara convite."} passos={"Confira turma e pessoa; confirme Pix real ou bolsa autorizada."} cuidado={"O convite não é enviado automaticamente."} /></h3>
    <p>Uma operação: comprovar Pix ou autorizar bolsa, escolher turma e confirmar matrícula. O banco gera o convite individual e registra o e-mail de boas-vindas na fila, ainda sem serviço de disparo.</p>
    {erro&&<p className="admin-academico-message" role="alert">{erro}</p>}
    {sucesso&&<p className="admin-academico-message" role="status">{sucesso}</p>}
    {(inconsistencia||outraSituacao)&&<p className="admin-academico-message" role="alert">
      A inscrição e a matrícula existente apresentam uma situação que exige revisão da Coordenação.
      Nenhuma nova matrícula será criada até a conciliação dos registros.
    </p>}
    {carregando?<p>Consultando situação de ingresso...</p>:matriculada?
      <div className="admin-academico-panel">
        <p><strong>Matrícula efetivada</strong> {turma?.codigo?'· '+turma.codigo:''}</p>
        {linkConvite?<div className="admin-academico-actions">
          {linkWhatsapp&&<a className="admin-btn admin-btn-success" href={linkWhatsapp} target="_blank" rel="noopener noreferrer">Enviar acesso pelo WhatsApp</a>}
          <button className="admin-btn admin-btn-secondary" type="button" onClick={()=>void navigator.clipboard.writeText(linkConvite)}>Copiar link Minha EducART</button>
          <a className="admin-btn admin-btn-secondary" href={linkConvite} target="_blank" rel="noopener noreferrer">Ver convite</a>
        </div>:<p>Convite ainda não registrado para esta matrícula. A equipe deve conferir o histórico; não criar uma segunda matrícula.</p>}
        {convite?.expira_em&&<p className="admin-academico-note">Convite até {new Date(convite.expira_em).toLocaleDateString('pt-BR')}. O acesso requer e-mail confirmado da mesma pessoa.</p>}
      </div>:
      <form className="admin-academico-panel" onSubmit={efetivar}>
        <label className="admin-academico-label" htmlFor="unificada-turma">Turma de destino</label>
        <select className="filter-select" id="unificada-turma" value={turmaId}
          onChange={e=>{setTurmaId(e.target.value);setConferi(false)}}
          disabled={!podeOperar||gravando||Boolean(matricula)} required>
          <option value="">Selecione uma turma com vagas</option>
          {vagas.map(t=><option key={t.id} value={t.id}>{t.codigo} · {t.situacao}</option>)}
        </select>
        {matricula&&<p className="admin-academico-note">Esta inscrição já possui uma pré-matrícula pendente. A turma existente foi mantida para evitar duplicidade.</p>}
        {precisaPessoa&&<>
          <label className="admin-academico-label" htmlFor="unificada-pessoa">Pessoa existente identificada — confira antes de continuar</label>
          <select className="filter-select" id="unificada-pessoa" value={pessoaId}
            onChange={e=>setPessoaId(e.target.value)} disabled={!podeOperar||gravando} required>
            <option value="">Selecione a pessoa correta</option>
            {sugestoes.map(p=><option key={p.id} value={p.id}>{p.nome_completo} · {p.email??p.telefone}</option>)}
          </select>
        </>}
        <fieldset style={{border:0,padding:0,margin:0}}>
          <legend className="admin-academico-label">Condição de ingresso</legend>
          <label className="admin-academico-check"><input type="radio" name="unificada-condicao" checked={modalidade==='pix'}
            onChange={()=>{setModalidade('pix');setConferi(false)}} disabled={!podeOperar||gravando}/> Pagamento Pix</label>
          <label className="admin-academico-check"><input type="radio" name="unificada-condicao" checked={modalidade==='bolsa'}
            onChange={()=>{setModalidade('bolsa');setConferi(false)}} disabled={!podeOperar||gravando||!podeAutorizarBolsa}/> Bolsa autorizada pela Coordenação</label>
        </fieldset>
        {modalidade==='pix'?<>
          <label className="admin-academico-label" htmlFor="unificada-comprovante">Comprovante Pix privado (PDF ou imagem, até 5 MB)</label>
          <input id="unificada-comprovante" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={escolherArquivo} required disabled={!podeOperar||gravando}/>
          <label className="admin-academico-label" htmlFor="unificada-valor">Valor efetivamente recebido (R$)</label>
          <input className="search-input admin-academico-input" id="unificada-valor" inputMode="decimal"
            value={valor} onChange={e=>{setValor(e.target.value);setConferi(false)}} placeholder="50,00" required disabled={!podeOperar||gravando}/>
          <label className="admin-academico-label" htmlFor="unificada-identificador">Identificador Pix da transação</label>
          <input className="search-input admin-academico-input" id="unificada-identificador" value={identificadorPix}
            onChange={e=>{setIdentificadorPix(e.target.value);setConferi(false)}} minLength={8} maxLength={100}
            required disabled={!podeOperar||gravando}/>
          <label className="admin-academico-label" htmlFor="unificada-ocorrido">Data e hora do Pix</label>
          <input className="search-input admin-academico-input" id="unificada-ocorrido" type="datetime-local"
            value={ocorridoEm} onChange={e=>{setOcorridoEm(e.target.value);setConferi(false)}} required disabled={!podeOperar||gravando}/>
          <label className="admin-academico-label" htmlFor="unificada-conferencia">Referência de conferência no extrato (8–200 caracteres)</label>
          <input className="search-input admin-academico-input" id="unificada-conferencia" value={referenciaConferencia}
            onChange={e=>{setReferenciaConferencia(e.target.value);setConferi(false)}} required minLength={8} maxLength={200} disabled={!podeOperar||gravando}/>
        </>:<>
          <label className="admin-academico-label" htmlFor="unificada-bolsa">Autorização da bolsa (referência interna, sem dados sensíveis)</label>
          <input className="search-input admin-academico-input" id="unificada-bolsa" value={referenciaBolsa}
            onChange={e=>{setReferenciaBolsa(e.target.value);setConferi(false)}} minLength={8} maxLength={200}
            required disabled={!podeAutorizarBolsa||gravando}/>
        </>}
        <label className="admin-academico-check"><input type="checkbox" checked={conferi}
          onChange={e=>setConferi(e.target.checked)} disabled={!podeOperar||gravando}/>
          <span>{modalidade==='pix'?
            'Conferi o comprovante e a entrada real no extrato. Confirmo que esta pessoa ingressará na turma selecionada.':
            'Sou Coordenação autorizada; confirmei a concessão formal da bolsa e a turma selecionada.'}</span>
        </label>
        <button className="admin-btn admin-btn-primary" type="submit" disabled={!podeOperar||gravando||!conferi||!turma||inconsistencia||outraSituacao||modalidade==='bolsa'&&!podeAutorizarBolsa}>
          {gravando?'Validando com o banco...':'Confirmar ingresso e liberar Minha EducART'}
        </button>
        <p className="admin-academico-note">Os documentos permanecem privados. A matrícula e os registros de convite são criados numa transação única; nenhuma senha ou e-mail é enviado do navegador.</p>
      </form>}
  </section>;
}
