/* Social images follow the exact approved profile avatar. No invented portraits. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('../social-render/node_modules/sharp');
const {Resvg}=require('../social-render/node_modules/@resvg/resvg-js');
const root=__dirname,origin='https://educart.pro',profiles=path.join(root,'artistas','perfil'),dest=path.join(root,'og','artistas');
const fallback=origin+'/educart-whatsapp-og.jpg';
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'))?.slice(1).find(x=>x!==undefined)||'';
const esc=s=>String(s).replace(/&(?!(?:amp|quot|apos|lt|gt|#\\d+|#x[\\da-f]+);)/gi,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
async function source(url){
 const u=new URL(url);
 if(u.origin===origin){const file=path.resolve(root,'.'+decodeURIComponent(u.pathname));if(!file.startsWith(root+path.sep))throw Error('Invalid portrait path');return fs.readFileSync(file)}
 if(u.protocol!=='https:')throw Error('Invalid portrait protocol');
 const res=await fetch(u,{redirect:'follow',signal:AbortSignal.timeout(12000),headers:{accept:'image/*'}});
 if(!res.ok||!/^image\//i.test(res.headers.get('content-type')||''))throw Error('Image HTTP '+res.status);
 const raw=Buffer.from(await res.arrayBuffer());if(raw.length>20*1024*1024)throw Error('Portrait too large');return raw;
}
async function run(){
 fs.mkdirSync(dest,{recursive:true});
 const results=[];
 for(const slug of fs.readdirSync(profiles).sort()){
  const file=path.join(profiles,slug,'index.html');if(!fs.existsSync(file))continue;
  results.push({slug,file});
 }
 if(results.length!==52)throw Error('Expected 52 profiles');
 const output=await Promise.all(results.map(async ({slug,file})=>{
  const html=fs.readFileSync(file,'utf8'),head=html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i)?.[0];if(!head)throw Error('Missing head '+slug);
  const meta=(head.match(/<meta\b[^>]*>/gi)||[]).find(t=>attr(t,'property')==='og:image');
  const previous=decode(attr(meta||'','content'));
  if(!previous||previous===fallback)return {slug,kind:'no-portrait'};
  let data,kind='local';
  try{
   data=await source(previous);
   if(new URL(previous).origin!==origin)kind='remote';
   if(/\.svg(?:[?#]|$)/i.test(previous)||/^\s*<svg[\s>]/i.test(data.toString('utf8',0,300)))data=new Resvg(data,{fitTo:{mode:'width',value:600}}).render().asPng();
   const info=await sharp(data).metadata();
   if(!info.width||!info.height||Math.min(info.width,info.height)<100)throw Error('Invalid/small portrait');
   const jpeg=await sharp(data).rotate().resize(600,600,{fit:'cover',position:'centre'}).flatten({background:'#111c2d'}).jpeg({quality:88,mozjpeg:true}).toBuffer();
   const check=await sharp(jpeg).metadata();
   if(check.width!==600||check.height!==600||check.format!=='jpeg')throw Error('Invalid JPEG');
   const hash=crypto.createHash('sha256').update(jpeg).digest('hex').slice(0,12);
   const name=slug+'-'+hash+'.jpg',url=origin+'/og/artistas/'+name;
   fs.writeFileSync(path.join(dest,name),jpeg);
   let newHead=head.replace(/<meta\b[^>]*>/gi,t=>{const k=attr(t,'property')||attr(t,'name');return /^(?:og:image(?::.*)?|twitter:image(?::alt)?)$/i.test(k)?'':t});
   const title=decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]||slug).split(' | ')[0];
   const fields={'og:image':url,'og:image:secure_url':url,'og:image:type':'image/jpeg','og:image:width':'600','og:image:height':'600','og:image:alt':'Retrato de '+title};
   const tags=Object.entries(fields).map(([k,v])=>'<meta property="'+k+'" content="'+esc(v)+'">').join('\n')+'\n<meta name="twitter:image" content="'+esc(url)+'">\n';
   newHead=newHead.replace(/<\/head>/i,()=>tags+'</head>');
   const next=html.replace(head,()=>newHead);
   if(next.slice(next.indexOf('</head>'))!==html.slice(html.indexOf('</head>')))throw Error('Body changed '+slug);
   fs.writeFileSync(file,next);
   return {slug,kind,file:name,bytes:jpeg.length};
  }catch(e){
   if(new URL(previous).origin===origin)throw Error('Local portrait failed '+slug+': '+e.message);
   return {slug,kind:'remote-unavailable',reason:e.message};
  }
 }));
 for(const r of output)console.log('EducART OG artist: '+r.slug+' '+r.kind+(r.file?' '+r.file+' '+r.bytes+' bytes':r.reason?' '+r.reason:''));
 const converted=output.filter(r=>r.file).length,missing=output.filter(r=>r.kind==='no-portrait').length,remote=output.filter(r=>r.kind==='remote-unavailable').length;
 if(converted+missing+remote!==52)throw Error('Incomplete social portrait audit');
 console.log('EducART OG artist summary: '+converted+' JPEGs individuais; '+missing+' sem retrato; '+remote+' retratos externos indisponíveis; 52 perfis.');
}
module.exports=run;
