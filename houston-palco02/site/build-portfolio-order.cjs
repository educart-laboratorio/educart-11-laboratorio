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
 for(const p of parents){const items=[...p.children].map(n=>({n,s:slugs(n)})).filter(x=>x.s.length===1),sorted=items.slice().sort((a,b)=>rank[a.s[0]]-rank[b.s[0]]);if(items.every((x,i)=>x.n===sorted[i].n))continue;const slots=items.map(x=>{const m=document.createComment("educart-order");x.n.before(m);x.n.remove();return m});slots.forEach((m,i)=>m.replaceWith(sorted[i].n))}
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
 for(const slug of fs.readdirSync(dir).sort()){
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
 if(!entries.length)throw Error('Nenhum perfil encontrado');
 const rank=Object.fromEntries(entries.map((e,i)=>[e.slug,i]));
 const catalog=path.join(root,'artistas','todos','index.html');let html=fs.readFileSync(catalog,'utf8');
 const h='<h2>Artistas com monólogo</h2><div class="cast-grid">',split='</div></div><div class="section"><h2>Outros artistas</h2><div class="cast-grid">',end='</div></div></main>';
 const start=html.indexOf(h),mid=html.indexOf(split,start),stop=html.indexOf(end,mid+split.length);
 if(start<0||mid<0||stop<0)throw Error('Estrutura do catálogo mudou; ordenação interrompida');
 const original=html.slice(start+h.length,mid)+html.slice(mid+split.length,stop),re=/<a\b[^>]*data-artist-card[^>]*>[\s\S]*?<\/a>/gi,cards=original.match(re)||[];
 if(original.replace(re,'').trim())throw Error('Conteúdo não identificado entre cartões');
 const seen=new Set(),bySlug=Object.fromEntries(cards.map(card=>{const slug=attr(card.match(/<a\b[^>]*>/i)[0],'href').match(/\/artistas\/perfil\/([^/]+)\//)?.[1];if(!slug||seen.has(slug)||!(slug in rank))throw Error('Cartão sem perfil único: '+slug);seen.add(slug);return [slug,card]}));
 for(const e of entries)if(!bySlug[e.slug]){
  const initials=e.name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase(),avatar=e.avatar?'<img src="'+esc(e.avatar)+'" alt="Registro do acervo de '+esc(e.name)+'" loading="lazy">':esc(initials);
  bySlug[e.slug]='<a class="cast" data-artist-card="'+esc(e.name)+'" data-cast-entry="'+(e.videos?'monologo':'inicial')+'" href="/artistas/perfil/'+esc(e.slug)+'/" title="Abrir perfil de '+esc(e.name)+'"><span class="avatar">'+avatar+'</span><span><strong>'+esc(e.name)+'</strong><small>Ver perfil ↗</small></span></a>';
 }
 html=html.slice(0,start)+'<h2>Todos os artistas</h2><p class="lead">Perfis organizados pela quantidade e variedade do acervo disponível.</p><div class="cast-grid">'+entries.map(e=>bySlug[e.slug]).join('')+html.slice(stop);
 fs.writeFileSync(catalog,html,'utf8');
 const script='('+runtime.toString()+')('+JSON.stringify(rank)+');';new vm.Script(script);
 fs.writeFileSync(path.join(root,'artistas','assets','portfolio-content-order.js'),script,'utf8');
 let pages=0;function walk(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory())walk(p);else if(f.name==='index.html'){let s=fs.readFileSync(p,'utf8');if(!/href=["'][^"']*\/artistas\/perfil\//i.test(s)||s.includes('/artistas/assets/portfolio-content-order.js'))continue;const i=s.toLowerCase().lastIndexOf('</body>');if(i<0)throw Error('Sem body '+p);s=s.slice(0,i)+'<script defer src="/artistas/assets/portfolio-content-order.js"></script>'+s.slice(i);fs.writeFileSync(p,s,'utf8');pages++}}}walk(root);
 console.log('EducART ordenação por acervo: '+entries.length+' perfis, '+(entries.length-cards.length)+' reintegrados no catálogo, '+pages+' páginas; sem foto: '+entries.filter(e=>!e.photos).length);
 console.log('EducART primeiros: '+entries.slice(0,6).map(e=>e.name+' ('+e.photos+' fotos/'+e.videos+' vídeos)').join(' | '));
 console.log('EducART prioridade de complementação: '+entries.filter(e=>!e.photos).map(e=>e.name).join(' | '));
})();
