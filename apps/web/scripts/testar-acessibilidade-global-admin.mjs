/**
 * EducART 1.1 — LIPE: acessibilidade global em TODAS AS ROTAS.
 * Painel Administrativo obrigatório: /admin E /admin/login, não só páginas públicas.
 * Asserções de código original + execução do próprio efeito de teclado em VM.
 * Não simula autenticação nem equivale a auditoria WCAG ou E2E visual do dashboard.
 */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const read=p=>readFileSync(p,'utf8');
const layout=read('src/app/layout.tsx');
const widget=read('src/components/AccessibilityWidget.tsx');
const css=read('src/app/globals.css');
const adminCss=read('src/app/admin/admin.css');
const adminLayout=read('src/app/admin/layout.tsx');
const adminPage=read('src/app/admin/page.tsx');
const adminLogin=read('src/app/admin/login/page.tsx');
const manifesto=JSON.parse(read('../../AUTODEV_R01_MANIFESTO_LIPE_2026-11-04.json'));

const rotas=[
  ['/', 'src/app/page.tsx'],
  ['/formacao', 'src/app/formacao/page.tsx'],
  ['/inscricao', 'src/app/inscricao/page.tsx'],
  ['/niveis-demo', 'src/app/niveis-demo/page.tsx'],
  ['/admin/login', 'src/app/admin/login/page.tsx'],
  ['/admin (PAINEL ADMINISTRATIVO)', 'src/app/admin/page.tsx'],
];
for(const [rota,path] of rotas){
  assert(existsSync(path), 'Página não localizada: '+rota);
  assert(read(path).length>80,'Página sem conteúdo: '+rota);
  console.log('A11Y ROTA INSPECIONADA:',rota,'→',path);
}
assert.equal((layout.match(/<AccessibilityWidget\s*\/>/g)||[]).length,1,'Um único widget compartilhado');
assert(layout.indexOf('<AccessibilityWidget />')<layout.indexOf('<main id="main-content"'),'Link Pular para conteúdo deve preceder <main>');
assert(layout.indexOf('<WhatsAppFlutuante />')>layout.indexOf('<main id="main-content"'),'WhatsApp original não removido');
assert(adminLayout.includes('{children}'),'Layout administrativo não pode omitir seus filhos');
assert(!adminLayout.includes('<AccessibilityWidget />'),'A rota administrativa deve herdar o widget global, sem cópia');
assert(adminPage.includes('supabase.auth.getUser()'),'Dashboard real deve manter autenticação');
assert(adminPage.includes('<AdminRotinaAcademicaLab supabase={supabase}'),'Painel administrativo acadêmico incluído na auditoria');
assert(adminLogin.includes('signInWithPassword'),'Tela de login real, não mock');

assert(widget.includes('role="dialog"')&&widget.includes('aria-modal="true"'));
assert(widget.includes('aria-labelledby="a11y-dialog-title"'));
assert(widget.includes('aria-label="Fechar painel de acessibilidade"'));
assert(widget.includes('ref={closeRef}'));
assert(widget.includes('ref={dialogRef}'));
assert(widget.includes('aria-controls="educart-a11y-dialog"'));
assert(widget.includes('tabIndex={-1}'));
assert(widget.includes("buttonRef.current?.focus()"),'Restauração de foco ausente');
assert(widget.includes("localStorage.setItem('educart_high_contrast'"));
assert(widget.includes("localStorage.setItem('educart_font_size'"));
assert(widget.includes("localStorage.getItem('educart_high_contrast'"));
assert(widget.includes("localStorage.getItem('educart_font_size'"));
assert(widget.includes("document.documentElement.style.setProperty('--font-scale'"));
assert(widget.includes("newLevel = 0.9")&&widget.includes("newLevel = 1.35"));
assert(widget.includes('aria-label="Diminuir texto"'));
assert(widget.includes('aria-label="Aumentar texto"'));
assert(widget.includes('aria-label="Tamanho original de texto"'));
assert(!widget.includes('Este site segue as diretrizes <strong>WCAG'),'Não afirmar conformidade não auditada');
assert.match(css,/\.a11y-floating-widget\s*\{[^}]*position:\s*fixed/s);
assert.match(css,/\.a11y-floating-widget\s*\{[^}]*left:\s*28px/s);
assert.match(css,/@media\s*\(max-width:\s*640px\)[\s\S]*?\.a11y-modal-card\s*\{[^}]*width:\s*calc\(100vw - 40px\)/s);
assert.match(css,/html\.high-contrast\s*\{/);
assert.match(css,/font-size:\s*calc\(16px \* var\(--font-scale,\s*1\)\)/);
assert.match(adminCss,/html\.high-contrast\s+\.admin-layout-root\s*\{/);
assert.match(adminCss,/\.admin-layout-root\s*\{/);
assert.match(adminCss,/\.admin-academico/);

// LIPE: hash do widget 1.0 jamais apagado do registro e novo hash exato justificado.
const a11y=manifesto.laboratory.approvedComponents?.find(x=>x.path==='apps/web/src/components/AccessibilityWidget.tsx');
assert(a11y,'Revisão da ferramenta original não documentada na LIPE');
assert.equal(a11y.workOrder,'AUDITORIA_A11Y_PRE_R03');
assert.equal(a11y.productionBlobSha,'782481420b3c9456fe19bc70810a8db64d30014c');
function shaGit(blob){
  return createHash('sha1').update(Buffer.from('blob '+blob.length+'\0')).update(blob).digest('hex');
}
assert.equal(shaGit(readFileSync('src/components/AccessibilityWidget.tsx')),a11y.reviewedLabBlobSha,'Widget diferiu do patch LIPE autorizado');

// Executar o efeito ORIGINAL de foco do React (não uma reimplementação).
const begin=widget.indexOf('  // Dialog modal: foco inicial');
const end=widget.indexOf('  // Fechar ao clicar fora',begin);
assert(begin>=0&&end>begin,'Efeito real de foco não encontrado');
const trecho=widget.slice(begin,end);
const efeito=trecho.slice(trecho.indexOf('  useEffect('))
  .replace('(e: KeyboardEvent)', '(e)')
  .replace('querySelectorAll<HTMLElement>(', 'querySelectorAll(');
assert(!/:\s*KeyboardEvent|<HTMLElement>/.test(efeito),'Tipo TS pendente na extração');

for (const [rota] of rotas){
  let active=null, listener=null, closed=false, cleaned=false;
  const els=Array.from({length:5},(_,i)=>({id:['Fechar','Contraste','A-','100%','A+'][i],focus(){active=this}}));
  const trigger={id:'acessibilidade',focus(){active=this}};
  const dialog={
    querySelectorAll(){return els},
    contains(el){return els.includes(el)},
    focus(){active=dialog}
  };
  const document={get activeElement(){return active}};
  const window={
    addEventListener:(kind,fn)=>{assert.equal(kind,'keydown');listener=fn},
    removeEventListener:(kind,fn)=>{assert.equal(kind,'keydown');assert.equal(listener,fn);cleaned=true}
  };
  let cleanup;
  const context={
    isOpen:true,
    closeRef:{current:els[0]},
    dialogRef:{current:dialog},
    buttonRef:{current:trigger},
    document,window,
    setIsOpen(v){closed=v===false},
    useEffect(callback){cleanup=callback()}
  };
  vm.runInNewContext(efeito,context,{timeout:1200,filename:'AccessibilityWidget.tsx:focus-effect'});
  assert.equal(active,els[0],rota+' foco inicial deve ir ao fechar');
  assert.equal(typeof listener,'function',rota+' listener de teclado ausente');
  const key=(key,shiftKey=false)=>{
    let prevented=false;
    listener({key,shiftKey,preventDefault(){prevented=true}});
    return prevented;
  };
  assert.equal(key('Tab',true),true,rota+' Shift+Tab desde primeiro deve permanecer no modal');
  assert.equal(active,els[4],rota+' Shift+Tab deve ir ao último');
  assert.equal(key('Tab',false),true,rota+' Tab desde último deve permanecer no modal');
  assert.equal(active,els[0],rota+' Tab deve voltar ao primeiro');
  active={id:'campo-fundo'};
  assert.equal(key('Tab'),true,rota+' foco vindo do fundo deve retornar ao modal');
  assert.equal(active,els[0],rota+' foco do fundo deve voltar ao primeiro');
  assert.equal(key('Escape'),true,rota+' ESC deve prevenir ação padrão');
  assert(closed,rota+' ESC não fechou modal');
  assert.equal(active,trigger,rota+' ESC não restaurou foco ao botão ♿');
  cleanup();assert(cleaned,rota+' sem limpeza de listener');
  console.log('A11Y FOCO PASS:',rota,'Tab, Shift+Tab, ESC, foco e cleanup');
}
console.log('A11Y LIPE OK: 6 rotas, incluindo /admin e /admin/login; mesmo widget; foco executado do código real; hash original documentado. Sem autenticação ou deploy.');
