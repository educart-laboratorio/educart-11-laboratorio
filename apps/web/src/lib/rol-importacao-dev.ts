/** EducART DEV: importa rol previamente revisado, sem gerar cobrança ou matrícula ativa. */
export type LinhaRol = {
  referencia:string;
  nome_completo:string;
  email:string;
  telefone:string;
  data_nascimento:string|null;
};
const CABECALHO=['referencia','nome_completo','email','telefone','data_nascimento'];

/** Leitor CSV com aspas RFC4180 e separador pt-BR ';'. Sem bibliotecas de planilha. */
export function lerRolCsv(texto:string):LinhaRol[]{
  if(!texto||texto.length>40000)throw new Error('Informe um CSV de até 40 KB.');
  const s=texto.replace(/^\uFEFF/,'').replace(/^sep=;\r?\n/i,'');
  const linhas:string[][]=[];let linha:string[]=[];let campo='';let entreAspas=false;
  let fechado=false;
  for(let i=0;i<s.length;i++){
    const c=s[i];
    if(entreAspas){
      if(c==='"'&&s[i+1]==='"'){campo+='"';i++;}
      else if(c==='"'){entreAspas=false;fechado=true;}
      else campo+=c;
      continue;
    }
    if(c==='"'){
      if(campo!==''||fechado)throw new Error('Aspas fora do início de um campo.');
      entreAspas=true;continue;
    }
    if(c===';'){
      linha.push(campo);campo='';fechado=false;continue;
    }
    if(c==='\n'||c==='\r'){
      if(c==='\r'&&s[i+1]==='\n')i++;
      linha.push(campo);campo='';fechado=false;linhas.push(linha);linha=[];continue;
    }
    if(fechado)throw new Error('Texto inesperado após aspas de CSV.');
    campo+=c;
  }
  if(entreAspas)throw new Error('Campo com aspas sem fechamento.');
  if(campo||linha.length){linha.push(campo);linhas.push(linha);}
  const naoVazias=linhas.filter(l=>l.some(x=>x.trim()!==''));
  if(!naoVazias.length)throw new Error('CSV sem linhas.');
  const cabecalho=naoVazias.shift()!.map(x=>x.trim().toLowerCase());
  if(cabecalho.join('|')!==CABECALHO.join('|'))throw new Error('Cabeçalho esperado: '+CABECALHO.join(';'));
  if(naoVazias.length<1||naoVazias.length>40)throw new Error('Use de 1 a 40 estudantes sintéticos por lote.');
  const refs=new Set<string>();const emails=new Set<string>();const telefones=new Set<string>();
  return naoVazias.map((valores,indice)=>{
    const erro=(mensagem:string):never=>{throw new Error('Linha '+(indice+2)+': '+mensagem);};
    if(valores.length!==5)erro('quantidade incorreta de colunas.');
    const [referencia,nome,emailBruto,telefoneBruto,nascimento]=valores.map(v=>v.trim());
    const email=emailBruto.toLowerCase();
    const telefone=telefoneBruto.replace(/\D/g,'');
    if(referencia.length<3||referencia.length>80||/^[=+@]/.test(referencia))erro('referência inválida.');
    if(nome.length<3||nome.length>150||/[\x00-\x1F]/.test(nome)||/^[=+@]/.test(nome))erro('nome inválido.');
    if(email.length>320||(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)))erro('e-mail inválido.');
    if(telefone&&(telefone.length<10||telefone.length>13))erro('telefone inválido.');
    if(!email&&!telefone)erro('informe e-mail ou telefone para conferência.');
    if(nascimento&&!/^\d{4}-\d{2}-\d{2}$/.test(nascimento))erro('nascimento deve ser AAAA-MM-DD.');
    if(nascimento){
      const data=new Date(nascimento+'T12:00:00Z');
      if(Number.isNaN(data.getTime())||data.toISOString().slice(0,10)!==nascimento
        ||data.getTime()>Date.now())erro('data de nascimento inválida.');
    }
    if(refs.has(referencia)||email&&emails.has(email)||telefone&&telefones.has(telefone))
      erro('possível duplicidade interna. Revise o rol.');
    refs.add(referencia);if(email)emails.add(email);if(telefone)telefones.add(telefone);
    return {referencia,nome_completo:nome,email,telefone,data_nascimento:nascimento||null};
  });
}
export const ROL_FICTICIO_DEV='referencia;nome_completo;email;telefone;data_nascimento\nHML-01;Lia Exemplo;lia-exemplo@example.invalid;71900000001;2000-01-05\nHML-02;Ravi Exemplo;ravi-exemplo@example.invalid;71900000002;2001-02-12';
