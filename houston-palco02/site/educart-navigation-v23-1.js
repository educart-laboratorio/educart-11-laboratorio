/* EducART V23.1: navegação aditiva, preserva a Houston */
(function(){'use strict';
if(document.querySelector('.educart-areas-v231'))return;
const school=['/','/index.html','/escola','/escola/','/escola/index.html'].includes(location.pathname);
const welcome=document.getElementById('educartWelcomeScreen');
const here=school?(document.body.classList.contains('welcome-pending')?'inicio':'escola'):location.pathname.startsWith('/agenda')?'agenda':location.pathname.startsWith('/espetaculos')?'espetaculos':location.pathname.startsWith('/artistas')?'artistas':'';
const s=document.createElement('style');s.id='educart-navigation-v231';
s.textContent=".educart-areas-v231{position:fixed;z-index:19990;bottom:max(10px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(560px,calc(100% - 16px));box-sizing:border-box;display:flex;align-items:stretch;gap:3px;padding:5px;border:1px solid rgba(232,206,159,.26);border-top-color:rgba(255,240,209,.55);border-radius:20px;background:linear-gradient(166deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.045) 38%,rgba(17,23,36,.16) 72%,rgba(0,0,0,.18) 100%),radial-gradient(115% 100% at 50% 0%,rgba(232,179,57,.13),transparent 76%),rgba(22,25,33,.68);box-shadow:0 20px 42px -8px rgba(0,0,0,.72),0 6px 15px rgba(0,0,0,.40),inset 0 2px 2px rgba(255,255,255,.20),inset 0 -3px 5px rgba(0,0,0,.45);-webkit-backdrop-filter:blur(24px) saturate(165%);backdrop-filter:blur(24px) saturate(165%)}.educart-areas-v231::before{content:\"\";position:absolute;top:0;left:18px;right:18px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);pointer-events:none}.educart-areas-v231 a{position:relative;flex:1;min-width:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:44px;text-align:center;padding:8px 0;color:#b3bdcf;text-decoration:none;border:1px solid transparent;border-radius:14px;font:600 11px/1.3 system-ui,sans-serif;white-space:nowrap;transition:transform .18s cubic-bezier(.22,1,.36,1),background .22s ease,border-color .22s ease,color .22s ease,box-shadow .22s ease;-webkit-tap-highlight-color:transparent}.educart-areas-v231 a[aria-current=\"page\"]{color:#fff;background:radial-gradient(85% 90% at 50% 100%,rgba(232,179,57,.26),transparent 75%),linear-gradient(172deg,rgba(255,255,255,.21),rgba(232,179,57,.11) 48%,rgba(0,0,0,.14));border-color:rgba(232,179,57,.43);border-top-color:rgba(255,232,172,.72);box-shadow:0 5px 10px -2px rgba(0,0,0,.62),0 0 18px -4px rgba(232,179,57,.36),inset 0 2px 2px rgba(255,255,255,.34),inset 0 -3px 4px rgba(0,0,0,.28);text-shadow:0 1px 3px rgba(0,0,0,.65)}.educart-areas-v231 a[aria-current=\"page\"]::after{content:\"\";position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:16px;height:2px;border-radius:999px;background:#e8b339;box-shadow:0 0 8px #e8b339,0 0 14px rgba(232,179,57,.55);pointer-events:none}@media(hover:hover){.educart-areas-v231 a:hover:not([aria-current=\"page\"]){color:#f3f5f8;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.02));border-color:rgba(255,255,255,.09);box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}}.educart-areas-v231 a:active{transform:scale(.96)}.educart-areas-v231 a:focus-visible,.experienceBar .expBrand--nine:focus-visible{outline:3px solid #ffc56f;outline-offset:3px}body:not(.welcome-pending){padding-bottom:max(84px,calc(env(safe-area-inset-bottom) + 76px))!important}body.welcome-pending .educart-areas-v231{display:flex!important}nav.dock[aria-label=\"Navegação rápida\"]{display:none!important}.educart-areas-v231 a{gap:4px}.educart-areas-v231 a .area-icon{font-size:14px;line-height:1}.educart-areas-v231 a .area-label{line-height:1.15}@media(max-width:560px){.educart-areas-v231 a{flex-direction:column;gap:2px;padding:4px 0 6px;font-size:clamp(9px,2.5vw,11px)}.educart-areas-v231 a .area-icon{font-size:13px}.educart-areas-v231 a[aria-current=\"page\"]::after{bottom:2px}}.experienceBar .expBrand--nine{cursor:pointer!important}@media(max-width:360px){.educart-areas-v231 a{font-size:10px}.educart-areas-v231{gap:2px;padding:4px}}@media(prefers-reduced-motion:reduce){.educart-areas-v231 a{transition:none}.educart-areas-v231 a:active{transform:none}}";
document.head.appendChild(s);
const n=document.createElement('nav');n.className='educart-areas-v231';n.setAttribute('aria-label','Áreas da EducART');
for(const x of [['inicio','Início','/','⌂'],['escola','Escola','/?area=escola','▣'],['artistas','Artistas','/artistas/','🎭'],['espetaculos','Espetáculos','/espetaculos/','✦'],['agenda','Agenda','/agenda/','▦'],['oportunidades','Oportunidades','#educart-oportunidades','✧']]){
 const a=document.createElement('a');a.href=x[2];const icon=document.createElement('span');icon.className='area-icon';icon.setAttribute('aria-hidden','true');icon.textContent=x[3];const label=document.createElement('span');label.className='area-label';label.textContent=x[1];a.append(icon,label);a.dataset.educartArea=x[0];if(here===x[0])a.setAttribute('aria-current','page');n.appendChild(a);}
document.body.appendChild(n);
function syncArea(){const active=school?(document.body.classList.contains('welcome-pending')?'inicio':'escola'):here;n.querySelectorAll('a').forEach(a=>{if(a.dataset.educartArea===active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});}
if(school){new MutationObserver(syncArea).observe(document.body,{attributes:true,attributeFilter:['class']});syncArea();}
function enterSchool(){if(!school||!welcome)return;
 const portal=document.getElementById('portalView'),form=document.getElementById('formacaoView'),bar=document.querySelector('body > .experienceBar');
 if(portal){portal.hidden=false;portal.inert=false;}if(form){form.hidden=true;form.inert=false;}if(bar)bar.inert=false;
 const expanded=document.getElementById('expandedJourney');if(expanded&&'open' in expanded)expanded.open=false;
 welcome.hidden=true;document.body.classList.remove('welcome-pending');document.getElementById('educart-school-entry-gate')?.remove();window.scrollTo(0,0);}
function enterHome(){if(!school||!welcome)return;
 document.querySelectorAll('dialog[open]').forEach(d=>{try{d.close()}catch(_){}});
 const portal=document.getElementById('portalView'),form=document.getElementById('formacaoView'),bar=document.querySelector('body > .experienceBar');
 if(portal)portal.inert=true;if(form)form.inert=true;if(bar)bar.inert=true;
 welcome.hidden=false;document.body.classList.add('welcome-pending');
 try{history.replaceState(null,'',location.pathname)}catch(_){}
 window.scrollTo(0,0);}
if(school&&welcome){
 const logo=document.querySelector('.experienceBar .expBrand--nine');
 if(logo){logo.setAttribute('role','link');logo.tabIndex=0;logo.setAttribute('aria-label','EducART — voltar ao início');
 logo.addEventListener('click',enterHome);logo.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();enterHome();}});}
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;
 if(a.matches('.card-escola,[data-educart-area="escola"],#educartWelcomeScreen [data-educart-start]')){e.preventDefault();enterSchool();}
 else if(a.matches('[data-educart-area="inicio"]')){e.preventDefault();enterHome();}
 },true);
 if(new URLSearchParams(location.search).get('area')==='escola'){enterSchool();try{history.replaceState(null,'','/')}catch(_){}}
}else{
 document.addEventListener('click',e=>{const b=e.target.closest('button[data-artists-school],button[data-artists-welcome]');if(!b)return;
 e.preventDefault();e.stopImmediatePropagation();location.assign(b.hasAttribute('data-artists-school')?'/?area=escola':'/');},true);
}
})();

/* EducART · destaque de experiência docente: Eloquence, 2025. */
(function(){'use strict';
  const person=Array.from(document.querySelectorAll('.conhecaPerson')).find(el=>el.querySelector('h3')?.textContent.trim()==='Aline Nepomuceno');
  const bio=person?.querySelector('.conhecaBio');
  if(!bio||bio.querySelector('.educart-docente-destaque'))return;
  const style=document.createElement('style');
  style.id='educart-docente-destaque-estilo';
  style.textContent='.educart-docente-destaque{box-sizing:border-box;min-width:0;margin:14px 0;padding:13px;border:1px solid rgba(233,200,143,.36);border-radius:14px;background:linear-gradient(135deg,rgba(233,200,143,.09),rgba(10,18,34,.28));color:inherit}.educart-docente-destaque .ed-kicker{display:block;font:800 10px/1.4 system-ui,sans-serif;letter-spacing:.08em;color:#f7d79d}.educart-docente-destaque .ed-title{display:block;font:800 18px/1.25 system-ui,sans-serif;color:inherit;margin-top:6px}.educart-docente-destaque .ed-sub{display:block;margin-top:4px;font:700 12px/1.4 system-ui,sans-serif;color:#f7d79d}.educart-docente-destaque .ed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:11px 0}.educart-docente-destaque .ed-grid a{box-sizing:border-box;display:block;min-width:0;margin:0;padding:9px 8px;border:1px solid rgba(233,200,143,.25);border-radius:10px;background:rgba(255,255,255,.045);text-decoration:none;font:700 12px/1.4 system-ui,sans-serif;overflow-wrap:anywhere;color:#f0c985}.educart-docente-destaque .ed-grid small{display:block;margin-top:4px;font-weight:400;color:#cbd3e2}.educart-docente-destaque .ed-total{font:600 12px/1.4 system-ui,sans-serif;color:#cbd3e2}.educart-docente-destaque a.ed-cta{display:block;margin:10px 0 0;padding:10px;text-align:center;border:1px solid #d8b474;border-radius:10px;color:#f7d79d;text-decoration:none;font:800 12px/1.4 system-ui,sans-serif}.educart-docente-destaque a:focus-visible{outline:2px solid #f7d79d;outline-offset:2px}@media(max-width:340px){.educart-docente-destaque .ed-grid{grid-template-columns:1fr}}';
  document.head.append(style);
  const section=document.createElement('section');
  section.className='educart-docente-destaque';
  section.setAttribute('aria-label','Experiência docente em destaque: EducART e Eloquence');
  section.innerHTML='<span class="ed-kicker">EXPERIÊNCIAS EM DESTAQUE · 2025</span><strong class="ed-title">EducART &amp; Eloquence</strong><span class="ed-sub">Teatro na prática</span><p>Uma experiência de formação teatral com Aline Nepomuceno, reunindo ensaios, construção de personagens e apresentação cênica.</p>';
  const grid=document.createElement('div');grid.className='ed-grid';
  const records=[
    ['Falas da professora','5 registros','1qOUWky3mdsN-vWv4cV3KZICp82L08cKw'],
    ['Construção de personagens','4 registros','1GzXEtzHOGxxWsAA9nwQV_7LeGYliEJO-'],
    ['Ensaios e processos','1 registro','1Y7-nM-IYlgTbFZxPkGo7lhPzz3Js5AD8'],
    ['Apresentação final','1 registro','1GiQ2abnb-IJthibcZ1a4W1z7t3OBViVe']
  ];
  function link(label,id,cls){const a=document.createElement('a');a.textContent=label;a.href='https://drive.google.com/drive/folders/'+id;a.target='_blank';a.rel='noopener noreferrer';if(cls)a.className=cls;return a}
  records.forEach(([label,count,id])=>{const a=link(label,id);const small=document.createElement('small');small.textContent=count+' · acervo';a.append(small);grid.append(a)});
  section.append(grid);
  const total=link('26 registros fotográficos','1fpdDjkwmah24_wsCvxJXjlI1nhEag8sD','ed-total');section.append(total);
  section.append(link('Conhecer a experiência ↗','1MFBkQavSuk0yhqtIm2XDepa0wHFw4Bg-','ed-cta'));
  const intro=bio.querySelector('p');if(intro)intro.after(section);else bio.append(section);
})();

/* EducART · insígnia de coordenadora, no padrão de insígnias dos perfis. */
(function(){'use strict';
  const person=Array.from(document.querySelectorAll('.conhecaPerson')).find(el=>el.querySelector('h3')?.textContent.trim()==='Aline Nepomuceno');
  const title=person?.querySelector('h3');
  if(!title||person.querySelector('[data-educart-coordenadora]'))return;
  const style=document.createElement('style');
  style.textContent='.conhecaPerson .u-badges[data-educart-coordenadora]{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 0}.conhecaPerson .u-badges[data-educart-coordenadora] span{border:1px solid #ffffff30;color:#f5d49f;border-radius:20px;padding:4px 10px;font-size:12px}';
  document.head.append(style);
  const badges=document.createElement('div');badges.className='u-badges';badges.setAttribute('data-educart-coordenadora','');
  const badge=document.createElement('span');badge.textContent='Coordenadora';badges.append(badge);title.after(badges);
})();

/* EducART · Agenda Cultural Lote 02: terceira posição, Artistas e Espetáculos na segunda linha. */
(function(){'use strict';
  const nav=document.querySelector('#educartWelcomeScreen .educart-nav-cards');
  const artists=nav?.querySelector('a.card-artistas');
  const shows=nav?.querySelector('a.card-espetaculos');
  if(!artists||!shows||nav.querySelector('.card-agenda'))return;
  const style=document.createElement('style');style.id='educart-agenda-home';
  style.textContent=`
    #educartWelcomeScreen .educart-nav-cards .educart-door-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;min-width:0;width:100%}
    #educartWelcomeScreen .educart-door-pair .educart-card{min-width:0}
    #educartWelcomeScreen .educart-door-pair .card-content{grid-template-columns:clamp(18px,5vw,35px) minmax(0,1fr);gap:5px;padding:5px 7px}
    #educartWelcomeScreen .educart-door-pair .icon-wrapper{width:clamp(18px,5vw,35px);height:clamp(18px,5vw,35px)}
    #educartWelcomeScreen .educart-door-pair .arrow-wrapper{display:none}
    #educartWelcomeScreen .educart-nav-cards .educart-card .card-title{font-size:clamp(16px,4.9vw,20px);font-weight:800;line-height:1.12;letter-spacing:-.025em}
    @media(min-width:601px){#educartWelcomeScreen .educart-nav-cards .educart-card .card-title{font-size:24px}}
    #educartWelcomeScreen .educart-door-pair .card-title{white-space:normal;overflow-wrap:normal}
    #educartWelcomeScreen .educart-door-pair .card-subtitle{font-size:clamp(8px,2vw,10px)}
    #educartWelcomeScreen .card-agenda{--ref-left:rgba(52,83,139,.75);--ref-right:rgba(46,74,128,.70);--ref-border:rgba(168,164,154,.55);--ref-glow:rgba(223,171,74,.24);--ref-subtitle:#d2e2fc;animation:educart-agenda-glow 4s ease-in-out infinite alternate}
    @keyframes educart-agenda-glow{from{box-shadow:0 0 10px 1px rgba(226,174,75,.18),0 0 1px 0 rgba(248,205,120,.23),inset 0 2px 4px rgba(255,231,173,.18),0 7px 14px rgba(0,0,0,.20)}to{box-shadow:0 0 16px 2px rgba(242,187,81,.32),0 0 2px 0 rgba(255,216,137,.34),inset 0 2px 6px rgba(255,223,153,.28),0 7px 14px rgba(0,0,0,.20)}}
    #educartWelcomeScreen .card-agenda:after{content:'';position:absolute;inset:1px;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,226,155,.16) 48%,rgba(255,245,211,.24) 50%,transparent 62%);background-size:260% 100%;animation:educart-agenda-sheen 8s ease-in-out infinite}
    @keyframes educart-agenda-sheen{0%,65%{background-position:120% 0;opacity:0}69%{opacity:1}88%{background-position:-120% 0;opacity:1}92%,100%{background-position:-120% 0;opacity:0}}
    @media(prefers-reduced-motion:reduce){#educartWelcomeScreen .card-agenda{animation:none}#educartWelcomeScreen .card-agenda:after{animation:none;opacity:0}}
    #educartWelcomeScreen .card-agenda .icon-wrapper{display:grid;place-items:center;color:#dceaff;background:linear-gradient(135deg,#557cb9,#294678)}
    #educartWelcomeScreen .card-agenda .icon-wrapper svg{opacity:1;width:68%;height:68%}
    #educartWelcomeScreen .card-agenda .arrow-wrapper{color:#a8c6f9}
    @media(max-width:600px){
      #educartWelcomeScreen .educart-door-pair{gap:7px}
      #educartWelcomeScreen .educart-door-pair .educart-card{height:68px;min-height:68px}
      #educartWelcomeScreen .educart-door-pair .card-content{height:100%;min-height:0;padding:5px 5px;gap:4px}
      #educartWelcomeScreen .educart-door-pair .card-subtitle{display:block;font-size:clamp(9px,2.35vw,11px);line-height:1.15;white-space:normal;overflow-wrap:normal}
    }
    @media(max-width:480px){
      #educartWelcomeScreen .educart-door-pair .educart-card{height:auto;min-height:68px;overflow:visible}
      #educartWelcomeScreen .educart-door-pair .card-content{display:flex;flex-direction:column;justify-content:center;align-items:center;height:auto;min-height:66px;gap:2px;padding:4px 3px}
      #educartWelcomeScreen .educart-door-pair .icon-wrapper{flex:0 0 auto;width:17px;height:17px}
      #educartWelcomeScreen .educart-door-pair .text-group{width:100%;align-items:center;text-align:center}
      #educartWelcomeScreen .educart-door-pair .card-title{max-width:100%;white-space:normal}
      #educartWelcomeScreen .educart-door-pair .card-subtitle{text-align:center}
    }
  `;
  document.head.append(style);
  const agenda=shows.cloneNode(true);agenda.classList.remove('card-espetaculos');agenda.classList.add('card-agenda');
  agenda.href='/agenda/';agenda.setAttribute('aria-label','Acessar Agenda Cultural: programação teatral de Salvador');
  agenda.querySelector('.card-title').textContent='Agenda Cultural';
  agenda.querySelector('.card-subtitle').textContent='Programação teatral de Salvador';
  agenda.querySelector('.icon-wrapper').innerHTML='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path stroke-linecap="round" d="M16 3v4M8 3v4M3 10h18M8 14h2m4 0h2m-8 3h2m4 0h2"/></svg>';
  const pair=document.createElement('div');pair.className='educart-door-pair';
  artists.before(pair);pair.append(artists,shows);pair.after(agenda);
})();

/* EducART · HOME: artistas formadores, com os cartões docentes já existentes. */
(function(){'use strict';
  const home=document.getElementById('educartWelcomeScreen');
  const doors=home?.querySelector('.educart-nav-cards');
  const team=document.querySelector('#conhecaNos .conhecaGrid');
  if(!doors||!team||home.querySelector('#educart-formadores-button'))return;
  const style=document.createElement('style');style.id='educart-formadores-home-style';
  style.textContent=
    '#educartWelcomeScreen #educart-formadores-button{display:inline-grid;place-items:center;flex:0 0 auto;width:44px;height:44px;margin:8px auto 0;padding:0;border-radius:50%;border:1px solid rgba(255,220,150,.65);background:linear-gradient(155deg,rgba(255,255,255,.17),rgba(72,54,32,.74));color:#ffe2a4;box-shadow:0 5px 14px #0007,inset 0 1px 2px #fff4,inset 0 -3px 5px #0004;cursor:pointer;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);touch-action:manipulation}'+
    '#educart-formadores-button svg{width:25px;height:25px}#educart-formadores-button:active{transform:scale(.96)}#educart-formadores-button:focus-visible,#educart-formadores-modal button:focus-visible{outline:2px solid #ffe2a4;outline-offset:3px}'+
    '#educart-formadores-modal{position:fixed;inset:0;margin:auto;width:min(960px,calc(100% - 24px));max-width:none;max-height:min(86vh,820px);max-height:min(86dvh,820px);box-sizing:border-box;padding:18px;overflow:auto;overscroll-behavior:contain;border:1px solid #b9a78380;border-radius:20px;background:#10192a;color:#f9fbff;box-shadow:0 20px 70px #0009;text-align:left;font:14px/1.5 system-ui,sans-serif}'+
    '#educart-formadores-modal::backdrop{background:#050913bd;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}'+
    '#educart-formadores-modal .formadores-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px}'+
    '#educart-formadores-modal h2{margin:0;color:#fff9f0;font:700 clamp(21px,4.5vw,32px)/1.2 Georgia,serif}'+
    '#educart-formadores-modal .formadores-close{width:44px;height:44px;flex:0 0 44px;display:grid;place-items:center;border:1px solid #b9a78380;border-radius:50%;background:#202d43;color:#fff9f0;font-size:25px;cursor:pointer}'+
    '#educart-formadores-modal .conhecaFonte{display:inline-block;margin-top:9px;color:#edca83}'+
    '@media(max-width:620px){#educart-formadores-modal{padding:12px}#educart-formadores-modal .conhecaGrid{grid-template-columns:1fr}}'+
    '@media(prefers-reduced-motion:reduce){#educart-formadores-button:active{transform:none}}';
  document.head.append(style);
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='educart-formadores-button';
  trigger.setAttribute('aria-label','Conheça os artistas formadores');
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','educart-formadores-modal');
  trigger.title='Conheça os artistas formadores';
  trigger.innerHTML='<img src="/assets/coracao-formadores-educart.webp" width="64" height="64" alt="" aria-hidden="true" decoding="async">';
  style.textContent+='\n#educartWelcomeScreen #educart-formadores-button{width:64px;height:64px;background:transparent;border:0;box-shadow:none;border-radius:12px}#educart-formadores-button img{display:block;width:100%;height:100%;object-fit:contain;border-radius:12px}';
  doors.after(trigger);
  const dialog=document.createElement('dialog');dialog.id='educart-formadores-modal';
  dialog.setAttribute('aria-labelledby','educart-formadores-title');
  dialog.innerHTML='<header class="formadores-header"><h2 id="educart-formadores-title">Conheça os artistas formadores</h2><button type="button" class="formadores-close" aria-label="Fechar" autofocus>×</button></header><div class="formadores-content"></div>';
  document.body.append(dialog);
  const content=dialog.querySelector('.formadores-content');
  const close=dialog.querySelector('.formadores-close');
  function populate(){
    const grid=team.cloneNode(true);
    grid.querySelectorAll('details').forEach(d=>d.open=false);
    const existing=Array.from(grid.querySelectorAll('.conhecaPerson')).find(card=>card.querySelector('h3')?.textContent.trim()==='Felipe Bispo');
    if(existing){
      const role=existing.querySelector('.conhecaRole');if(role)role.textContent='Ator, cantor e professor';
    }else{
      // Retrato, nome, apresentação e perfil reutilizados do portfólio artístico da mesma base.
      const card=document.createElement('article');card.className='conhecaPerson';
      card.innerHTML='<img class="conhecaFace" src="/artistas/assets/perfis-enquadrados/felipe-bispo.svg" alt="Retrato de Felipe Bispo" loading="lazy" width="106" height="106"><div class="conhecaPersonContent"><span class="conhecaNumber">NOSSA EQUIPE · '+String(grid.querySelectorAll('.conhecaPerson').length+1).padStart(2,'0')+'</span><h3>Felipe Bispo</h3><p class="conhecaRole">Ator, cantor e professor</p><p class="conhecaDesc">Ator, diretor e criador em Salvador (BA), com atuação voltada para investigação expressiva, lucidez cênica e formação de atores.</p><details class="conhecaBio"><summary>Ver perfil artístico</summary><a class="conhecaFonte" href="/artistas/perfil/felipe-bispo/">Conhecer o perfil ↗</a></details></div>';
      grid.append(card);
    }
    const leader=Array.from(grid.querySelectorAll('.conhecaPerson')).find(card=>card.querySelector('h3')?.textContent.trim()==='Aline Nepomuceno');
    if(leader){const name=leader.querySelector('h3');name.textContent='Aline Nepomuceno (Alininha)';grid.prepend(leader);}
    content.replaceChildren(grid);
  }
  trigger.addEventListener('click',()=>{if(dialog.open)return;populate();dialog.showModal();});
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{if(!home.hidden)trigger.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();return;}
    const link=e.target.closest('a[data-conheca-catalogo]');
    if(link){e.preventDefault();dialog.close();document.querySelector('[data-educart-area="escola"]')?.click();team.querySelector('a[data-conheca-catalogo]')?.click();}
  });
})();

/* EducART · Oportunidades — painel de embarque profissional. */
(function(){'use strict';
  const link=document.querySelector('[data-educart-area="oportunidades"]');
  if(!link||document.getElementById('educart-oportunidades'))return;
  const style=document.createElement('style');
  style.id='educart-oportunidades-style';
  style.textContent='.educart-areas-v231 a[data-educart-area="oportunidades"] .area-label{white-space:normal;overflow-wrap:normal;line-height:1.05;font-size:clamp(7px,2.1vw,11px)}#educart-oportunidades{box-sizing:border-box;position:fixed;inset:0;margin:auto;width:min(680px,calc(100% - 24px));max-height:85dvh;overflow:auto;padding:20px;border:1px solid #e8ce9f66;border-radius:20px;background:#10192a;color:#f9fbff;box-shadow:0 20px 70px #0009;font:15px/1.5 system-ui,sans-serif}#educart-oportunidades::backdrop{background:#050913bd;backdrop-filter:blur(8px)}#educart-oportunidades header{display:flex;align-items:center;justify-content:space-between;gap:12px}#educart-oportunidades h2{margin:0;color:#fff9f0;font:700 clamp(21px,4.5vw,32px)/1.2 Georgia,serif}#educart-oportunidades .op-close{width:44px;height:44px;flex:0 0 44px;border-radius:50%;border:1px solid #e8ce9f66;background:#202d43;color:#fff;font-size:25px;cursor:pointer}#educart-oportunidades article{margin-top:20px;padding:18px;border:1px solid #e8ce9f55;border-radius:16px;background:linear-gradient(155deg,#ffffff0b,#e8ce9f08)}#educart-oportunidades h3{margin:5px 0 12px;color:#fff9f0;font-size:22px}#educart-oportunidades .op-kicker{font-size:11px;letter-spacing:.08em;color:#edca83;font-weight:700}#educart-oportunidades dl{margin:0;display:grid;gap:8px}#educart-oportunidades dt{color:#edca83;font-weight:700}#educart-oportunidades dd{margin:0 0 8px}#educart-oportunidades .op-close:focus-visible{outline:2px solid #ffe2a4;outline-offset:3px}';
  document.head.append(style);
  const dialog=document.createElement('dialog');
  dialog.id='educart-oportunidades';
  dialog.setAttribute('aria-labelledby','educart-oportunidades-title');
  dialog.innerHTML='<header><h2 id="educart-oportunidades-title">Oportunidades EducART</h2><button class="op-close" type="button" aria-label="Fechar" autofocus>×</button></header><p>Painel de embarque profissional para os artistas.</p><article aria-label="Primeiro chamamento"><span class="op-kicker">PRIMEIRO CHAMAMENTO · CASTING</span><h3>Colab Talents</h3><dl><div><dt>Testes</dt><dd>Salvador, Bahia</dd></div><div><dt>Gravação</dt><dd>Rio de Janeiro</dd></div></dl></article>';
  document.body.append(dialog);
  link.setAttribute('aria-haspopup','dialog');
  link.setAttribute('aria-controls',dialog.id);
  link.addEventListener('click',event=>{event.preventDefault();if(!dialog.open)dialog.showModal()});
  dialog.querySelector('.op-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>link.focus());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
})();
