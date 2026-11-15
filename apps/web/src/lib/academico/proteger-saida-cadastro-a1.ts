/** Portão A1: decisão pura de saída, sem banco, persistência ou efeitos.
 * Um cadastro sem modificações pode sair sem perguntar.
 */
export function precisaConfirmarSaidaCadastro(aberto:boolean,alterado:boolean):boolean{
  return aberto&&alterado;
}
