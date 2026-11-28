/* Houston: verifica miniaturas reais antes de publicar; capas editoriais são o padrão seguro. */
const fs=require('node:fs'),path=require('node:path'),sharp=require('../social-render/node_modules/sharp');
const root=__dirname,profiles=path.join(root,'artistas','perfil');
const attr=(tag,key)=>tag.match(new RegExp('\\b'+key+'="([^"]*)"','i'))?.[1]||'';
const decode=s=>s.replace(/&amp;/g,'&');
async function inspect(url){
 try{
  const r=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(4500),headers:{accept:'image/*'}});
  if(!r.ok||!/^image\//i.test(r.headers.get('content-type')||''))return null;
  const bytes=Buffer.from(await r.arrayBuffer());if(bytes.length>5*1024*1024)return null;
  const m=await sharp(bytes).metadata();if((m.width||0)<160||(m.height||0)<90)return null;
  const pix=await sharp(bytes).rotate().resize(96,54,{fit:'inside'}).removeAlpha().toColourspace('srgb').raw().toBuffer();
  let sum=0,sq=0,dark=0,bright=0;for(let i=0;i<pix.length;i+=3){const y=.2126*pix[i]+.7152*pix[i+1]+.0722*pix[i+2];sum+=y;sq+=y*y;if(y<24)dark++;if(y>235)bright++}
  const n=pix.length/3,mean=sum/n,sd=Math.sqrt(Math.max(0,sq/n-mean*mean));
  if(mean<36||sd<17||dark/n>.72||bright/n>.85)return null;
  return await sharp(bytes).rotate().resize(800,450,{fit:'contain',background:'#233b55',withoutEnlargement:true}).jpeg({quality:85}).toBuffer();
 }catch{return null}
}
module.exports=async function(){
 const pages=[],jobs=[],cache=new Map();
 for(const slug of fs.readdirSync(profiles)){const file=path.join(profiles,slug,'index.html');if(!fs.existsSync(file))continue;const html=fs.readFileSync(file,'utf8');const tags=(html.match(/<img\b[^>]*data-cover-source="[^"]+"[^>]*>/gi)||[]);const page={file,html,changes:[]};pages.push(page);
 for(const tag of tags){const url=decode(attr(tag,'data-cover-source')),fallback=attr(tag,'data-cover-fallback');if(!/^https:\/\/(?:drive\.google\.com\/thumbnail|i\.ytimg\.com\/vi\/)/.test(url)||!fallback.startsWith('/artistas/assets/video-covers/'))continue;jobs.push({page,tag,url,fallback})}}
 let cursor=0,approved=0,editorial=0;
 await Promise.all(Array.from({length:16},async()=>{while(cursor<jobs.length){const j=jobs[cursor++];if(!cache.has(j.url))cache.set(j.url,inspect(j.url));const image=await cache.get(j.url);if(!image){editorial++;continue}const dst=j.fallback.replace(/\.svg$/,'.jpg');fs.writeFileSync(path.join(root,dst.slice(1)),image);j.page.changes.push([j.tag,j.tag.replace(/\bsrc="[^"]*"/,'src="'+dst+'"')]);approved++}}));
 for(const p of pages){if(!p.changes.length)continue;let html=p.html;for(const [a,b] of p.changes)html=html.replace(a,()=>b);fs.writeFileSync(p.file,html,'utf8')}
 const expFile=path.join(root,'escola','experiencias-formativas','index.html');
 let exp=fs.readFileSync(expFile,'utf8'),real=0,covers=0;
 const tags=(exp.match(/<img\b[^>]*>/gi)||[]).filter(t=>t.includes('data-experience-source')||((t.includes('alt="Registro da experiência"')||t.includes('alt=""'))&&t.includes('drive.google.com/thumbnail')));
 const dir=path.join(root,'escola','experiencias-formativas','media');fs.mkdirSync(dir,{recursive:true});
 const results=await Promise.all(tags.map(async tag=>{const video=tag.includes('data-experience-source'),url=decode(attr(tag,video?'data-experience-source':'src'));const id=new URL(url).searchParams.get('id');if(!/^[A-Za-z0-9_-]+$/.test(id||''))return null;if(!cache.has(url))cache.set(url,inspect(url));const bytes=await cache.get(url);if(!bytes)return null;const filename=(video?'video-':'foto-')+id+'.jpg';fs.writeFileSync(path.join(dir,filename),bytes);return {tag,video,replacement:video?tag.replace(' hidden','').replace('/>',' src="/escola/experiencias-formativas/media/'+filename+'"/>'):tag.replace(/src="[^"]*"/,'src="/escola/experiencias-formativas/media/'+filename+'"')}}));
 for(const r of results){if(!r)continue;exp=exp.replace(r.tag,()=>r.replacement);if(r.video)real++;else covers++}
 fs.writeFileSync(expFile,exp,'utf8');console.log('Experiências: '+real+'/28 miniaturas reais; '+covers+'/8 capas fotográficas verificadas por luminosidade e contraste.');
 if(approved+editorial!==jobs.length)throw Error('Auditoria de miniaturas incompleta');
 console.log('EducART miniaturas: '+approved+' imagens do próprio vídeo aprovadas em luminosidade/contraste; '+editorial+' capas editoriais seguras; '+jobs.length+' fontes avaliadas. Conteúdo visual não certificado semanticamente.');
};