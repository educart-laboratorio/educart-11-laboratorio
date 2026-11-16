import assert from 'node:assert/strict';
const base=process.env.TC13_BASE_URL||'http://127.0.0.1:3001';
async function get(route, redirect='follow'){
  const res=await fetch(base+route,{redirect,signal:AbortSignal.timeout(12000)});
  const body=await res.text();
  console.log(JSON.stringify({route,status:res.status,location:res.headers.get('location'),length:body.length}));
  return {res,body};
}
const site=await get('/sitemap.xml');
assert.equal(site.res.status,200);
assert.match(site.body,/https:\/\/educart\.pro\/formacao/);
assert.match(site.body,/https:\/\/educart\.pro\/inscricao/);
assert.doesNotMatch(site.body,/\/admin\b|\/minha-educart\b|\/niveis-demo\b/);
const robot=await get('/robots.txt');
assert.equal(robot.res.status,200);
assert.match(robot.body,/Disallow: \/admin/);
assert.match(robot.body,/Disallow: \/minha-educart/);
assert.match(robot.body,/Sitemap: https:\/\/educart\.pro\/sitemap\.xml/);
const fav=await get('/favicon.ico','manual');
assert.equal(fav.res.status,307);
assert.equal(new URL(fav.res.headers.get('location'),base).pathname,'/images/oficina-atores-simbolo.svg');
const icon=await get('/images/oficina-atores-simbolo.svg');
assert.equal(icon.res.status,200);
assert.match(icon.body,/<svg[\s>]/);
for(const route of ['/minha-educart/login','/niveis-demo']){
  const {res,body}=await get(route);
  assert.equal(res.status,200);
  assert.match(body,/noindex/i,'Rota privada/experimental indexavel: '+route);
}
const {res:formation,body:formationHtml}=await get('/formacao');
assert.equal(formation.status,200);
assert.match(formationHtml,/<link[^>]+rel="canonical"[^>]*href="https:\/\/educart\.pro\/formacao"/i);
console.log('TC13 PASS: sitemap, robots, favicon, login noindex, canonical.');
