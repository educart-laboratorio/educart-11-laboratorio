const docenteSlugs=new Set(['aline-nepomuceno','antonio-marques','deko-alves','eric-flavio','fernando-santana','marcelo-jardim','marcia-gil-braz','taiana-lemos','tassia-gramacho']);
function updateDirectory(root,entries,rank,fs,path,attr,esc){
 const main=path.join(root,'artistas','index.html');let s=fs.readFileSync(main,'utf8');
 const countLink=/<a\b[^>]*class=["'][^"']*\bar-all-45-link\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi;
 let count=0;s=s.replace(countLink,a=>{count++;return a.replace(/(Todos\s+os\s+)\d+(\s+artistas)/i,'$1'+entries.length+'$2')});
 if(count!==1||!s.includes('Todos os '+entries.length+' artistas'))throw Error('Contador do catálogo principal não encontrado');
 const marker='<div class="artist-social-rail">',start=s.indexOf(marker),end=s.indexOf('</div>',start+marker.length);
 if(start<0||end<0)throw Error('Trilho de artistas não encontrado');
 const original=s.slice(start+marker.length,end),re=/<a\b[^>]*class=["'][^"']*\bsocial-chip\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,chips=original.match(re)||[];
 if(original.replace(re,'').trim()||!chips.length)throw Error('Trilho contém estrutura inesperada');
 const map=new Map();
 for(const c of chips){const slug=attr(c.match(/<a\b[^>]*>/i)[0],'href').match(/\/artistas\/perfil\/([^/]+)\//)?.[1];if(docenteSlugs.has(slug))continue;if(!slug||map.has(slug)||!(slug in rank))throw Error('Perfil desconhecido no trilho: '+slug);map.set(slug,c)}
 const rendered=entries.map(e=>{if(map.has(e.slug))return map.get(e.slug);const initials=e.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();const portrait=e.avatar?'<img loading="lazy" src="'+esc(e.avatar)+'" alt="Registro do acervo de '+esc(e.name)+'">':'<span class="social-initials" style="display:grid;place-items:center;font-weight:700" aria-hidden="true">'+esc(initials)+'</span>';return '<a class="social-chip" href="/artistas/perfil/'+esc(e.slug)+'/">'+portrait+'<strong>'+esc(e.name)+'</strong><small>Ver perfil ↗</small></a>'}).join('');
 s=s.slice(0,start+marker.length)+rendered+s.slice(end);fs.writeFileSync(main,s,'utf8');
 // Também corrige chamadas globais, sem alterar quantidades de elencos ou de recortes editoriais.
 let updated=1;
 function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if((f.name==='index.html'||f.name==='educart-base.html')&&p!==main){let old=fs.readFileSync(p,'utf8');let next=old.replace(/((?:Conheça|Todos)\s+os\s+)\d+(\s+(?:artistas|perfis)\b)/gi,(_,a,b)=>a+entries.length+b);if(next!==old){fs.writeFileSync(p,next,'utf8');updated++}}}}walk(root);
 console.log('EducART contagem automática: '+entries.length+' perfis; trilho principal '+entries.length+' cartões; '+updated+' páginas com contagem global atualizada');
}
function runtime(rank){
 const slugOf=a=>{try{const u=new URL(a.getAttribute("href"),location.href);if(u.origin!==location.origin)return null;const s=u.pathname.match(/^\/artistas\/perfil\/([^/]+)\/?(?:index\.html)?$/)?.[1];return s&&Object.prototype.hasOwnProperty.call(rank,s)?s:null}catch{return null}};
 const slugs=n=>[...new Set((n.matches?.("a[href]")?[n]:[...n.querySelectorAll("a[href]")]).map(slugOf).filter(Boolean))];
 const parents=new Set();
 for(const a of document.querySelectorAll('a[href*="/artistas/perfil/"]')){
  if(!slugOf(a)||a.closest("header,footer,nav,[role=tablist],.conhecaPerson"))continue;
  let card=a;
  while(card.parentElement&&!card.parentElement.matches("main,header,footer,nav,body")){
   const p=card.parentElement,items=[...p.children].map(n=>({n,s:slugs(n)})),single=items.filter(x=>x.s.length===1);
   if(single.length>=2&&new Set(single.map(x=>x.s[0])).size===single.length&&items.every(x=>x.s.length<=1)&&single.some(x=>x.n===card)){
    if(p.matches(".cast-grid,.cards,.artist-grid,.artists-grid,.artist-list,.artists-list,[data-cast-root],[data-artist-grid]")||single.every(x=>x.n.matches("article,.cast,[data-artist-card],.person,.artist-card,.artistCard,.profile-card,.profileCard"))){parents.add(p);break}
   }
   if(slugs(p).length!==1)break;card=p;
  }
 }
 for(const p of parents){if(location.pathname.replace(/index\.html$/,'').replace(/\/$/,'')==='/artistas/todos')continue;const items=[...p.children].map(n=>({n,s:slugs(n)})).filter(x=>x.s.length===1),sorted=items.slice().sort((a,b)=>rank[a.s[0]]-rank[b.s[0]]);if(items.every((x,i)=>x.n===sorted[i].n))continue;const slots=items.map(x=>{const m=document.createComment("educart-order");x.n.before(m);x.n.remove();return m});slots.forEach((m,i)=>m.replaceWith(sorted[i].n))}
}
(function generate(){
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const root=__dirname,dir=path.join(root,'artistas','perfil');
 const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'))?.slice(1).find(x=>x!==undefined)||'';
 const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
 const esc=s=>decode(String(s)).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const plain=s=>decode(s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
 const images=s=>s.match(/<img\b[^>]*>/gi)||[];
 const mediaKey=src=>{src=decode(src);return src.match(/[?&]id=([A-Za-z0-9_-]{15,})/)?.[1]||src.match(/\/file\/d\/([A-Za-z0-9_-]{15,})/)?.[1]||src.match(/\/([A-Za-z0-9_-]{25,})\.(?:webp|jpe?g|png)$/i)?.[1]||src.split('?')[0]};
 const useful=tag=>{const src=decode(attr(tag,'src'));return src&&!/placeholder|default-avatar|avatar-default|i\.ytimg\.com|logo|og-image/i.test(src)&&(/^https:\/\//.test(src)||src.startsWith('/')&&fs.existsSync(path.join(root,src.slice(1))))?src:''};
 const pane=(body,id)=>body.match(new RegExp('<section\\b(?=[^>]*\\bid=["\\x27]u-'+id+'["\\x27])[^>]*>([\\s\\S]*?)<\\/section>','i'))?.[1]||'';
 const entries=[];
 function correctName(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())correctName(p);else if(f.name==='index.html'||f.name==='educart-base.html'){const old=fs.readFileSync(p,'utf8'),next=old.replace(/João Toti/g,'João Todt').replace(/Joao Toti/g,'João Todt');if(next!==old)fs.writeFileSync(p,next,'utf8')}}}correctName(root);
 for(const slug of fs.readdirSync(dir).sort()){
  if(docenteSlugs.has(slug))continue; // perfil institucional, não integra o catálogo de casting.
  const file=path.join(dir,slug,'index.html');if(!fs.existsSync(file))continue;
  const html=fs.readFileSync(file,'utf8'),body=html.slice(html.search(/<body\b/i)).replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
  const name=plain(body.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||slug);
  const avatar=useful(body.match(/<(?:div|span|figure)\b[^>]*class=["'][^"']*\b(?:avatar|portrait)\b[^"']*["'][^>]*>\s*(<img\b[^>]*>)/i)?.[1]||''),photos=new Set();
  if(avatar)photos.add(mediaKey(avatar));
  let photoBody=pane(body,'photos');
  if(!photoBody)photoBody=(body.match(/<section\b[^>]*>[\s\S]*?<\/section>/gi)||[]).filter(s=>/class=["'][^"']*\bphotos\b/i.test(s)&&/fotograf|retrato|galeria/i.test(plain(s.match(/<h2\b[^>]*>[\s\S]*?<\/h2>/i)?.[0]||''))).join('');
  for(const img of images(photoBody)){const src=useful(img);if(src)photos.add(mediaKey(src))}
  const vids=new Set();for(const tag of (pane(body,'videos')||body).match(/<(?:button|iframe)\b[^>]*>/gi)||[]){
   for(const k of ['data-youtube','data-play-video','data-drive']){const v=attr(tag,k);if(k==='data-drive'?/^[A-Za-z0-9_-]{15,}$/.test(v):/^[A-Za-z0-9_-]{11}$/.test(v))vids.add(v)}
   const v=attr(tag,'src').match(/(?:youtube(?:-nocookie)?\.com\/embed\/|drive\.google\.com\/file\/d\/)([A-Za-z0-9_-]+)/)?.[1];if(v)vids.add(v);
  }
  const paragraphs=new Set();for(const tag of [pane(body,'release'),pane(body,'historico'),body.match(/<p\b[^>]*class=["'][^"']*\bu-intro\b[^"']*["'][^>]*>[\s\S]*?<\/p>/i)?.[0]||''].join('').match(/<(?:p|li)\b[^>]*>[\s\S]*?<\/(?:p|li)>/gi)||[]){const s=plain(tag);if(s.length>=45&&!/ainda não|aguard|participação documentada|material em catalogação|acervo audiovisual:|apresentação pessoal:|fotografias:|integrante do elenco de o último ato/i.test(s))paragraphs.add(s)}
  const words=[...paragraphs].join(' ').split(/\s+/).filter(Boolean).length,works=new Set([...body.matchAll(/href=["']\/espetaculos\/([^/"'#]+)\//gi)].map(m=>m[1]));
  entries.push({slug,name,avatar,photos:photos.size,videos:vids.size,words,score:(avatar?16:0)+Math.min(photos.size,40)*3+Math.min(vids.size,12)*12+Math.min(words/8,28)+Math.min(works.size,8)*2});
 }
 entries.sort((a,b)=>Number(b.photos>0)-Number(a.photos>0)||b.score-a.score||a.name.localeCompare(b.name,'pt-BR'));
 if(!entries.length||entries.some(e=>docenteSlugs.has(e.slug)))throw Error('Catálogo de artistas deve conter 51 perfis, sem coordenação institucional');
 const contentRank=Object.fromEntries(entries.map((e,i)=>[e.slug,i]));
 const men=new Set(["arthur-regis","celso-carvalho","dan-menezes","felipe-bispo","fernando-guerreiro","gabriel-da-matta","geovane-eduardo","germano","henrique-bianchi","icaro-moreira","joao-toti","jotta-erre","luan-pinto","lucas-s-dias","luiz-alberto-leal","mateus-de-jesus","pedro-antonio","thiago-oliveira","veloso","vinicius-machado","wlamir-mattos","yago-savalla"]),women=new Set(["barbara-nunes","beatriz-david","bia-montarroyos","bia-trabuco","clarice-lemos","clarice-rezende","dai-dias","dildiana","erica-dantas","ery-danda","gabriela-duarte","jack-rolim","jesse","laira-maissa","laura-assis","liliana-falcao","liz-moreira","luisa-salvador","maria-sotero","mel-cosme","michele-santana","mirelle-miqueias","mon-anjos","nice-santana","rhanna-borges","sarah-falcao","vani-bia","vicky-vargas"]);
 if(entries.some(e=>men.has(e.slug)===women.has(e.slug)))throw Error('Classificação editorial ausente ou duplicada');
 const m=entries.filter(e=>men.has(e.slug)),f=entries.filter(e=>women.has(e.slug)),ordered=[];
 if(m.length>f.length+1)throw Error('Alternância impossível sem excluir artistas');
 while(m.length||f.length){const prev=ordered.at(-1);const mustFemale=prev&&men.has(prev.slug);const mustMale=m.length>f.length;const takeMale=m.length&&!mustFemale&&(mustMale||!f.length||contentRank[m[0].slug]<contentRank[f[0].slug]);ordered.push(takeMale?m.shift():f.shift());}
 if(ordered.some((e,i)=>i&&men.has(e.slug)&&men.has(ordered[i-1].slug)))throw Error('Dois perfis masculinos consecutivos');
 entries.splice(0,entries.length,...ordered);
 const rank=Object.fromEntries(entries.map((e,i)=>[e.slug,i]));
 const catalog=path.join(root,'artistas','todos','index.html');let html=fs.readFileSync(catalog,'utf8');
 const h='<h2>Artistas com monólogo</h2><div class="cast-grid">',split='</div></div><div class="section"><h2>Outros artistas</h2><div class="cast-grid">',end='</div></div></main>';
 const start=html.indexOf(h),mid=html.indexOf(split,start),stop=html.indexOf(end,mid+split.length);
 if(start<0||mid<0||stop<0)throw Error('Estrutura do catálogo mudou; ordenação interrompida');
 const original=html.slice(start+h.length,mid)+html.slice(mid+split.length,stop),re=/<a\b[^>]*data-artist-card[^>]*>[\s\S]*?<\/a>/gi,cards=original.match(re)||[];
 if(original.replace(re,'').trim())throw Error('Conteúdo não identificado entre cartões');
 const seen=new Set(),bySlug=Object.fromEntries(cards.filter(card=>!docenteSlugs.has(attr(card.match(/<a\b[^>]*>/i)[0],'href').match(/\/artistas\/perfil\/([^/]+)\//)?.[1])).map(card=>{const slug=attr(card.match(/<a\b[^>]*>/i)[0],'href').match(/\/artistas\/perfil\/([^/]+)\//)?.[1];if(!slug||seen.has(slug)||!(slug in rank))throw Error('Cartão sem perfil único: '+slug);seen.add(slug);return [slug,card]}));
 for(const e of entries)if(!bySlug[e.slug]){
  const initials=e.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(),avatar=e.avatar?'<img src="'+esc(e.avatar)+'" alt="Registro do acervo de '+esc(e.name)+'" loading="lazy">':esc(initials);
  bySlug[e.slug]='<a class="cast" data-artist-card="'+esc(e.name)+'" data-cast-entry="'+(e.videos?'monologo':'inicial')+'" href="/artistas/perfil/'+esc(e.slug)+'/" title="Abrir perfil de '+esc(e.name)+'"><span class="avatar">'+avatar+'</span><span><strong>'+esc(e.name)+'</strong><small>Ver perfil ↗</small></span></a>';
 }
 html=html.slice(0,start)+'<h2>Todos os '+entries.length+' artistas</h2><p class="lead">Perfis organizados pela quantidade e variedade do acervo disponível.</p><div class="cast-grid">'+entries.map(e=>bySlug[e.slug]).join('')+html.slice(stop);
 fs.writeFileSync(catalog,html,'utf8');
 updateDirectory(root,entries,rank,fs,path,attr,esc);
 const script='('+runtime.toString()+')('+JSON.stringify(contentRank)+');';new vm.Script(script);
 fs.writeFileSync(path.join(root,'artistas','assets','portfolio-content-order.js'),script,'utf8');
 let pages=0;function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(f.name==='index.html'){let s=fs.readFileSync(p,'utf8');if(!/href=["'][^"']*\/artistas\/perfil\//i.test(s)||s.includes('/artistas/assets/portfolio-content-order.js'))continue;const i=s.toLowerCase().lastIndexOf('</body>');if(i<0)throw Error('Sem body '+p);s=s.slice(0,i)+'<script defer src="/artistas/assets/portfolio-content-order.js"></script>'+s.slice(i);fs.writeFileSync(p,s,'utf8');pages++}}}walk(root);
 console.log('EducART ordenação por acervo: '+entries.length+' perfis, '+(entries.length-cards.length)+' reintegrados no catálogo, '+pages+' páginas; sem foto: '+entries.filter(e=>!e.photos).length);
 console.log('EducART primeiros: '+entries.slice(0,6).map(e=>e.name+' ('+e.photos+' fotos/'+e.videos+' vídeos)').join(' | '));
 console.log('EducART prioridade de complementação: '+entries.filter(e=>!e.photos).map(e=>e.name).join(' | '));
})();


/* Houston: capas audiovisuais individuais, sem reutilizar retratos. */
(function buildVideoCovers(){
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const root=__dirname,profiles=path.join(root,'artistas','perfil'),dest=path.join(root,'artistas','assets','video-covers');
 fs.mkdirSync(dest,{recursive:true});
 const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'))?.slice(1).find(x=>x!==undefined)||'';
 const plain=s=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim();
 const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const palettes=[['#0c203a','#32658c','#f5ce8c'],['#261629','#903e58','#ffc69e'],['#112b29','#376f63','#f3d59b'],['#292038','#73559d','#f0d9ff'],['#342416','#9c6941','#ffdc9e'],['#142334','#405378','#e8caff']];
 const sources=new Set(),fallbacks=new Set();let reviewed=0,withVideo=0,cards=0,drive=0,youtube=0,editorial=0,replaced=0;
 for(const slug of fs.readdirSync(profiles).sort()){
  const file=path.join(profiles,slug,'index.html');if(!fs.existsSync(file))continue;reviewed++;
  let html=fs.readFileSync(file,'utf8'),n=0;
  const name=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||slug);
  // Nome editorial derivado exclusivamente da categoria já documentada, não do conteúdo presumido.
  const editorialTitle=t=>{
   const number=n=>String(Number(n)).padStart(2,'0');
   return t.replace(/^Gravação bruta\s+(\d+)$/i,(_,n)=>'Sessão de gravação · tomada '+number(n))
    .replace(/^Editado\s+(\d+)$/i,(_,n)=>'Registro audiovisual · edição '+number(n))
    .replace(/^Apresentação\s+(\d+)$/i,(_,n)=>'Apresentação pessoal · versão '+number(n))
    .replace(/^Selftape\s+(\d+)$/i,(_,n)=>'Interpretação para câmera · selftape '+number(n))
    .replace(/^Making of\s*·\s*(?:\d{2}\/\d{2}\/\d{4}\s*·\s*)?Registro\s+(\d+)$/i,(_,n)=>'Making of · bastidores '+number(n))
    .replace(/^Atuação com (.+?)\s+\d+$/i,(_,person)=>'Atuação com '+person)
    .replace(/^Vídeo sem título confirmado$/i,'Registro audiovisual · título da obra a confirmar');
  };
  html=html.replace(/<section\b[^>]*id=["']u-videos["'][^>]*>[\s\S]*?<\/section>/i,pane=>pane.replace(/<h3\b([^>]*)>([^<]*)<\/h3>/gi,(whole,attrs,t)=>'<h3'+attrs+'>'+editorialTitle(t)+'</h3>'));

  const blocks=/<div\b(?=[^>]*\bclass=["'][^"']*\b(?:u-video|poster|video)\b[^"']*["'])[^>]*>[\s\S]*?<\/div>/gi;
  const buttons=/<button\b[^>]*(?:data-drive|data-youtube|data-play-video)\s*=[^>]*>/gi;
  const expected=(html.match(buttons)||[]).length;
  html=html.replace(blocks,(block,offset,full)=>{
   const btn=block.match(buttons)?.[0];if(!btn)return block;
   const yt=attr(btn,'data-youtube')||attr(btn,'data-play-video'),gd=attr(btn,'data-drive');
   const isYT=/^[A-Za-z0-9_-]{11}$/.test(yt),isDrive=/^[A-Za-z0-9_-]{15,}$/.test(gd);
   const old=block.match(/<img\b[^>]*>/i)?.[0],oldSrc=attr(old||'','src');
   const heading=[...full.slice(Math.max(0,offset-3500),offset).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].pop()?.[1]||'';
   const title=(plain(heading)||(/apresenta/i.test(plain(block))?'Apresentação pessoal':'Registro audiovisual')).slice(0,90);
   const key=slug+'|'+(++n)+'|'+(isYT?yt:isDrive?gd:title);
   const hash=crypto.createHash('sha256').update(key).digest('hex'),id=slug+'-'+n+'-'+hash.slice(0,12);
   const fallback='/artistas/assets/video-covers/'+id+'.svg';
   if(fallbacks.has(fallback))throw Error('Capa editorial repetida '+id);fallbacks.add(fallback);
   const [dark,accent,gold]=palettes[parseInt(hash.slice(0,2),16)%palettes.length],x=160+parseInt(hash.slice(2,4),16)*2;
   const lines=[];let line='';for(const word of title.split(' ')){if(line&&(line+' '+word).length>30){lines.push(line);line=word}else line+=(line?' ':'')+word}if(line)lines.push(line);
   const label=/apresenta/i.test(title)?'APRESENTAÇÃO PESSOAL':/monólogo/i.test(title)?'MONÓLOGO':'ACERVO AUDIOVISUAL';
   const svg='<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="'+dark+'"/><stop offset="1" stop-color="'+accent+'"/></linearGradient><radialGradient id="l"><stop stop-color="'+gold+'" stop-opacity=".26"/><stop offset="1" stop-color="'+gold+'" stop-opacity="0"/></radialGradient></defs><rect width="960" height="540" fill="url(#b)"/><ellipse cx="'+x+'" cy="160" rx="500" ry="380" fill="url(#l)"/><g fill="none" stroke="'+gold+'" opacity=".24" stroke-width="2"><circle cx="'+(960-x)+'" cy="245" r="220"/><circle cx="'+(960-x)+'" cy="245" r="184"/><path d="M0 390L960 '+(250+parseInt(hash.slice(4,6),16))+'M0 430L960 360"/></g><rect x="24" y="24" width="912" height="492" rx="24" stroke="'+gold+'" stroke-opacity=".45" fill="none"/><g font-family="Arial,sans-serif"><text x="56" y="75" font-size="22" letter-spacing="3" fill="'+gold+'">EDUCART · '+label+'</text><text x="904" y="75" text-anchor="end" font-size="22" fill="'+gold+'">'+String(n).padStart(2,'0')+'</text>'+lines.slice(0,3).map((l,i)=>'<text x="56" y="'+(365+i*42)+'" fill="#fff8ec" font-size="36" font-weight="700">'+esc(l)+'</text>').join('')+'<text x="56" y="493" font-size="24" fill="'+gold+'">'+esc(name.slice(0,70))+'</text><text x="904" y="493" font-size="15" text-anchor="end" fill="'+gold+'">CAPA EDITORIAL</text></g></svg>';
   fs.writeFileSync(path.join(dest,id+'.svg'),svg,'utf8');
   // Capa editorial colorida é sempre a base; somente uma miniatura analisada poderá substituí-la.
   const candidate=isYT?'https://i.ytimg.com/vi/'+yt+'/hqdefault.jpg':isDrive?'https://drive.google.com/thumbnail?id='+gd+'&sz=w800':'';
   let src=fallback;
   if(isYT)youtube++;else if(isDrive)drive++;
   if(src===fallback)editorial++;
   if(sources.has(src))throw Error('Fonte de capa repetida '+src);sources.add(src);cards++;if(oldSrc.replace(/&amp;/g,'&')!==src)replaced++;
   const image='<img src="'+esc(src)+'" alt="'+esc('Capa de '+title+' — '+name)+'" loading="lazy" decoding="async" data-video-cover="'+esc(id)+'" data-cover-source="'+esc(candidate)+'" data-cover-fallback="'+fallback+'" onerror="this.onerror=null;this.src=this.dataset.coverFallback" onload="if(this.src!==new URL(this.dataset.coverFallback,location.href).href &amp;&amp; this.naturalWidth&lt;160){this.onerror=null;this.src=this.dataset.coverFallback}">';
   return old?block.replace(old,()=>image):block.replace(btn,()=>image+btn);
  });
  if(n!==expected)throw Error('Vídeo fora do padrão de capas '+slug+': '+n+'/'+expected);
  if(n){withVideo++;fs.writeFileSync(file,html,'utf8')}
 }
 if(reviewed!==52||cards<1||sources.size!==cards||fallbacks.size!==cards)throw Error('Auditoria de capas incompleta');
 console.log('EducART capas audiovisuais: '+reviewed+' perfis revisados; '+withVideo+' com vídeos; '+cards+' cartões; '+youtube+' YouTube; '+drive+' Drive; '+editorial+' editoriais diretas; '+replaced+' fontes alteradas; '+sources.size+' fontes únicas; '+fallbacks.size+' capas editoriais únicas; zero avatares como capa.');
})();


/* Garante o mesmo cabeçalho e navegação em todos os perfis publicados. */
(function verifyPortfolioStandard(){
 const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
 const dir=path.join(__dirname,'artistas','perfil'),css='/artistas/assets/portfolio-casting-v1.css',js='/artistas/assets/portfolio-casting-v1.js';
 new vm.Script(fs.readFileSync(path.join(__dirname,js.slice(1)),'utf8'));
 let count=0,added=0;
 for(const slug of fs.readdirSync(dir)){
  const file=path.join(dir,slug,'index.html');if(!fs.existsSync(file))continue;
  let h=fs.readFileSync(file,'utf8'),before=h;
  if(!h.includes(css))h=h.replace(/<\/head>/i,'<link rel="stylesheet" href="'+css+'"></head>');
  if(!h.includes(js))h=h.replace(/<\/body>/i,'<script defer src="'+js+'"></script></body>');
  if(!h.includes(css)||!h.includes(js))throw Error('Padrão de portfólio ausente: '+slug);
  if(h!==before){fs.writeFileSync(file,h,'utf8');added++}count++;
 }
 if(count!==52)throw Error('Quantidade de perfis inesperada: '+count);
 console.log('EducART padrão de portfólio: '+count+'/52 perfis com CSS e JS comuns; '+added+' inclusões; JavaScript válido.');
})();
