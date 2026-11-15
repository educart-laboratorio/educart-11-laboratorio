/** Portão A — lógica única de navegação do cadastro guiado EducART 1.1.
 * Sem dependências de navegador ou Supabase; importada pela UI e testada.
 */
export type ModoCadastroTurma='nova'|'existente';
const CAMINHOS:Record<ModoCadastroTurma,readonly number[]>={
  nova:[0,1,2,3,4,5],
  existente:[0,3,4,5],
};
export function etapasParaConcluir(modo:ModoCadastroTurma):number[]{
  return modo==='nova'?[0,2,3,4]:[0,3,4];
}
export function avancarEtapaCadastro(
  modo:ModoCadastroTurma, atual:number, validar:(etapa:number)=>string,
):{etapa:number;erro:string}{
  const caminho=CAMINHOS[modo];
  const indice=caminho.indexOf(atual);
  if(indice<0)return {etapa:0,erro:'Etapa inválida. Retorne ao início do cadastro.'};
  const erro=validar(atual);
  if(erro)return {etapa:atual,erro};
  return {etapa:caminho[Math.min(indice+1,caminho.length-1)],erro:''};
}
export function voltarEtapaCadastro(modo:ModoCadastroTurma,atual:number):number{
  const caminho=CAMINHOS[modo];
  const indice=caminho.indexOf(atual);
  return indice<0?0:caminho[Math.max(0,indice-1)];
}

/** Validação sintética e real compartilhada com o formulário, sem escrita no DEV. */
export type FalhaCadastro={campo:string;mensagem:string};
type FormacaoValidavel={
  nome:string;idade_minima:string;duracao_meses:string;carga_horaria_horas:string;
  valor_matricula_reais:string;valor_mensalidade_reais:string;
  quantidade_mensalidades_referencia:string;
};
type TurmaValidavel={
  codigo:string;capacidade:string;inicio_em:string;termina_em:string;
  inscricoes_abrem_em:string;inscricoes_encerram_em:string;
};
type HorarioValidavel={dia:string;inicio:string;fim:string};
export type DadosValidacaoCadastro={
  modo:ModoCadastroTurma;formacaoExistente:boolean;formacao:FormacaoValidavel;
  turma:TurmaValidavel;horarios:readonly HorarioValidavel[];
  docenteId:string;docentesAtivos:readonly string[];
};
const numeroOpcional=(v:string,min:number,max:number)=>
  !v||(Number.isInteger(Number(v))&&Number(v)>=min&&Number(v)<=max);
const valorFinanceiroValido=(v:string)=>{
  if(!v.trim())return true;
  const str=v.trim().replace(',','.');
  if(!/^\d{1,6}(\.\d{1,2})?$/.test(str))return false;
  const n=Math.round(Number(str)*100);
  return Number.isSafeInteger(n)&&n<=10000000;
};
export function validarEtapaCadastro(etapaAtual:number,d:DadosValidacaoCadastro):FalhaCadastro|null{
  const falha=(campo:string,mensagem:string):FalhaCadastro=>({campo,mensagem});
  const f=d.formacao,t=d.turma;
  if(etapaAtual===0){
    if(d.modo==='existente')
      return d.formacaoExistente?null:falha('pgt-formacao-existente','Selecione uma formação existente.');
    const nome=f.nome.trim();
    if(nome.length<3||nome.length>120)
      return falha('pgt-nome','O nome da formação precisa ter entre 3 e 120 caracteres.');
    if(!numeroOpcional(f.idade_minima,0,120))
      return falha('pgt-idade','A idade mínima deve estar entre 0 e 120 anos, ou ficar em branco.');
    if(!numeroOpcional(f.duracao_meses,1,240))
      return falha('pgt-duracao','A duração deve ser de 1 a 240 meses, ou ficar em branco.');
    if(!numeroOpcional(f.carga_horaria_horas,1,10000))
      return falha('pgt-carga','A carga horária deve ser de 1 a 10.000 horas, ou ficar em branco.');
  }
  if(etapaAtual===2&&d.modo==='nova'){
    if(!valorFinanceiroValido(f.valor_matricula_reais))
      return falha('pgt-matricula-preco','Confira o preço de matrícula em reais (até duas casas decimais).');
    if(!valorFinanceiroValido(f.valor_mensalidade_reais))
      return falha('pgt-mensalidade-preco','Confira a mensalidade em reais (até duas casas decimais).');
    if(!numeroOpcional(f.quantidade_mensalidades_referencia,1,120))
      return falha('pgt-mensalidades','A quantidade deve ser de 1 a 120 mensalidades, ou ficar em branco.');
  }
  if(etapaAtual===3){
    if(!d.docenteId||!d.docentesAtivos.includes(d.docenteId))
      return falha('pgt-docente','Selecione um docente ativo na aba Docentes para esta turma.');
  }
  if(etapaAtual===4){
    if(!/^[A-Z0-9][A-Z0-9._-]{2,39}$/.test(t.codigo.trim().toUpperCase()))
      return falha('pgt-codigo','Código: use de 3 a 40 caracteres, com letras, números, hífen, ponto ou sublinhado.');
    if(!numeroOpcional(t.capacidade,1,500))
      return falha('pgt-vagas','Informe de 1 a 500 vagas, ou deixe a capacidade em branco.');
    if(t.inicio_em&&t.termina_em&&t.termina_em<t.inicio_em)
      return falha('pgt-fim','O término da turma não pode anteceder o início.');
    if(t.inscricoes_abrem_em&&t.inscricoes_encerram_em&&t.inscricoes_encerram_em<t.inscricoes_abrem_em)
      return falha('pgt-encerramento','As inscrições não podem encerrar antes da abertura.');
    if(d.horarios.length<1||d.horarios.length>7)
      return falha('pgt-adicionar-horario','A turma deve ter de um a sete horários semanais.');
    const dias=new Set<string>();
    for(let i=0;i<d.horarios.length;i++){
      const h=d.horarios[i];
      if(!/^[0-6]$/.test(h.dia))
        return falha('pgt-dia-'+i,'Escolha o dia da semana.');
      if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(h.inicio))
        return falha('pgt-hora-inicio-'+i,'Informe um horário de início válido.');
      if(!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(h.fim)||h.inicio>=h.fim)
        return falha('pgt-hora-fim-'+i,'O horário de término deve ser válido e posterior ao início.');
      if(dias.has(h.dia))
        return falha('pgt-dia-'+i,'Este dia já aparece na grade; escolha outro dia.');
      dias.add(h.dia);
    }
  }
  return null;
}
