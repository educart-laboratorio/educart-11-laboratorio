/** Suspeitas de duplicidade: apenas sugestão, sem mesclagem nem mutação. */
export type ContatoInscrito={id:string;email:string;telefone_whatsapp:string};
export function idsPossivelmenteDuplicados(inscritos:readonly ContatoInscrito[]):Set<string>{
  const chaves=new Map<string,Set<string>>();
  for(const i of inscritos){
    const email=i.email.trim().toLocaleLowerCase('pt-BR');
    let tel=i.telefone_whatsapp.replace(/\D/g,'');
    if(tel.startsWith('55')&&(tel.length===12||tel.length===13))tel=tel.slice(2);
    for(const chave of [email.includes('@')?'email:'+email:null,
      tel.length===10||tel.length===11?'telefone:'+tel:null]){
      if(!chave)continue;
      const grupo=chaves.get(chave)??new Set<string>();
      grupo.add(i.id);chaves.set(chave,grupo);
    }
  }
  return new Set([...chaves.values()].filter(ids=>ids.size>1).flatMap(ids=>[...ids]));
}
