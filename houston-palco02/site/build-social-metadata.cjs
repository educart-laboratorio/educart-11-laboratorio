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
function processPage(f){const rel=path.relative(root,f).split(path.sep).join('/'), url=origin+'/'+rel.replace(/index\.html$/,'');let html=fs.readFileSync(f,'utf8');const head=html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0];if(!head||!/<\/html>(?:\s*<script\b[^>]*\bsrc="https:\/\/vercel\.live\/_next-live\/feedback\/feedback\.js"[^>]*><\/script>)*\s*$/i.test(html))throw Error('Invalid HTML '+rel);const title=head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();if(!title)throw Error('No title '+rel);
const ms=head.match(/<meta\b[^>]*>/gi)||[], get=(key)=>ms.find(m=>(attr(m,'property')||attr(m,'name')||'').toLowerCase()===key), value=k=>attr(get(k)||'','content');
const desc=value('og:description')||value('description')||title+' — acervo e portfólio da EducART.';
const body=html.slice(html.search(/<body\b/i));let image=null;
if(/^artistas\/perfil\/[^/]+\/index\.html$/.test(rel)){const blocks=body.match(/<(?:div|span|figure)\b[^>]*class=["'][^"']*\b(?:portrait|avatar|profile-avatar|profile-photo)\b[^"']*["'][^>]*>\s*<img\b[^>]*>/gi)||[];for(const b of blocks){image=usable(attr(tags(b)[0]||'','src'),url);if(image)break}if(image)portraits++;}
else if(/^espetaculos\/[^/]+\/index\.html$/.test(rel)){const blocks=body.match(/<(?:section|div)\b[^>]*class=["'][^"']*\b(?:hero|community-cover|video)\b[^"']*["'][^>]*>[\s\S]{0,500}?<img\b[^>]*>/gi)||[];image=usable(value('og:image'),url);for(const b of blocks){if(image)break;image=usable(attr(tags(b)[0]||'','src'),url)}}
else if(/\/(?:galeria|acervo)\/index\.html$/.test(rel)){for(const tag of tags(body)){image=usable(attr(tag,'src'),url);if(image)break}}
if(!image){image=origin+fallback;institutional++}
const pairs={'og:type':'website','og:locale':'pt_BR','og:site_name':'EducART','og:title':title,'og:description':desc,'og:url':url,'og:image':image};
let h=head.replace(/<meta\b[^>]*>/gi,m=>{const k=(attr(m,'property')||attr(m,'name')||'').toLowerCase();return k.startsWith('og:')||k==='twitter:card'||k==='twitter:title'||k==='twitter:description'||k==='twitter:image'?'':m});
h=h.replace(/<\/head>/i,Object.entries(pairs).map(([k,v])=>'<meta property="'+k+'" content="'+esc(v)+'">').join('\n')+'\n<meta name="twitter:card" content="summary_large_image">\n</head>');
const out=html.replace(head,()=>h);if(out.slice(out.search(/<body\b/i))!==body)throw Error('Body changed '+rel);fs.writeFileSync(f,out,'utf8');count++;
}
walk(root);console.log('Houston social metadata: '+count+' pages, '+portraits+' artist portraits, '+institutional+' institutional covers');if(count<70)throw Error('Incomplete Houston package');
