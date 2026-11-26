// Houston — Editais e Oportunidades 2027. Motor puro; não fornece autenticação nem persistência.
// Datas sem horário encerram no fim do dia em America/Bahia.
function prazoVencido(prazo, agora = new Date()) {
  if (!prazo) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(prazo)) {
    const partes = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(agora);
    const p = Object.fromEntries(partes.map(x=>[x.type,x.value]));
    return prazo < `${p.year}-${p.month}-${p.day}`;
  }
  const t=Date.parse(prazo);
  return !Number.isFinite(t)||t<agora.getTime();
}

function situacaoEfetiva(item,agora=new Date()){
  return ['aberta','prorrogada'].includes(item.status_manual)&&(!item.prazo_inscricao||prazoVencido(item.prazo_inscricao,agora))?'encerrada':item.status_manual;
}

function prazoOrdenavel(prazo){
  if(!prazo)return Infinity;
  const t=Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(prazo)?`${prazo}T23:59:59.999-03:00`:prazo);
  return Number.isFinite(t)?t:Infinity;
}

function linkOficialValido(valor){
  if(typeof valor!=='string'||!/^https?:\/\/[^\s/@?#\\]+(?:[/?#][^\s\\]*)?$/i.test(valor))return false;
  if(typeof URL==='undefined')return false;
  try{const u=new URL(valor);return ['https:','http:'].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password;}catch{return false;}
}

function normalizar(valor){return String(valor??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();}

function listarOportunidades(registros,filtros={},agora=new Date(),validarLink=linkOficialValido){
  const vigente=s=>['aberta','prorrogada'].includes(s);
  const grupo=r=>vigente(r.situacao)?(r.destaque_prioritario===true?0:1):r.situacao==='prevista'?2:3;
  const igual=(a,b)=>normalizar(a)===normalizar(b);
  const consulta=normalizar(filtros.busca);
  return registros.filter(r=>r.status_publicacao==='publicado'&&r.arquivado===false&&validarLink(r.url_oficial)&&['aberta','prorrogada','prevista','encerrada'].includes(r.status_manual))
    .map(r=>({...r,situacao:situacaoEfetiva(r,agora)}))
    .filter(r=>(!filtros.area||(Array.isArray(r.area_artistica)&&r.area_artistica.some(a=>igual(a,filtros.area))))&&(!filtros.territorio||igual(r.territorio,filtros.territorio))&&(!filtros.ano||Number(r.ano_referencia)===Number(filtros.ano))&&(filtros.situacao?r.situacao===filtros.situacao:filtros.incluirEncerradas===true||r.situacao!=='encerrada')&&(!consulta||normalizar([r.titulo,r.instituicao,r.resumo,r.territorio,...(Array.isArray(r.area_artistica)?r.area_artistica:[])].join(' ')).includes(consulta)))
    .sort((a,b)=>grupo(a)-grupo(b)||(prazoOrdenavel(a.prazo_inscricao)-prazoOrdenavel(b.prazo_inscricao))||String(a.titulo).localeCompare(String(b.titulo),'pt-BR')||String(a.id).localeCompare(String(b.id)));
}

function mensagemCompartilhamento(item,urlPagina){
  const p=item.prazo_inscricao;
  const prazo=/^\d{4}-\d{2}-\d{2}$/.test(p??'')?p.split('-').reverse().join('/'):p&&Number.isFinite(Date.parse(p))?new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Bahia',dateStyle:'short',timeStyle:'short'}).format(new Date(p)):'A confirmar';
  return `${item.titulo}\n${item.instituicao}\nPrazo: ${prazo}\n${linkOficialValido(urlPagina)?urlPagina:item.url_oficial}`;
}

export { prazoVencido, situacaoEfetiva, linkOficialValido, listarOportunidades, mensagemCompartilhamento };
