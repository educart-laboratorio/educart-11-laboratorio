'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AdminAjuda } from '@/components/AdminAjuda';
import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';
import { resumoAcordoR11 } from '@/lib/financeiro/resumo-acordo-r11';
export type PlanoR11={matricula_id:string;competencia_inicial:string;dia_vencimento:number;valor_parcela_centavos:number;situacao:'rascunho'|'ativo';referencia_acordo:string};
export type ParcelaR11={id:string;matricula_id:string;numero:number;competencia:string;vencimento_em:string;valor_centavos:number;situacao:'pendente'|'paga';confirmado_em:string|null};
export type ClienteR11={id:string;nome:string;turma:string;situacao:string;plano:PlanoR11|null;parcelas:ParcelaR11[]};
type Props={supabase:SupabaseClient;podeGerir:boolean;clientes:ClienteR11[];modo:'plano'|'pagamento';inicial?:string;parcelaInicial?:string;aoAtualizar:()=>Promise<void>;onRascunhoPendenteChange?:(pendente:boolean)=>void};
const reais=(n:number)=>(n/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const parseCentavos=(s:string)=>{const v=s.trim();if(!/^\d{1,7}(?:[.,]\d{1,2})?$/.test(v))return null;const [i,d='']=v.replace(',','.').split('.');const n=Number(i)*100+Number(d.padEnd(2,'0'));return n>0&&n<=100000000?n:null};
export function AdminFinanceiroEdicaoR11Dev({supabase,podeGerir,clientes,modo,inicial='',parcelaInicial='',aoAtualizar,onRascunhoPendenteChange}:Props){
 const [clienteId,setClienteId]=useState(inicial);
 const [parcelaId,setParcelaId]=useState(parcelaInicial);
 const [inicio,setInicio]=useState('');
 const [dia,setDia]=useState('10');
 const [valor,setValor]=useState('');
 const [acordo,setAcordo]=useState('');
 const [numeros,setNumeros]=useState<number[]>([]);
 const [fonte,setFonte]=useState('');
 const [confirmo,setConfirmo]=useState(false);
 const [meio,setMeio]=useState<'dinheiro'|'debito'|'credito'|'pix'>('pix');
 const [pagador,setPagador]=useState('');
 const [recebedor,setRecebedor]=useState('');
 const [outro,setOutro]=useState('');
 const [data,setData]=useState('');
 const [referencia,setReferencia]=useState('');
 const [gravando,setGravando]=useState(false);
 const [rascunhoAlterado,setRascunhoAlterado]=useState(false);
 useEffect(()=>{
   onRascunhoPendenteChange?.(rascunhoAlterado||gravando);
   return()=>onRascunhoPendenteChange?.(false);
 },[rascunhoAlterado,gravando,onRascunhoPendenteChange]);
 const [erro,setErro]=useState('');
 const [sucesso,setSucesso]=useState('');
 const tentativa=useRef<string|null>(null);
 const cliente=clientes.find(c=>c.id===clienteId);
 const disponiveis=(cliente?.plano?.situacao==='ativo'?cliente.parcelas:[]).filter(p=>p.situacao==='pendente').sort((a,b)=>a.numero-b.numero);
 const parcela=disponiveis.find(p=>p.id===parcelaId);
 const acordoAtual=cliente?.plano??null;
 const revisao=acordoAtual?resumoAcordoR11(
   acordoAtual.competencia_inicial.slice(0,7),acordoAtual.dia_vencimento,
   acordoAtual.valor_parcela_centavos,numeros,
   cliente?.parcelas.filter(p=>p.situacao==='paga').map(p=>p.numero)??[],
   new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
 ):null;
 const acordoSemAtivacao=cliente?.situacao!=='ativa'&&cliente?.situacao!=='concluida'&&cliente?.situacao!=='trancada';
 useEffect(()=>{if(inicial)setClienteId(inicial);if(parcelaInicial)setParcelaId(parcelaInicial)},[inicial,parcelaInicial]);
 useEffect(()=>{
   const p=clientes.find(c=>c.id===clienteId)?.plano;
   setInicio(p?.competencia_inicial.slice(0,7)??'');
   setDia(String(p?.dia_vencimento??10));
   setValor(p?(p.valor_parcela_centavos/100).toFixed(2).replace('.',','):'');
   setAcordo(p?.referencia_acordo??'');
   setNumeros([]);setFonte('');setConfirmo(false);
   setPagador(''); // Exigir identificação consciente: pagador pode ser responsável, não o estudante.
 },[clienteId,clientes]);
 const autorizado=async()=>{
   const {data:{user},error}=await supabase.auth.getUser();
   if(error||!user||user.is_anonymous)return false;
   return (await obterPapeisGestao(supabase,user.id)).includes('coordenacao');
 };
 const executar=async(fn:()=>Promise<void>)=>{
   if(!podeGerir||gravando)return;setErro('');setSucesso('');setGravando(true);
   try{if(!await autorizado())throw Error('Acesso administrativo expirado.');await fn();await aoAtualizar();setRascunhoAlterado(false);}
   catch(e){setErro(e instanceof Error?e.message:'Operação não concluída.');}
   finally{setGravando(false);}
 };
 const salvar=async(e:FormEvent)=>{e.preventDefault();
   const v=parseCentavos(valor);
   if(!cliente||!v||!/^\d{4}-(0[1-9]|1[0-2])$/.test(inicio)
      ||Number(dia)<1||Number(dia)>28||acordo.trim().length<8){setErro('Preencha acordo, mês inicial, dia de 1 a 28 e valor válido.');return;}
   await executar(async()=>{
     const {error}=await supabase.rpc('educart_r11_salvar_rascunho_dev',{
       p_matricula_id:cliente.id,p_competencia_inicial:inicio+'-01',
       p_dia_vencimento:Number(dia),p_valor_centavos:v,p_referencia_acordo:acordo.trim()});
     if(error)throw Error('O banco recusou o rascunho. Confira a matrícula e o acordo.');
     setSucesso('Rascunho salvo: nenhuma cobrança criada.');});
 };
 const importar=async(e:FormEvent)=>{e.preventDefault();
   if(!cliente?.plano||!confirmo)return;
   if(acordoSemAtivacao&&cliente.plano.situacao==='rascunho'){
     setErro('Antes de ativar 24 cobranças, regularize o vínculo acadêmico do estudante na Secretaria.');return;
   }
   const ativo=cliente.plano.situacao==='ativo';
   if(ativo&&!numeros.length){setErro('Escolha parcelas antigas realmente quitadas.');return;}
   if(numeros.length&&fonte.trim().length<8){setErro('A quitação histórica exige referência documental.');return;}
   await executar(async()=>{
     const {data:resultado,error}=await supabase.rpc(
       ativo?'educart_r11_importar_historico_dev':'educart_r11_ativar_plano_dev',{
       p_matricula_id:cliente.id,p_parcelas_historicas:numeros,
       p_fonte_historica:fonte.trim(),
       ...(ativo?{p_confirmei_documentos:true}:{p_confirmo_plano:true})});
     if(error||resultado===null)throw Error('O banco recusou a conferência. Revise parcelas e matrícula ativa.');
     setNumeros([]);setFonte('');setConfirmo(false);
     setSucesso(ativo?'Quitações históricas adicionadas.':'Plano de 24 parcelas ativado com histórico revisado.');
   });
 };
 const receber=async(e:FormEvent)=>{e.preventDefault();
   if(!parcela||!confirmo)return;
   const recebidoPor=recebedor==='Outro'?outro.trim():recebedor;
   if(pagador.trim().length<2||recebidoPor.length<2||!data
     ||(meio!=='dinheiro'&&referencia.trim().length<8)){setErro('Confira pagador, recebedor, data e referência.');return;}
   const dt=new Date(data+':00-03:00');
   if(Number.isNaN(dt.getTime())||dt.getTime()>Date.now()+300000){setErro('Data inválida ou futura.');return;}
   await executar(async()=>{
     if(!tentativa.current)tentativa.current=crypto.randomUUID();
     const {data:res,error}=await supabase.rpc('educart_r11_registrar_recebimento_dev',{
       p_parcela_id:parcela.id,p_idempotencia:tentativa.current,p_modalidade:meio,
       p_pagador_nome:pagador.trim(),p_recebedor_nome:recebidoPor,
       p_pago_em:dt.toISOString(),p_referencia:referencia.trim()||null,
       p_confirmei_recebimento:true});
     if(error||!res)throw Error('Registro recusado. Confira duplicidade, comprovante e situação da parcela.');
     tentativa.current=null;setParcelaId('');setReferencia('');setData('');setConfirmo(false);
     setSucesso('Pagamento confirmado na parcela, com meio de pagamento e recebedor.');
   });
 };
 return <section className="admin-r11-editor"
    onChangeCapture={e=>{if((e.target as HTMLElement).closest('form'))setRascunhoAlterado(true);}}
    aria-label={modo==='plano'?'Plano individual':'Registro de recebimento'}>
   <h2>{modo==='plano'?'Acordo e histórico financeiro':'Registrar pagamento'} <AdminAjuda
     titulo={modo==='plano'?'Acordo e histórico financeiro':'Registrar pagamento'}
     descricao={modo==='plano'?'Primeiro configure o acordo sem cobrar; depois confira os pagamentos antigos e revise o resumo das 24 parcelas.':'Informe a modalidade, data real, pagador e quem recebeu.'}
     cuidado="Não invente dados de pagamentos antigos nem confirme crédito não verificado." /></h2>
   {erro&&<p role="alert" className="admin-academico-message">{erro}</p>}
   {sucesso&&<p role="status" className="admin-academico-message">{sucesso}</p>}
   <label htmlFor="r11-ed-cliente">Cliente e matrícula</label>
   <select id="r11-ed-cliente" value={clienteId} onChange={e=>{setClienteId(e.target.value);setParcelaId('');tentativa.current=null;}} disabled={gravando}>
     <option value="">Selecione o cliente</option>
     {clientes.filter(c=>modo==='plano'||c.plano?.situacao==='ativo').map(c=>
       <option key={c.id} value={c.id}>{c.nome} · {c.turma}</option>)}
   </select>
   {modo==='plano'&&cliente&&<>
     {cliente.plano?.situacao!=='ativo'&&<form className="admin-r11-form" onSubmit={salvar}>
       <h3>1. Configurar acordo financeiro <AdminAjuda titulo="Configurar acordo"
         descricao="Primeiro mês individual, vencimento, valor de cada parcela e referência do contrato."
         cuidado="Salvar rascunho não cria dívida e não quita parcelas." /></h3>
       <p>Preencha e salve os dados do acordo individual. Ainda não serão criadas mensalidades.</p>
       <label>Primeira competência<input type="month" value={inicio} required onChange={e=>setInicio(e.target.value)}/></label>
       <label>Dia de vencimento<input type="number" min="1" max="28" value={dia} onChange={e=>setDia(e.target.value)}/></label>
       <label>Valor por parcela (R$)<input inputMode="decimal" value={valor} required onChange={e=>setValor(e.target.value)} placeholder="320,00"/></label>
       <label>Referência do acordo<input value={acordo} minLength={8} maxLength={200} required onChange={e=>setAcordo(e.target.value)} placeholder="CONTRATO-2026"/></label>
       <button className="admin-btn admin-btn-primary" type="submit" disabled={gravando}>Salvar rascunho (sem gerar dívida)</button>
     </form>}
     {cliente.plano&&<form className="admin-r11-form" onSubmit={importar}>
       <h3>2. Conferir histórico de pagamentos <AdminAjuda titulo="Conferir histórico"
         descricao="Marque apenas parcelas com quitação antiga efetivamente conferida. Uma parcela posterior pode estar paga e outra anterior, não."
         cuidado="Não preencha datas, modalidades ou comprovantes antigos por suposição." /></h3>
       <p>{cliente.plano.situacao==='ativo'?'Selecione novas quitações anteriores que você conferiu.':
         'Antes de ativar, marque as quitações antigas conferidas. O restante das 24 parcelas será devido conforme o acordo.'}</p>
       <div className="admin-r11-historico-grade" role="group" aria-label="24 parcelas históricas">
         {Array.from({length:24},(_,i)=>i+1).map(n=>{
           const paga=cliente.parcelas.some(p=>p.numero===n&&p.situacao==='paga');
           return <label key={n} className={'admin-r11-check'+(paga?' ja-paga':'')}>
             <input type="checkbox" disabled={gravando||paga}
               checked={paga||numeros.includes(n)} onChange={()=>{
                 setNumeros(a=>a.includes(n)?a.filter(x=>x!==n):[...a,n].sort((x,y)=>x-y));
                 setConfirmo(false);
               }}/>
             <span>{String(n).padStart(2,'0')}</span>
           </label>;
         })}
       </div>
       <label>Fonte da conferência histórica<input value={fonte} maxLength={200}
         onChange={e=>{setFonte(e.target.value);setConfirmo(false);}}
         placeholder="LIVRO-CAIXA-2025-REVISADO"/></label>
       {revisao&&<section className="admin-r11-revisao" aria-label="Prévia obrigatória das 24 parcelas, sem lançamento">
         <h3>Revisão antes da confirmação <AdminAjuda titulo="Prévia das 24 parcelas"
           descricao="Confira todas as competências, vencimentos, valores e quitações indicadas antes de confirmar."
           cuidado="Vermelho nesta prévia significa que a parcela venceria pelo acordo; dívida só nasce após a ativação. Quitação importada não é receita do mês." /></h3>
         <p><strong>Estudante:</strong> {cliente.nome} · <strong>Turma:</strong> {cliente.turma} · <strong>Matrícula:</strong> {cliente.id}</p>
         <p><strong>Período:</strong> {revisao.periodoInicio} a {revisao.periodoFim} · <strong>Vencimento:</strong> dia {acordoAtual?.dia_vencimento} · <strong>Referência:</strong> {acordoAtual?.referencia_acordo}</p>
         <div className="admin-r11-resumo">
           <div><small>24 parcelas previstas</small><strong>{reais(revisao.totalCentavos)}</strong></div>
           <div><small>Quitadas ou marcadas após conferência</small><strong>{revisao.pagasExistentes+revisao.marcadasHistoricas}/24 · {reais(revisao.marcadoQuitadoCentavos)}</strong></div>
           <div><small>Saldo previsto, antes de ajustes</small><strong>{reais(revisao.restanteCentavos)}</strong></div>
         </div>
         <p className="admin-academico-note">{revisao.marcadasHistoricas} quitação(ões) histórica(s) selecionada(s) nesta operação · {revisao.vencidasOuPrevistasVencidas} competência(s) passadas não quitadas na revisão.</p>
         <details open><summary>Confira as 24 parcelas individualmente</summary>
           <div className="admin-r11-revisao-rol" role="group" aria-label="Lista completa de parcelas e vencimentos">
             {revisao.linhas.map(linha=><div className="admin-r11-revisao-linha" key={linha.numero}>
               <span>{String(linha.numero).padStart(2,'0')}/24 · {linha.competencia}</span>
               <span>Vence {linha.vencimento}</span>
               <span>{reais(linha.valorCentavos)}</span>
               <span>{linha.situacao==='quitada'?'Paga confirmada':
                 linha.situacao==='historico_a_conferir'?'Histórico marcado para confirmar':
                 linha.situacao==='venceria'?'Venceria pelo acordo':
                 linha.situacao==='futura'?'Futura':'Pendente no prazo'}</span>
             </div>)}
           </div>
         </details>
         <p><strong>Atenção:</strong> ativar este plano constituirá 24 obrigações financeiras, salvo as parcelas históricas conferidas. Confira a existência de lançamentos antigos; o servidor bloqueia competências sobrepostas. Bolsas, descontos e valores excepcionais ainda exigem tratamento próprio. Nenhum pagamento antigo será contabilizado como entrada de caixa de hoje.</p>
       </section>}
       <label className="admin-r11-confirma"><input type="checkbox" checked={confirmo}
         onChange={e=>setConfirmo(e.target.checked)}/> Conferi o acordo e o histórico; não estou inventando pagamentos.</label>
       {acordoSemAtivacao&&cliente.plano.situacao==='rascunho'&&<p role="note">A matrícula acadêmica ainda não está regularizada. O acordo pode permanecer em rascunho, mas não é possível ativar cobranças.</p>}
       <button className="admin-btn admin-btn-primary" type="submit" disabled={!confirmo||gravando||(acordoSemAtivacao&&cliente.plano.situacao==='rascunho')||(cliente.plano.situacao==='ativo'&&!numeros.length)}>
         {cliente.plano.situacao==='ativo'?'Registrar quitações antigas':'Ativar as 24 parcelas'}</button>
     </form>}
   </>}
   {modo==='pagamento'&&cliente&&<form className="admin-r11-form" onSubmit={receber}>
     <label>Parcela a quitar<select value={parcelaId} required onChange={e=>{setParcelaId(e.target.value);tentativa.current=null;setConfirmo(false);}}>
       <option value="">Selecione parcela pendente</option>
       {disponiveis.map(p=><option key={p.id} value={p.id}>
         {p.numero}/24 · {p.competencia.slice(0,7)} · {reais(p.valor_centavos)}</option>)}
     </select></label>
     {parcela&&<p>Valor integral: <strong>{reais(parcela.valor_centavos)}</strong></p>}
     <label>Modalidade<select value={meio} onChange={e=>{setMeio(e.target.value as typeof meio);setConfirmo(false);tentativa.current=null;}}>
       <option value="dinheiro">Dinheiro</option><option value="debito">Débito</option>
       <option value="credito">Crédito</option><option value="pix">Pix</option></select></label>
     <p>Perfil beneficiário: <strong>{cliente.nome}</strong> · {cliente.turma}. Quem pagou pode ser outra pessoa.</p>
     <label>Quem pagou<input value={pagador} required maxLength={160} placeholder="Nome da pessoa que entregou o pagamento" onChange={e=>{setPagador(e.target.value);setConfirmo(false);tentativa.current=null;}}/></label>
     <label>Quem recebeu<select value={recebedor} required onChange={e=>{setRecebedor(e.target.value);setOutro('');setConfirmo(false);tentativa.current=null;}}>
       <option value="">Selecione o recebedor real</option>
       <option>Aline</option><option>Felipe</option><option>Outro</option></select></label>
     {recebedor==='Outro'&&<label>Nome do recebedor<input value={outro} required maxLength={160} onChange={e=>{setOutro(e.target.value);setConfirmo(false);tentativa.current=null;}}/></label>}
     <label>Data e hora reais<input type="datetime-local" value={data} required onChange={e=>{setData(e.target.value);setConfirmo(false);tentativa.current=null;}}/></label>
     <label>Referência da transação {meio==='dinheiro'?'(opcional)':''}
       <input value={referencia} maxLength={200} minLength={meio==='dinheiro'?undefined:8}
         required={meio!=='dinheiro'} onChange={e=>{setReferencia(e.target.value);setConfirmo(false);tentativa.current=null;}}/></label>
     <label className="admin-r11-confirma"><input type="checkbox" checked={confirmo}
       onChange={e=>setConfirmo(e.target.checked)}/>
       Conferi o recebimento real, o pagador e quem recebeu. Confirmo a baixa desta parcela.</label>
     <button type="submit" className="admin-btn admin-btn-primary" disabled={!parcela||!confirmo||gravando}>Confirmar pagamento</button>
     <p>Somente parcelas integrais. Pagamentos parciais e estornos terão fluxo separado; histórico antigo não gera receita nova.</p>
   </form>}
 </section>;
}
