/**
 * EducART 1.1 — inspeção da resposta visual do formulário no domínio público.
 * APENAS GET externo. Todos os métodos de escrita são interceptados no browser.
 * O POST do Supabase é respondido por uma simulação local (201/409) e NUNCA chega à rede.
 * Não valida persistência real, RLS, identidade, matrícula ou confirmação por e-mail.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = new URL(process.env.AUDIT_BASE_URL || 'https://educart.pro');
const out = path.resolve('artifacts');
const states = [
  {name:'sucesso-simulado', http:201, error:null},
  {name:'duplicidade-simulada', http:409, error:{code:'23505',details:null,hint:null,message:'duplicate key value violates unique constraint'}},
];
const results = [];
const guard = [];
await fs.mkdir(out,{recursive:true});
const browser = await chromium.launch({headless:true});
try {
  for(const state of states) {
    const context = await browser.newContext({
      viewport:{width:360,height:800},
      locale:'pt-BR',
      serviceWorkers:'block',
      reducedMotion:'reduce',
    });
    let intercepted=0, blocked=0, matched=false, requests=[];
    await context.route('**/*', async route=>{
      const request=route.request(), method=request.method(), url=new URL(request.url());
      if(method==='POST' && url.hostname.endsWith('.supabase.co') && url.pathname==='/rest/v1/inscricoes_oficina') {
        intercepted++;
        matched=true;
        requests.push({method,host:url.hostname,path:url.pathname,simulatedStatus:state.http});
        return route.fulfill({
          status:state.http,
          contentType:'application/json',
          headers:{'Access-Control-Allow-Origin':base.origin,'Access-Control-Allow-Credentials':'true'},
          body:state.error?JSON.stringify(state.error):'',
        });
      }
      if(!['GET','HEAD','OPTIONS'].includes(method)) {
        blocked++;
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page=await context.newPage();
    const record={state:state.name,target:base.origin,simulatedHttp:state.http,intercepted:0,blocked:0,
      successVisible:false,alertText:null,alertInViewport:null,scrollY:null,stageBefore:null,stageAfter:null,
      failed:false,detail:null,requests:[]};
    try {
      const response=await page.goto(new URL('/inscricao',base).href,{waitUntil:'domcontentloaded',timeout:30000});
      record.pageHttp=response?.status()??null;
      await page.getByRole('button',{name:/Avançar para Dados Pessoais/}).click({timeout:10000});
      record.stageBefore=await page.locator('[data-inscricao-step]').getAttribute('data-inscricao-step');
      await page.locator('#nomeCompleto').fill('Teste Sintético Sem Registro');
      await page.locator('#dataNascimento').fill('1990-05-05');
      await page.locator('#telefone').fill('71999999999');
      await page.locator('#email').fill('sintetico-nao-enviar@example.invalid');
      await page.getByRole('button',{name:/Avançar para Endereço/}).click({timeout:10000});
      await page.locator('#endereco').fill('Rua do Teste Sintético, 123, Bairro Fictício');
      await page.getByRole('button',{name:/Finalizar e Confirmar Inscrição/}).click({timeout:10000});
      await page.waitForTimeout(1000);
      record.stageAfter=await page.locator('[data-inscricao-step]').getAttribute('data-inscricao-step').catch(()=>null);
      record.successVisible=await page.getByText('Inscrição Enviada com Sucesso!').isVisible().catch(()=>false);
      const alert=page.locator('.form-error-alert[role="alert"]').first();
      record.alertText=(await alert.count())?((await alert.innerText()).trim()).slice(0,250):null;
      record.alertInViewport=(await alert.count())?await alert.evaluate(el=>{
        const r=el.getBoundingClientRect();
        return r.top<window.innerHeight&&r.bottom>0;
      }):null;
      record.scrollY=await page.evaluate(()=>window.scrollY);
      await page.screenshot({path:path.join(out,'diagnostico-'+state.name+'.png'),fullPage:false});
      // Este ensaio só valida a reação da UI ao POST simulado.
      if(intercepted!==1)throw Error('Quantidade de POST interceptados diferente de 1: '+intercepted);
      if(state.http===201 && !record.successVisible)throw Error('POST 201 simulado nao mostrou sucesso');
      if(state.http===409 && (record.successVisible || !record.alertText))throw Error('POST 409 simulado nao mostrou alerta de falha');
    } catch (error) {
      record.failed=true;
      record.detail=String(error?.message||error).slice(0,380);
      try{await page.screenshot({path:path.join(out,'diagnostico-'+state.name+'-falha.png'),fullPage:false})}catch{}
    } finally {
      record.intercepted=intercepted;
      record.blocked=blocked;
      record.requests=requests;
      results.push(record);
      console.log(JSON.stringify(record));
      await page.close();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
const report={
  title:'EducART — resposta visual ao envio da inscrição com POST estritamente simulado',
  testedAt:new Date().toISOString(),source:base.origin,
  realWrites:0,realAuthenticatedTests:0,
  results,limitations:[
    'POST de inscrição interceptado no browser; não prova gravação nem erro real do banco.',
    'Sem identidade real; dados apenas sintéticos; requisições GET/OPTIONS podem ocorrer.',
    'Um HTTP 201 simulado não verifica confirmação de e-mail, papel de Secretaria ou backend PROD.',
    'Execução não corrige produção nem altera banco.'
  ]
};
await fs.writeFile(path.join(out,'diagnostico-fluxo-inscricao.json'),JSON.stringify(report,null,2));
if(results.some(r=>r.failed))process.exitCode=1;
