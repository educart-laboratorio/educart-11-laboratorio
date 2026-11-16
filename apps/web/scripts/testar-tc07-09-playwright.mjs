// TC-07/08/09: E2E visual e de navegação, sem autenticação nem qualquer escrita.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.TC0709_BASE_URL || 'http://127.0.0.1:3001';
const output = process.env.TC0709_ARTIFACTS || 'tc0709-artifacts';
const widths = [360,390,768,1440];
await fs.mkdir(output, { recursive: true });
const browser=await chromium.launch({headless:true});
const results=[];

async function medir(page) {
  return page.evaluate(() => {
    const bg=document.querySelector('.eg-backdrop');
    const root=document.querySelector('.eg-root');
    const stage=document.querySelector('[data-educart-etapa]');
    if(!bg||!root||!stage)throw new Error('Ausencia de elementos da triagem');
    const r=bg.getBoundingClientRect();
    const controls=[
      document.querySelector('.a11y-floating-trigger'),
      document.querySelector('.educart-whatsapp-persistente')
    ].filter(Boolean).map(el=>el.getBoundingClientRect());
    const candidates=Array.from(document.querySelectorAll('.eg-choice,.eg-area-on,.eg-plain,.eg-tap'))
      .filter(el=>!el.hasAttribute('disabled')).map(el=>({
        text:(el.textContent||'').trim().slice(0,45),
        rect:el.getBoundingClientRect()
      })).filter(b=>b.rect.bottom>0&&b.rect.top<window.innerHeight);
    const overlaps=[];
    for(const b of candidates) for(const control of controls){
      const area = Math.max(0,Math.min(b.rect.right,control.right)-Math.max(b.rect.left,control.left)) *
                   Math.max(0,Math.min(b.rect.bottom,control.bottom)-Math.max(b.rect.top,control.top));
      if(area>1)overlaps.push({label:b.text,area});
    }
    return {
      etapa:stage.getAttribute('data-educart-etapa'),
      backgroundPosition:getComputedStyle(bg).position,
      backgroundImage:getComputedStyle(bg).backgroundImage,
      viewport:{width:window.innerWidth,height:window.innerHeight},
      backdrop:{top:r.top,left:r.left,width:r.width,height:r.height},
      overlaps,
      scrollWidth:document.documentElement.scrollWidth,
    };
  });
}
async function registrar(page,width,step){
  await page.locator('[data-educart-etapa="'+step+'"]').waitFor();
  const m=await medir(page);
  assert.equal(m.backgroundPosition,'fixed','fundo deve ser fixo ao viewport');
  assert(Math.abs(m.backdrop.top)<2 && Math.abs(m.backdrop.left)<2,'fundo deslocou do viewport');
  assert(Math.abs(m.backdrop.width-width)<3,'fundo alterou enquadramento');
  assert(Math.abs(m.backdrop.height-800)<3,'fundo alterou altura');
  assert.equal(m.overlaps.length,0,'botoes cobertos pelo flutuante: '+JSON.stringify(m.overlaps));
  assert(m.scrollWidth<=width+1,'overflow horizontal acima de 1px');
  await page.screenshot({path:path.join(output,'triagem-'+width+'-'+step+'.png')});
  results.push({width,step,passed:true,metrics:m});
}
try {
  for(const width of widths){
    const context=await browser.newContext({viewport:{width,height:800}});
    await context.route(/https:\/\/[^/]+\.supabase\.co\/.*/,route=>route.abort('blockedbyclient'));
    const page=await context.newPage();
    try{
      const res=await page.goto(base+'/',{waitUntil:'domcontentloaded'});
      assert.equal(res?.status(),200);
      await registrar(page,width,'abertura');
      await page.getByRole('button',{name:/Toque para começar/}).click();
      await registrar(page,width,'interesses');
      await page.locator('.eg-area-on').click();
      await registrar(page,width,'objetivo');
      await page.locator('.eg-choice').filter({hasText:'Atuação profissional'}).click();
      await registrar(page,width,'idade');
      await page.locator('.eg-choice').filter({hasText:'14 a 17 anos'}).click();
      await registrar(page,width,'experiencia');

      const demo=await page.goto(base+'/niveis-demo',{waitUntil:'domcontentloaded'});
      assert.equal(demo?.status(),200);
      assert.equal(await page.locator('a[href="/matricula-demo"]').count(),0,
        'CTA publico ainda aponta a rota inexistente');
      await page.locator('.lv-tier-card').nth(2).click();
      assert.match(await page.locator('.lv-detail h3').innerText(),/Avançado/);
      await page.getByRole('button',{name:/Conhecer o perfil inicial/}).click();
      await page.waitForFunction(() => document.querySelector('.lv-detail h3')?.textContent?.includes('Iniciante'));
      assert.match(await page.locator('.lv-detail h3').innerText(),/Iniciante/);
      results.push({width,step:'navegacao-iniciante',passed:true});
      await page.screenshot({path:path.join(output,'perfis-'+width+'.png')});
      console.log(JSON.stringify({width,passed:true,steps:6}));
    } catch(e) {
      await page.screenshot({path:path.join(output,'erro-'+width+'.png')}).catch(()=>{});
      results.push({width,passed:false,error:String(e)});
      console.error(JSON.stringify(results.at(-1)));
    } finally {await context.close();}
  }
}finally{
  await browser.close();
  await fs.writeFile(path.join(output,'relatorio.json'),JSON.stringify({realWrites:0,results},null,2));
}
assert(results.every(r=>r.passed),'TC07/08/09 reprovado: ver relatorio e screenshots');
assert.equal(results.length,24,'Esperados cinco estados e uma navegacao por largura');
console.log('TC07/08/09 PASS: 24 verificacoes, 4 viewports, zero escrita.');
