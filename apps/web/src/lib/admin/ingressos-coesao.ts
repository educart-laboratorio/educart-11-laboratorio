/** Regras puras de coesão do painel de ingressos. Sem conexão ao banco. */
export function competenciaValida(valor:string):boolean {
  return /^(?:19|20|21)\d{2}-(?:0[1-9]|1[0-2])$/.test(valor);
}
export function proximoMesSeguro(atual:string,delta:number,fallback:string):string {
  if(!competenciaValida(atual)||!Number.isInteger(delta)||Math.abs(delta)>12){
    return competenciaValida(fallback)?fallback:atual;
  }
  const [ano,mes]=atual.split('-').map(Number);
  const result=new Date(Date.UTC(ano,mes-1+delta,1)).toISOString().slice(0,7);
  return competenciaValida(result)?result:atual;
}
/** Apenas competências existentes, pagas ou pendentes, com vínculo ativo e valor devido. */
export function podeRegistrarPagamento(situacao:string,status:string|undefined,valorDevido:number|undefined):boolean {
  return situacao==='ativa' && (status==='pago'||status==='pendente') &&
    typeof valorDevido==='number' && Number.isFinite(valorDevido) && valorDevido>0;
}
/** Evita oferecer matrícula para inscrição cancelada, matriculada ou já vinculada. */
export function podeMatricularCadastro(status:string,jaVinculado:boolean):boolean {
  return !jaVinculado && status!=='cancelado' && status!=='matriculado';
}
