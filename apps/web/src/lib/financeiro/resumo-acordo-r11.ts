/** R11.5 — resumo puro, sem efeitos de escrita, de um acordo de 24 parcelas. */
export type SituacaoRevisao = 'quitada' | 'historico_a_conferir' | 'venceria' | 'pendente' | 'futura';
export type ParcelaRevisao = {
  numero:number; competencia:string; vencimento:string; valorCentavos:number; situacao:SituacaoRevisao;
};
export type ResumoAcordoR11 = {
  linhas:ParcelaRevisao[]; periodoInicio:string; periodoFim:string;
  totalCentavos:number; marcadoQuitadoCentavos:number; restanteCentavos:number;
  marcadasHistoricas:number; pagasExistentes:number; vencidasOuPrevistasVencidas:number;
};
export function resumoAcordoR11(
 inicio:string,dia:number,valorCentavos:number,
 historicas:readonly number[],pagas:readonly number[],hoje:string
):ResumoAcordoR11 {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(inicio)||!Number.isInteger(dia)||
    dia<1||dia>28||!Number.isInteger(valorCentavos)||valorCentavos<=0||valorCentavos>100000000||
    !/^\d{4}-\d{2}-\d{2}$/.test(hoje))
   throw new Error('Parâmetros de acordo inválidos');
 const [ano,mes]=inicio.split('-').map(Number);
 const marcadas=new Set(historicas),conferidas=new Set(pagas);
 for(const n of [...historicas,...pagas]){
   if(!Number.isInteger(n)||n<1||n>24)throw new Error('Parcela fora do intervalo 1–24');
 }
 const linhas:ParcelaRevisao[]=Array.from({length:24},(_,indice)=>{
   const num=indice+1;
   const primeiro=new Date(Date.UTC(ano,mes-1+indice,1)).toISOString().slice(0,7);
   const vencimento=primeiro+'-'+String(dia).padStart(2,'0');
   const situacao:SituacaoRevisao=conferidas.has(num)?'quitada':
     marcadas.has(num)?'historico_a_conferir':
     vencimento<hoje?'venceria':primeiro>hoje.slice(0,7)?'futura':'pendente';
   return {numero:num,competencia:primeiro,vencimento,valorCentavos,situacao};
 });
 const pagasContadas=linhas.filter(l=>l.situacao==='quitada'||l.situacao==='historico_a_conferir').length;
 return {
   linhas,periodoInicio:linhas[0].competencia,periodoFim:linhas[23].competencia,
   totalCentavos:valorCentavos*24,marcadoQuitadoCentavos:pagasContadas*valorCentavos,
   restanteCentavos:(24-pagasContadas)*valorCentavos,
   marcadasHistoricas:linhas.filter(l=>l.situacao==='historico_a_conferir').length,
   pagasExistentes:linhas.filter(l=>l.situacao==='quitada').length,
   vencidasOuPrevistasVencidas:linhas.filter(l=>l.situacao==='venceria').length,
 };
}
