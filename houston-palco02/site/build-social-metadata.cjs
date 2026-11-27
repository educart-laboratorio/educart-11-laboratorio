// Generate server-readable social metadata for the full Houston static package.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname, origin='https://educart.pro', fallback='/educart-whatsapp-og.jpg';
if(!fs.existsSync(path.join(root,fallback.slice(1))))throw Error('Missing institutional social cover');
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'))?.slice(1).find(x=>x!==undefined);
const esc=s=>String(s).replace(/&(?!(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);)/gi,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const tags=s=>s.match(/<img\b[^>]*>/gi)||[];
function usable(src,url){if(!src||/^data:/i.test(src))return null;try{const u=new URL(src.replace(/&amp;/g,'&'),url);if(u.protocol!=='https:')return null;if(u.origin===origin&&!fs.existsSync(path.join(root,decodeURIComponent(u.pathname).replace(/^\/+/,''))))return null;return u.href}catch{return null}}
let count=0,portraits=0,institutional=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(e.name==='index.html')processPage(f)}}
function processPage(f){const rel=path.relative(root,f).split(path.sep).join('/'), url=origin+'/'+rel.replace(/index\.html$/,'');let html=fs.readFileSync(f,'utf8');const head=html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0];if(!head||!/<\/html>(?:\s*<script\b[^>]*\bsrc="https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js"[^>]*><\/script>)*\s*$/i.test(html))throw Error('Invalid HTML '+rel);const brand=s=>String(s).replace(/\beducart\b/gi,m=>m===m.toLowerCase()?m:'EducART');const title=brand(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim()||'');if(!title)throw Error('No title '+rel);
const ms=head.match(/<meta\b[^>]*>/gi)||[], get=(key)=>ms.find(m=>(attr(m,'property')||attr(m,'name')||'').toLowerCase()===key), value=k=>attr(get(k)||'','content');
const desc=brand(value('og:description')||value('description')||title+' — acervo e portfólio da EducART.');
const body=html.slice(html.search(/<body\b/i));let image=null;
if(/^artistas\/perfil\/[^/]+\/index\.html$/.test(rel)){const blocks=body.match(/<(?:div|span|figure)\b[^>]*class=["'][^"']*\b(?:portrait|avatar|profile-avatar|profile-photo)\b[^"']*["'][^>]*>\s*<img\b[^>]*>/gi)||[];for(const b of blocks){image=usable(attr(tags(b)[0]||'','src'),url);if(image)break}if(image)portraits++;}
else if(/^oportunidades\/[^/]+\/index\.html$/.test(rel)){image=usable(value('og:image'),url);if(!image||image===origin+fallback)throw Error('Missing opportunity social cover '+rel)}
else if(/^espetaculos\/[^/]+\/index\.html$/.test(rel)){const blocks=body.match(/<(?:section|div)\b[^>]*class=["'][^"']*\b(?:hero|community-cover|video)\b[^"']*["'][^>]*>[\s\S]{0,500}?<img\b[^>]*>/gi)||[];image=usable(value('og:image'),url);for(const b of blocks){if(image)break;image=usable(attr(tags(b)[0]||'','src'),url)}}
else if(/\/(?:galeria|acervo)\/index\.html$/.test(rel)){for(const tag of tags(body)){image=usable(attr(tag,'src'),url);if(image)break}}
if(rel==='espetaculos/o-homem-ajuda-o-homem/index.html')image=usable('/espetaculos/o-homem-ajuda-o-homem/media/cena/DAN_2599.webp',url)||image;
if(!image){image=origin+fallback;institutional++}
const pairs={'og:type':'website','og:locale':'pt_BR','og:site_name':'EducART','og:title':title,'og:description':desc,'og:url':url,'og:image':image};
let h=head.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i,()=>'<title>'+title+'</title>').replace(/<meta\b[^>]*>/gi,m=>{const k=(attr(m,'property')||attr(m,'name')||'').toLowerCase();return k.startsWith('og:')||k==='twitter:card'||k==='twitter:title'||k==='twitter:description'||k==='twitter:image'?'':k==='description'?'<meta name="description" content="'+esc(brand(attr(m,'content')||''))+'">':m});
if(/^oportunidades\/[^/]+\/index\.html$/.test(rel)){pairs['og:image:width']='1200';pairs['og:image:height']='630';pairs['og:image:type']='image/png';pairs['og:image:alt']='Oportunidades EducART — casting '+title.split(' | ')[0];}
h=h.replace(/<\/head>/i,Object.entries(pairs).map(([k,v])=>'<meta property="'+k+'" content="'+esc(v)+'">').join('\n')+'\n<meta name="twitter:card" content="summary_large_image">\n</head>');
const out=html.replace(head,()=>h);if(out.slice(out.search(/<body\b/i))!==body)throw Error('Body changed '+rel);let publicHtml=out.replace(/<div class="proof">\s*Ficha editorial\s*·\s*NÃO PUBLICADA\s*<\/div>/gi,'');
// A barra pública é compartilhada por todas as páginas; remove somente docks legados de navegação rápida.
publicHtml=publicHtml.replace(/<nav\b(?=[^>]*\bclass=["']dock["'])(?=[^>]*\baria-label=["']Navegação rápida["'])[^>]*>[\s\S]*?<\/nav>/gi,'');
if(!/<script\b[^>]*\bsrc=["']\/educart-navigation-v23-1\.js["']/i.test(publicHtml)){
  const bodyEnd=publicHtml.toLowerCase().lastIndexOf('</body>');
  if(bodyEnd<0)throw Error('Missing body for Houston navigation '+rel);
  publicHtml=publicHtml.slice(0,bodyEnd)+'<script defer src="/educart-navigation-v23-1.js"></script>'+publicHtml.slice(bodyEnd);
}
fs.writeFileSync(f,publicHtml,'utf8');count++;
}
// Catálogo público reduzido por decisão da direção: preserve apenas a formação adicional autorizada.
// Candidata isolada: aplica alterações pontuais ao HTML integral no build.
function applyCorpoetico(html){
 const replace=(before,after)=>{if(html.split(before).length!==2)throw Error("Unexpected Houston source: "+before.slice(0,100));html=html.replace(before,()=>after);};
 const match=html.match(/const items=(\[[^\r\n]+\]);/);
 if(!match)throw Error("Catalogue missing");
 const items=JSON.parse(match[1]);if(items.length!==1||items[0].id!=="SOL-032"||!items[0].waitlist)throw Error("Unexpected original catalogue");
 const aline={id:"CORPOETICO",title:"Corpoético",category:0,format:"CONFIRMADA",summary:"Caminhos para uma Atuação Essencial. Com Aline Nepomuceno, atriz, diretora e arte-educadora. Uma vivência de investigação do corpo, da presença cênica e da criação poética, em diálogo com a referência de Jerzy Grotowski.",photo:"aline-nepomuceno-retrato",confirmed:true,waitlist:false};
 replace(match[0],"const items="+JSON.stringify([aline,...items])+";");
 replace("Dramaturgia, interpretação e construção cênica',icon:","Corpo, dramaturgia, interpretação e construção cênica',icon:");
 replace("const photo=id=>id==='fernando-santana-retrato'?", "const photo=id=>id==='aline-nepomuceno-retrato'?(Array.from(document.querySelectorAll('.conhecaPerson')).find(e=>e.querySelector('h3')?.textContent.trim()==='Aline Nepomuceno')?.querySelector('img.conhecaFace')?.getAttribute('src')||''):id==='fernando-santana-retrato'?");
 replace("return whatsappLink(item.waitlist?", "return whatsappLink(item.confirmed?'Olá, EducART! Gostaria de informações sobre Corpoético, com Aline Nepomuceno, em 13 de dezembro, na Casa Gameleira.':item.waitlist?");
 replace('<strong>1 formação adicional</strong><small>Da Palavra à Atuação · fila de espera</small>','<strong>2 formações adicionais</strong><small>Corpoético · 13/12 · Da Palavra à Atuação · fila de espera</small>');
 replace('aria-label="Formações em planejamento" class="block"><div class="blockHeader"><h3><span class="bullet dim"></span> Formações em planejamento</h3><small>FILA DE INTERESSE · GRATUITA</small>','aria-label="Formações adicionais" class="block"><div class="blockHeader"><h3><span class="bullet dim"></span> Formações adicionais</h3><small>CONFIRMADA E FILA DE ESPERA</small>');
 replace('item.waitlist?"Fila de espera":"Em planejamento"','item.confirmed?"Confirmada · 13/12":item.waitlist?"Fila de espera":"Em planejamento"');
 replace('item.waitlist?"FILA DE ESPERA":"EM PLANEJAMENTO"','item.confirmed?"CONFIRMADA · 13/12":item.waitlist?"FILA DE ESPERA":"EM PLANEJAMENTO"');
 replace('<span>FORMAÇÃO PROPOSTA</span><span>${item.waitlist?', '<span>${item.confirmed?"FORMAÇÃO CONFIRMADA":"FORMAÇÃO PROPOSTA"}</span><span>${item.waitlist?');
 replace('item.waitlist?"Domingos · 9h às 13h · 4h por encontro":prices[item.format].label','item.confirmed?"Domingo · 8h às 13h":item.waitlist?"Domingos · 9h às 13h · 4h por encontro":prices[item.format].label');
 replace('<span>Sem data definida</span></div>${item.waitlist?"":', '<span>${item.confirmed?"13/12/2026 · Casa Gameleira":"Sem data definida"}</span></div>${item.waitlist||item.confirmed?"":');
 replace('item.waitlist?"Quero entrar na fila de espera":"Tenho interesse"','item.confirmed?"Ver detalhes":item.waitlist?"Quero entrar na fila de espera":"Tenho interesse"');
 replace("item.id+(item.waitlist?' · FILA DE ESPERA':' · FORMAÇÃO ADICIONAL EM PLANEJAMENTO');","item.id+(item.confirmed?' · CONFIRMADA · 13/12':item.waitlist?' · FILA DE ESPERA':' · FORMAÇÃO ADICIONAL EM PLANEJAMENTO');");
 replace("  if(item.waitlist){content.querySelector('.stageNote')", "  if(item.confirmed){content.querySelector('.stageNote').textContent='13 de dezembro de 2026 · domingo · 8h às 13h · Casa Gameleira. Valores e inscrições ainda não divulgados.';content.querySelector('#openLead').textContent='Consultar informações';content.querySelector('.educart-wa-hint').textContent='Contato informativo; sem matrícula ou pagamento nesta prévia.';}\n  if(item.waitlist){content.querySelector('.stageNote')");
 replace('Da Palavra à Atuação está em fila de espera. Consulte a equipe EducART sobre programação e disponibilidade.','Corpoético · 13 de dezembro, com Aline Nepomuceno. Da Palavra à Atuação · fila de espera, com Fernando Santana.');
 replace("else if(item.waitlist)coverLayer.append","else if(item.confirmed)coverLayer.append(node('span','ha-tile-recommend','CONFIRMADA · 13/12'));\n  else if(item.waitlist)coverLayer.append");
 replace("mainCourse?'CURSO FORMADOR · 4 SEMESTRES':item.waitlist?", "mainCourse?'CURSO FORMADOR · 4 SEMESTRES':item.confirmed?'13/12 · 8H ÀS 13H':item.waitlist?");
 replace("item.id+(item.waitlist?' · FILA DE ESPERA':' · FORMAÇÃO ADICIONAL EM PLANEJAMENTO')));","item.id+(item.confirmed?' · CONFIRMADA · 13/12':item.waitlist?' · FILA DE ESPERA':' · FORMAÇÃO ADICIONAL EM PLANEJAMENTO')));");
 replace("': item.waitlist?'Professor Fernando Santana","': item.confirmed?'Aline Nepomuceno · domingo, 13 de dezembro de 2026, das 8h às 13h · Casa Gameleira. Valores e inscrições ainda não divulgados.':item.waitlist?'Professor Fernando Santana");
 replace("  summary.append(note);\n  if(!mainCourse",`  summary.append(note);
  if(!mainCourse && item.confirmed){
    const program=node('section','');
    program.append(node('h4','','Programação proposta'));
    [['8h – 8h30','Acolhimento'],['8h30 – 9h','O corpo que chega'],['9h – 9h50','O corpo que se revela'],['9h50 – 10h05','Intervalo'],['10h05 – 10h55','O corpo que encontra'],['10h55 – 11h40','O corpo que cria'],['11h40 – 12h30','Carta Para o Corpo'],['12h30 – 13h','Convivência e despedida']].forEach(([time,title])=>program.append(node('p','',time+' · '+title)));
    program.append(node('p','ha-v95-detail-note','Programação pedagógica proposta, sujeita à validação final da formadora.'));summary.append(program);
  }
  if(!mainCourse`);
 replace("item.waitlist?'Quero entrar na fila de espera':'Quero participar desta formação'","item.confirmed?'Consultar informações':item.waitlist?'Quero entrar na fila de espera':'Quero participar desta formação'");
 replace("Conheça Da Palavra à Atuação, com Fernando Santana. A formação está em fila de espera, com início a definir.","Conheça Corpoético, com Aline Nepomuceno, em 13 de dezembro, e Da Palavra à Atuação, com Fernando Santana, em fila de espera.");
 replace("el('span','ht-pill','1 formação')","el('span','ht-pill','2 formações')");
 replace("grid.setAttribute('aria-label','1 Formação Adicional')","grid.setAttribute('aria-label','2 Formações Adicionais')");
 replace("item.waitlist?'Entrar na fila de espera':'Tenho interesse'","item.confirmed?'Consultar informações':item.waitlist?'Entrar na fila de espera':'Tenho interesse'");
 return html;
}
const catalogPath=path.join(root,'educart-base.html');
const catalogHtml=applyCorpoetico(fs.readFileSync(catalogPath,'utf8'));
const additional=JSON.parse(catalogHtml.match(/const items=(\[[^\r\n]+\]);/)[1]);
if(additional.length!==2||additional[0].id!=='CORPOETICO'||!additional[0].confirmed||additional[1].id!=='SOL-032'||!additional[1].waitlist)throw Error('Unexpected unified catalogue');
fs.writeFileSync(catalogPath,catalogHtml,'utf8');
new (require('node:vm').Script)(fs.readFileSync(path.join(root,'educart-navigation-v23-1.js'),'utf8'));walk(root);console.log('Houston social metadata: '+count+' pages, '+portraits+' artist portraits, '+institutional+' institutional covers');if(count<70)throw Error('Incomplete Houston package');
