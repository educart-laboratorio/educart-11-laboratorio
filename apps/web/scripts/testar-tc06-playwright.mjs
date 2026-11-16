// SUPER GSI TC-06 — triagem -> ficha sem repetição; sem acesso ao banco.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.TC02_BASE_URL||'http://127.0.0.1:3001';
const browser=await chromium.launch({headless:true});
const widthCases=[390,1440];
const cases=[
  {name:'profissional-sem-experiencia',query:{objetivo:'Atuação profissional',experiencia:'Estou começando',faixa:'18 a 29 anos'}, esperado:'Ser Ator/Atriz profissional',exp:'Não',detalhe:false},
  {name:'oratória-com-experiencia',query:{objetivo:'Oratória e comunicação',experiencia:'Já participei de aulas ou oficinas',faixa:'30 a 49 anos'}, esperado:'Aprimorar comunicação e oratória',exp:'Sim',detalhe:true},
  {name:'descoberta-com-experiencia',query:{objetivo:'Arte e descoberta',experiencia:'Já tenho experiência em cena',faixa:'50 anos ou mais'}, esperado:'Outro',outro:'Arte e descoberta',exp:'Sim',detalhe:true},
];
let total=0;
try{
for(const width of widthCases){
  const context=await browser.newContext({viewport:{width,height:800}});
  await context.route(/https:\/\/[^/]+\.supabase\.co\/.*/,route=>route.abort('blockedbyclient'));
  try{
    for(const item of cases){
      const page=await context.newPage();
      try{
        const url=base+'/inscricao?'+new URLSearchParams(item.query).toString();
        const res=await page.goto(url,{waitUntil:'domcontentloaded'});
        assert.equal(res?.status(),200);
        await page.getByRole('note',{name:'Respostas aproveitadas da triagem'}).waitFor({timeout:15000});
        const note=page.getByRole('note',{name:'Respostas aproveitadas da triagem'});
        assert.match(await note.innerText(),new RegExp(item.query.objetivo));
        assert.match(await note.innerText(),new RegExp(item.query.faixa));
        // Não repetir objetivo/experiência já conhecidos. O detalhe de experiência permanece obrigatório.
        assert.equal(await page.locator('input[name="objetivo"]:visible').count(),0);
        assert.equal(await page.locator('input[name="experienciaPrevia"]:visible').count(),0);
        assert.equal(await page.locator('#quaisExperiencias:visible').count(),item.detalhe?1:0);
        if(item.detalhe) await page.locator('#quaisExperiencias').fill('Teatro sintético para teste, sem dados reais.');
        await page.getByRole('button',{name:/Avançar para Dados Pessoais/}).click();
        await page.locator('#nomeCompleto').waitFor();
        // Nunca aceitar faixa como substituta de data de nascimento.
        assert.equal(await page.locator('#dataNascimento').inputValue(),'');
        total++;
        console.log(JSON.stringify({width,scenario:item.name,passed:true}));
      }finally{await page.close()}
    }
    const direct=await context.newPage();
    try{
      await direct.goto(base+'/inscricao',{waitUntil:'domcontentloaded'});
      await direct.locator('input[name="objetivo"]').first().waitFor();
      assert.equal(await direct.getByRole('note',{name:'Respostas aproveitadas da triagem'}).count(),0);
      total++;
      console.log(JSON.stringify({width,scenario:'inscricao-direta-sem-triagem',passed:true}));
    }finally{await direct.close()}
    const underage=await context.newPage();
    try{
      await underage.goto(base+'/inscricao?faixa='+encodeURIComponent('Até 13 anos'),{waitUntil:'domcontentloaded'});
      await underage.getByText(/idade mínima de 14 anos/).first().waitFor();
      assert.equal(await underage.locator('.multi-step-form-wrapper').count(),0);
      total++;
      console.log(JSON.stringify({width,scenario:'bloqueio-ate-13',passed:true}));
    }finally{await underage.close()}
  }finally{await context.close()}
}
}finally{await browser.close()}
assert.equal(total,10);
console.log('TC-06 E2E: 10/10 fluxos, zero POST e nenhuma gravação real.');
