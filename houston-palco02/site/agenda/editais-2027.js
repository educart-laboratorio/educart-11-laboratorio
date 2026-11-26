"use strict";
function isoDate(v){if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+"T00:00:00Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v}
function officialUrl(v){if(typeof v!=="string"||!/^(https?):\/\/[a-z0-9.-]+\.[a-z]{2,}(?::[0-9]+)?(?:[/?#][^\s]*)?$/i.test(v))return false;if(typeof URL==="undefined")return true;try{const u=new URL(v);return ["https:","http:"].includes(u.protocol)&&!!u.hostname&&!u.username&&!u.password}catch{return false}}
function effectiveStatus(r,today){return ["aberta","prorrogada"].includes(r.status)&&r.prazo_inscricao<today?"encerrada":r.status}
function selectRows(records,today,filters={}){const seen=new Set();return records.filter(r=>{
if(!r||!["id","titulo","instituicao","resumo","territorio","publico_alvo"].every(k=>typeof r[k]==="string"&&r[k].trim())||seen.has(r.id)||!officialUrl(r.url_oficial)||!isoDate(r.data_verificacao)||r.ano_referencia!==2027||typeof r.destaque_prioritario!=="boolean"||!["edital","festival","audicao","bolsa","curso","residencia"].includes(r.categoria)||!Array.isArray(r.area_artistica)||!r.area_artistica.length||!r.area_artistica.every(x=>["Teatro","Audiovisual","Formação Artística","Multilinguagem"].includes(x))||!["aberta","prorrogada","prevista","encerrada"].includes(r.status)||(!(r.status==="prevista"&&r.prazo_inscricao===null)&&!isoDate(r.prazo_inscricao)))return false;
seen.add(r.id);return true}).map(r=>({...r,statusEfetivo:effectiveStatus(r,today)})).filter(r=>(!filters.area||r.area_artistica.includes(filters.area))&&(!filters.territorio||r.territorio===filters.territorio)&&(!filters.categoria||r.categoria===filters.categoria)&&(filters.status?r.statusEfetivo===filters.status:r.statusEfetivo!=="encerrada")).sort((a,b)=>{
const rank=r=>["aberta","prorrogada"].includes(r.statusEfetivo)?(r.destaque_prioritario?0:1):r.statusEfetivo==="prevista"?2:3;
return rank(a)-rank(b)||(a.prazo_inscricao||"9999-12-31").localeCompare(b.prazo_inscricao||"9999-12-31")||a.titulo.localeCompare(b.titulo,"pt-BR")||a.id.localeCompare(b.id)})}

(function(){
const el=id=>document.getElementById(id),tabs=[el("tab-espetaculos"),el("tab-editais")],list=el("ed-list");
const labels={aberta:"Aberta",prorrogada:"Prorrogada",prevista:"Prevista",encerrada:"Encerrada"};
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
const fmt=v=>v?v.split("-").reverse().join("/"):"A definir";
const params=()=>new URLSearchParams(location.search);
const fixtureMode=()=>location.hostname.endsWith(".vercel.app")&&location.hostname!=="educart-houston-v95-palco02-publico.vercel.app"&&params().get("fixtures")==="1";
let records=null,loadedMode=null,loadToken=0,openId=null,mode="espetaculos",lastDay=null;
const filters=()=>({area:el("ed-area").value,territorio:el("ed-territorio").value,categoria:el("ed-categoria").value,status:el("ed-status").value});
function render(){
if(!records)return;
lastDay=localToday();
const rows=selectRows(records,lastDay,filters());
if(!rows.some(r=>r.id===openId))openId=null;
if(!rows.length){list.innerHTML='<div class="empty-state">Nenhum edital encontrado para os filtros atuais.</div>';return}
list.innerHTML=rows.map(r=>{
const opened=r.id===openId,active=["aberta","prorrogada"].includes(r.statusEfetivo),deadline=fmt(r.prazo_inscricao),priority=active&&r.destaque_prioritario;
const message=[r.titulo,r.instituicao,"Prazo: "+deadline,r.url_oficial].join("\n");
const wa="https://wa.me/?text="+encodeURIComponent(message);
return '<article class="board-row-wrapper'+(opened?' is-open':'')+(priority?' ed-priority':'')+'"><button type="button" class="ed-row" data-ed-id="'+esc(r.id)+'" aria-expanded="'+opened+'"><span class="badge ed-'+r.statusEfetivo+'">'+labels[r.statusEfetivo]+'</span><span class="ed-name"><span class="ed-title">'+esc(r.titulo)+'</span><span class="ed-sub">'+esc(r.instituicao)+'</span></span><span class="ed-location"><span class="ed-sub">'+esc(r.area_artistica.join(" · "))+'</span><span class="ed-sub">'+esc(r.territorio)+'</span></span><span class="ed-deadline">'+esc(deadline)+'</span><span class="cell-chevron" aria-hidden="true">▼</span></button><div class="expanded-panel"><div class="detail-block"><div class="detail-label">Resumo da chamada</div><p class="detail-text">'+esc(r.resumo)+'</p></div><div class="detail-block"><div class="detail-label">Quem pode participar</div><p class="detail-text">'+esc(r.publico_alvo)+'</p></div><div class="action-bar"><div class="action-buttons"><a class="btn btn-ticket" href="'+esc(r.url_oficial)+'" target="_blank" rel="noopener noreferrer">Acessar Edital Oficial ↗</a><a class="btn btn-whatsapp" href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">Compartilhar no WhatsApp</a></div><span class="verified-stamp">Verificado em '+fmt(r.data_verificacao)+'</span></div></div></article>';
}).join("");
}
async function load(){
const desired=fixtureMode()?"fixtures":"dataset";
if(loadedMode===desired&&records){render();return}
const token=++loadToken;records=null;openId=null;list.innerHTML='<div class="empty-state">Carregando editais…</div>';
try{
const res=await fetch("./editais-salvador-"+desired+".json",{cache:"no-cache"});
if(!res.ok)throw Error("HTTP "+res.status);
const data=await res.json();
if(!Array.isArray(data.oportunidades))throw Error("Dataset inválido");
if(token!==loadToken)return;
records=data.oportunidades;loadedMode=desired;render()
}catch(e){if(token===loadToken)list.innerHTML='<div class="empty-state">Não foi possível carregar os editais. Tente novamente.</div>'}
}
function setTab(next,write=false){
mode=next==="editais"?"editais":"espetaculos";
if(write){const u=new URL(location.href);if(mode==="editais")u.searchParams.set("aba","editais");else u.searchParams.delete("aba");history.pushState(null,"",u)}
tabs.forEach((t,i)=>{const selected=i===(mode==="editais"?1:0);t.setAttribute("aria-selected",String(selected));t.tabIndex=selected?0:-1});
el("panel-espetaculos").hidden=mode==="editais";el("panel-editais").hidden=mode!=="editais";el("agenda-show-controls").hidden=mode==="editais";el("btn-go-today").hidden=mode==="editais";
if(mode==="editais"){el("header-subtitle").textContent="Editais, bolsas e oportunidades artísticas · 2027";load()}else{renderBoard(false)}
}
tabs.forEach((t,i)=>{t.addEventListener("click",()=>setTab(i?"editais":"espetaculos",true));t.addEventListener("keydown",e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const n=e.key==="Home"?0:e.key==="End"?1:1-i;setTab(n?"editais":"espetaculos",true);tabs[n].focus()})});
["ed-area","ed-territorio","ed-categoria","ed-status"].forEach(id=>el(id).addEventListener("change",()=>{openId=null;render()}));
list.addEventListener("click",e=>{const b=e.target.closest("[data-ed-id]");if(!b)return;const id=b.dataset.edId;openId=openId===id?null:id;render();const next=Array.from(list.querySelectorAll("[data-ed-id]")).find(x=>x.dataset.edId===id);if(next)next.focus({preventScroll:true})});
addEventListener("popstate",()=>setTab(params().get("aba")));
function refreshDay(){if(mode==="editais"&&lastDay!==localToday())render()}
addEventListener("focus",refreshDay);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)refreshDay()});
setInterval(refreshDay,60000);
setTab(params().get("aba"));
})();