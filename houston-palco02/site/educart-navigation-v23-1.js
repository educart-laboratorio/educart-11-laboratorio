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
    #educartWelcomeScreen .card-agenda{--ref-left:rgba(255,255,255,.88);--ref-right:rgba(255,255,255,.88);--ref-border:rgba(255,255,255,.78);--ref-glow:rgba(223,171,74,.24);--ref-subtitle:#394150;background:rgba(255,255,255,.88)!important;color:#172033!important;border-color:rgba(255,255,255,.78)!important;animation:educart-agenda-glow 4s ease-in-out infinite alternate}
    #educartWelcomeScreen .educart-nav-cards .card-agenda .card-title{color:#172033!important;text-shadow:none!important}
    #educartWelcomeScreen .educart-nav-cards .card-agenda .card-subtitle{color:#394150!important;text-shadow:none!important}
    @keyframes educart-agenda-glow{from{box-shadow:0 0 10px 1px rgba(226,174,75,.18),0 0 1px 0 rgba(248,205,120,.23),inset 0 2px 4px rgba(255,231,173,.18),0 7px 14px rgba(0,0,0,.20)}to{box-shadow:0 0 16px 2px rgba(242,187,81,.32),0 0 2px 0 rgba(255,216,137,.34),inset 0 2px 6px rgba(255,223,153,.28),0 7px 14px rgba(0,0,0,.20)}}
    #educartWelcomeScreen .card-agenda:after{content:'';position:absolute;inset:1px;border-radius:inherit;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,226,155,.16) 48%,rgba(255,245,211,.24) 50%,transparent 62%);background-size:260% 100%;animation:educart-agenda-sheen 8s ease-in-out infinite}
    @keyframes educart-agenda-sheen{0%,65%{background-position:120% 0;opacity:0}69%{opacity:1}88%{background-position:-120% 0;opacity:1}92%,100%{background-position:-120% 0;opacity:0}}
    @media(prefers-reduced-motion:reduce){#educartWelcomeScreen .card-agenda{animation:none}#educartWelcomeScreen .card-agenda:after{animation:none;opacity:0}}
    #educartWelcomeScreen .card-agenda .icon-wrapper{display:grid;place-items:center;color:#172033!important;background:#eef0f3!important;border-color:#d7dce3!important}
    #educartWelcomeScreen .card-agenda .icon-wrapper svg{opacity:1;width:68%;height:68%}
    #educartWelcomeScreen .card-agenda .arrow-wrapper{color:#172033!important}
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

/* EducART · HOME: elevação de 15% do conjunto slogan, título e portas. */
(function(){'use strict';
  const home=document.getElementById('educartWelcomeScreen');
  const content=home?.querySelector('.welcomeContent');
  const kicker=content?.querySelector('.welcomeKicker');
  const title=content?.querySelector('.welcomeTitle');
  const cards=content?.querySelector('.educart-nav-cards');
  if(!content||!kicker||!title||!cards||content.querySelector('.educart-hero-stack'))return;
  if([kicker,title,cards].some(el=>el.parentElement!==content))return;
  const style=document.createElement('style');
  style.id='educart-hero-stack-position';
  style.textContent='#educartWelcomeScreen .educart-hero-stack{display:flex;flex-direction:column;align-items:center;gap:0;width:100%;min-width:0;flex:0 0 auto;transform:translateY(-15%)}';
  document.head.append(style);
  const stack=document.createElement('div');
  stack.className='educart-hero-stack';
  kicker.before(stack);
  stack.append(kicker,title,cards);
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
  trigger.setAttribute('aria-label','Quem somos');
  trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','educart-formadores-modal');
  trigger.title='Quem somos';
  trigger.innerHTML='<span class="formadores-center"><span class="formadores-heart" aria-hidden="true"><svg class="formadores-heart-art" viewBox="4 8 92 84" aria-hidden="true" focusable="false"><defs><clipPath id="educart-heart-silhouette" clipPathUnits="userSpaceOnUse"><path d="M50 22.8 C43.8 13.5 37.6 9.8 29.2 9.8 C15.5 9.8 5.1 21.4 5.1 36.7 C5.1 55.4 19.8 71.3 50 90.7 C80.2 71.3 94.9 55.4 94.9 36.7 C94.9 21.4 84.5 9.8 70.8 9.8 C62.4 9.8 56.2 13.5 50 22.8Z"/></clipPath><linearGradient id="educart-heart-polish" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6d7" stop-opacity=".24"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#071226" stop-opacity=".18"/></linearGradient></defs><g clip-path="url(#educart-heart-silhouette)"><image href="/assets/coracao-formadores-educart.webp" width="100" height="100" preserveAspectRatio="none"/><path d="M50 22.8 C43.8 13.5 37.6 9.8 29.2 9.8 C15.5 9.8 5.1 21.4 5.1 36.7 C5.1 55.4 19.8 71.3 50 90.7 C80.2 71.3 94.9 55.4 94.9 36.7 C94.9 21.4 84.5 9.8 70.8 9.8 C62.4 9.8 56.2 13.5 50 22.8Z" fill="url(#educart-heart-polish)"/></g></svg></span></span><svg class="formadores-orbit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><path id="educart-formadores-orbit-path" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs><text><textPath href="#educart-formadores-orbit-path" startOffset="0%" textLength="228" lengthAdjust="spacing">QUEM SOMOS ✦ QUEM SOMOS ✦ </textPath></text></svg>';
  style.textContent+=`
    #educartWelcomeScreen #educart-formadores-button{display:block;box-sizing:border-box;appearance:none;flex:0 0 auto;width:100%;height:auto;margin:0;padding:1px;background:none;border:0;box-shadow:none;border-radius:0;backdrop-filter:none;-webkit-backdrop-filter:none;text-align:left;font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
    #educartWelcomeScreen #educart-formadores-button .card-content{display:flex;width:100%;height:auto;min-height:48px;justify-content:center;align-items:center;gap:10px;padding-inline:0}
    #educartWelcomeScreen #educart-formadores-button .text-group{flex:0 1 auto;min-width:0}
    #educartWelcomeScreen #educart-formadores-button .card-title{white-space:nowrap}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart{position:relative;flex:0 0 36px;width:36px}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart::before,#educartWelcomeScreen #educart-formadores-button .formadores-heart::after{content:'';position:absolute;z-index:2;pointer-events:none;width:9px;height:9px;background:linear-gradient(135deg,#fff 10%,#fff2d0 45%,#e0b76a 80%);clip-path:polygon(50% 0,61% 38%,100% 50%,61% 62%,50% 100%,39% 62%,0 50%,39% 38%);filter:drop-shadow(0 0 2px #fff0b5);animation:educart-heart-sparkle 4s ease-in-out infinite}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart::before{top:-2px;right:-4px}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart::after{bottom:1px;left:-3px;width:6px;height:6px;animation-delay:1.4s}
    @keyframes educart-heart-sparkle{0%,100%{opacity:.45;transform:scale(.82)}45%{opacity:1;transform:scale(1.12)}70%{opacity:.65;transform:scale(.94)}}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart{display:grid;place-items:center;aspect-ratio:1;isolation:isolate;animation:educart-formadores-heartbeat 1.8s ease-in-out infinite;transform-origin:center;filter:drop-shadow(0 2px 1px #090c16b3) drop-shadow(0 4px 4px #0008) drop-shadow(0 0 3px #f2cc8d66)}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart-art{display:block;width:112%;max-width:none;height:auto;aspect-ratio:92/84;overflow:visible;filter:saturate(1.1) contrast(1.06)}
    @keyframes educart-formadores-heartbeat{0%,35%,70%,100%{transform:scale(1)}15%{transform:scale(1.14)}48%{transform:scale(1.07)}}
    @media(max-width:350px){#educartWelcomeScreen #educart-formadores-button .formadores-heart{flex-basis:33px;width:33px}}
    @media(min-width:601px){#educartWelcomeScreen #educart-formadores-button .formadores-heart{flex-basis:49px;width:49px}}
    @media(prefers-reduced-motion:reduce){#educartWelcomeScreen #educart-formadores-button .formadores-heart,#educartWelcomeScreen #educart-formadores-button .formadores-heart::before,#educartWelcomeScreen #educart-formadores-button .formadores-heart::after{animation:none}}
  `;
  style.textContent+=`
    #educartWelcomeScreen #educart-formadores-button{position:fixed!important;left:auto;right:max(9px,env(safe-area-inset-right));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483000!important;place-items:center;width:92px;height:92px;padding:0;margin:0;border:0;border-radius:0;appearance:none;background:none;box-shadow:none;text-align:center;touch-action:manipulation}
    #educartWelcomeScreen #educart-formadores-button:not([hidden]){display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
    #educartWelcomeScreen #educart-formadores-button[hidden]{display:none!important}
    #educartWelcomeScreen #educart-formadores-button .formadores-center{position:absolute;inset:0;display:grid;place-items:center;width:100%;height:100%;padding:0;margin:0;pointer-events:none}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart{width:36px;height:36px;min-width:0;min-height:0;flex:none;place-self:center;margin:0;padding:0;transform-origin:50% 50%}
    #educartWelcomeScreen #educart-formadores-button .formadores-heart-art{position:absolute;left:50%;top:50%;width:112%;height:auto;margin:0;transform:translate(-50%,-50%);max-width:none}
     #educartWelcomeScreen #educart-formadores-button .formadores-orbit{position:absolute;inset:0;margin:0;width:100%;height:100%;overflow:visible;pointer-events:none;animation:educart-formadores-orbit 20s linear infinite;transform-origin:center}
    #educartWelcomeScreen #educart-formadores-button .formadores-orbit text{fill:#ffe4ac;font:800 10.5px system-ui,sans-serif;letter-spacing:.5px;filter:drop-shadow(0 0 2px #edca83)}
    @keyframes educart-formadores-orbit{to{transform:rotate(360deg)}}
    #educartWelcomeScreen #educart-formadores-button:focus-visible{outline:2px solid #ffe2a4;outline-offset:2px}
    @media(max-width:680px){#educartWelcomeScreen #educart-formadores-button{bottom:calc(72px + env(safe-area-inset-bottom,0px));width:82px;height:82px}}
    @media(prefers-reduced-motion:reduce){#educartWelcomeScreen #educart-formadores-button .formadores-orbit{animation:none}}
  `;
  trigger.hidden=true;
  home.append(trigger);
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
  const opportunities=[{title:'Collab Talents Agency',label:'Primeira oportunidade · Casting',cover:'/og/colab-talents.png',url:'/oportunidades/colab-talents/'},{title:'Marcela Altberg',label:'Segunda oportunidade · Casting',cover:'/og/marcela-altberg.png',url:'/oportunidades/marcela-altberg/'}];
  dialog.innerHTML='<header><h2 id="educart-oportunidades-title">Oportunidades EducART</h2><button class="op-close" type="button" aria-label="Fechar" autofocus>×</button></header><p>Painel de embarque profissional para os artistas.</p><div class="op-cards" aria-label="Oportunidades disponíveis"></div>';
  const cards=dialog.querySelector('.op-cards');
  for(const opportunity of opportunities){
    const card=document.createElement('a');
    card.className='op-card';card.href=opportunity.url;
    card.setAttribute('aria-label','Ver detalhes: '+opportunity.title);
    const cover=document.createElement('img');cover.src=opportunity.cover;cover.width=1200;cover.height=630;cover.alt=opportunity.label+' — '+opportunity.title;
    const caption=document.createElement('span');caption.className='op-card-caption';caption.textContent='Ver detalhes da oportunidade →';
    card.append(cover,caption);cards.append(card);
  }
  document.body.append(dialog);
  link.setAttribute('aria-haspopup','dialog');
  link.setAttribute('aria-controls',dialog.id);
  const money=document.createElement('button');
  money.type='button';money.id='educart-money-button';
  money.setAttribute('aria-label','Primeira oportunidade — abrir Oportunidades EducART');
  money.setAttribute('aria-haspopup','dialog');money.setAttribute('aria-controls',dialog.id);
  money.title='Oportunidades EducART';
  money.innerHTML='<svg class="op-orbit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><path id="educart-op-orbit-path" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0"/></defs><text><textPath href="#educart-op-orbit-path" startOffset="0%" textLength="228" lengthAdjust="spacing">PRIMEIRA OPORTUNIDADE ✦ </textPath></text></svg><span class="op-money-symbol" aria-hidden="true">$</span>';
  style.textContent+=`
    #educart-oportunidades .op-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;margin-top:18px}
    #educart-oportunidades .op-card{display:block;overflow:hidden;border:1px solid #e8ce9f66;border-radius:16px;background:linear-gradient(155deg,#27364a,#101a29);color:#edca83;text-decoration:none;box-shadow:0 5px 16px #0005;touch-action:manipulation}
    #educart-oportunidades .op-card img{display:block;width:100%;height:auto;aspect-ratio:1200/630;object-fit:contain}
    #educart-oportunidades .op-card-caption{display:block;text-align:center;padding:12px;font:700 13px/1.4 system-ui,sans-serif}
    #educart-oportunidades .op-card:focus-visible{outline:2px solid #ffe2a4;outline-offset:3px}
    @media(hover:hover){#educart-oportunidades .op-card:hover{filter:brightness(1.12)}}
    #educart-money-button{position:fixed!important;left:max(9px,env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:2147483000!important;place-items:center;width:92px;height:92px;padding:0;border:0;border-radius:0;appearance:none;background:none;box-shadow:none;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    #educart-money-button:not([hidden]){display:grid!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
    #educart-money-button[hidden]{display:none!important}
    #educart-money-button .op-money-symbol{display:block;grid-area:1/1;font:900 38px/1 system-ui,sans-serif;color:#54ff82;text-shadow:0 -1px 0 #c4ffd2,0 2px 1px #135c2d,0 0 6px #45f875b3,0 0 14px #39e86b66;pointer-events:none}
    #educart-money-button .op-orbit{grid-area:1/1;width:100%;height:100%;overflow:visible;pointer-events:none;animation:educart-op-orbit 20s linear infinite;transform-origin:center}
    #educart-money-button .op-orbit text{fill:#baffce;font:800 10.5px system-ui,sans-serif;letter-spacing:.5px;filter:drop-shadow(0 0 2px #3ef675)}
    @keyframes educart-op-orbit{to{transform:rotate(360deg)}}
    #educart-money-button:focus-visible{outline:2px solid #7dff9b;outline-offset:2px}
    @media(max-width:680px){#educart-money-button{bottom:calc(72px + env(safe-area-inset-bottom,0px));width:82px;height:82px}}
    @media(hover:hover){#educart-money-button:hover .op-money-symbol{filter:brightness(1.18)}}
    @media(prefers-reduced-motion:reduce){#educart-money-button .op-orbit{animation:none}}
  `;
  function syncMoneyVisibility(){
    const pathname=location.pathname.replace(/\/index\.html$/,'').replace(/\/+$/,'')||'/';
    const home=document.getElementById('educartWelcomeScreen');
    const isHome=pathname==='/'&&!!home&&!home.hidden&&(document.body.classList.contains('welcome-pending')||getComputedStyle(home).display!=='none');
    const isArtists=pathname==='/artistas';
    const host=isHome?home:document.body;
    if(money.parentElement!==host)host.append(money);
    money.hidden=!(isHome||isArtists);
    const about=home?.querySelector('#educart-formadores-button');
    if(about)about.hidden=!isHome;
  }
  money.hidden=true;
  document.body.append(money);
  syncMoneyVisibility();
  new MutationObserver(syncMoneyVisibility).observe(document.body,{attributes:true,attributeFilter:['class']});
  const homeScreen=document.getElementById('educartWelcomeScreen');
  if(homeScreen)new MutationObserver(syncMoneyVisibility).observe(homeScreen,{attributes:true,attributeFilter:['hidden','class']});
  window.addEventListener('popstate',syncMoneyVisibility);
  window.addEventListener('pageshow',syncMoneyVisibility);
  let opener=link;
  function openOpportunities(event){
    if(event){event.preventDefault();opener=event.currentTarget;}
    if(!dialog.open)dialog.showModal();
  }
  link.addEventListener('click',openOpportunities);
  money.addEventListener('click',openOpportunities);
  dialog.querySelector('.op-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    const u=new URL(location.href);
    if(u.searchParams.get('oportunidade')==='colab-talents'){u.searchParams.delete('oportunidade');history.replaceState(history.state,'',u.pathname+u.search+u.hash)}
    if(opener?.isConnected&&!opener.hidden)opener.focus();
  });
  const requestedOpportunity=new URLSearchParams(location.search).get('oportunidade');
  if(requestedOpportunity==='colab-talents')location.replace(opportunities[0].url);
  else if(requestedOpportunity==='marcela-altberg')location.replace(opportunities[1].url);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close()}});
})();

/* EducART · revisão de coesão: navegação, acessibilidade e miniaturas originais. */
(function(){'use strict';
  if(document.getElementById('educart-coesao-visual-v1'))return;
  const style=document.createElement('style');style.id='educart-coesao-visual-v1';
  style.textContent=`
    .educart-areas-v231 a .area-label{min-width:0;max-width:100%;text-align:center;white-space:normal;overflow-wrap:anywhere}
    @media(max-width:560px){
      .educart-areas-v231 a{min-height:48px;line-height:1.15;padding-inline:1px}
      .educart-areas-v231 a[data-educart-area="oportunidades"] .area-label{font-size:clamp(9px,2.25vw,11px);line-height:1.15;overflow-wrap:anywhere}
    }
    @media(max-width:360px){.educart-areas-v231 a{font-size:9px;min-height:50px}.educart-areas-v231 a .area-label{line-height:1.12}}
    /* Correção global de responsividade: centralização independente dos efeitos glass. */
    html body .u-video>button{position:absolute!important;inset:0!important;margin:auto!important;width:max-content!important;height:max-content!important;max-width:calc(100% - 24px)!important;max-height:calc(100% - 24px);min-width:0!important;min-height:44px;box-sizing:border-box;transform:none!important;translate:none!important;white-space:normal!important;overflow-wrap:normal;text-align:center;line-height:1.2!important;padding:9px 16px!important}
    @media(max-width:730px){html body .u-video>button{font-size:clamp(11px,3.2vw,13px)!important;padding:8px 12px!important}}
    @media(max-width:560px){
      html body nav.educart-areas-v231{display:grid!important;grid-template-columns:minmax(0,.85fr) minmax(0,.85fr) minmax(0,.95fr) minmax(0,1.15fr) minmax(0,.85fr) minmax(0,1.4fr);gap:2px;padding-inline:4px}
      html body nav.educart-areas-v231 a{min-width:0;padding-inline:0!important;font-size:clamp(8.5px,2.3vw,11px)!important}
      html body nav.educart-areas-v231 a .area-label{max-width:100%;white-space:nowrap!important;overflow-wrap:normal!important;word-break:normal!important;letter-spacing:-.025em}
      html body nav.educart-areas-v231 a[data-educart-area="oportunidades"] .area-label{font-size:clamp(8px,2.15vw,11px)!important;white-space:nowrap!important;overflow-wrap:normal!important;word-break:normal!important}
    }
    a.photo:focus-visible,a.drive-thumbnail:focus-visible,.educart-media-grid a:focus-visible,.u-tabs button:focus-visible{outline:2px solid #f0c787;outline-offset:3px}
    .educart-media-grid .photo img[hidden],a.photo img[data-educart-unavailable]{display:none!important}
    .educart-media-grid .photo img[hidden]+.media-fallback{display:flex}
    .educart-original-fallback{display:flex;align-items:center;justify-content:center;width:100%;aspect-ratio:16/11;box-sizing:border-box;padding:12px;text-align:center;font:700 12px/1.35 system-ui,sans-serif;color:#f0c787;background:#17283e}
    @media(max-width:730px){.educart-original-fallback,.educart-media-grid .photo .media-fallback{aspect-ratio:4/3}}
    .educart-media-grid .media-label{line-height:1.35;word-break:break-word}
    @media(prefers-reduced-motion:reduce){.educart-areas-v231 a,.educart-media-grid a{transition:none!important}}
  `;
  document.head.append(style);
  // A imagem falhou: o clique permanece no arquivo exato, sem trocar de fonte.
  function preserveOriginal(img){
    if(!(img instanceof HTMLImageElement))return;
    const a=img.closest('a.photo[href^="https://drive.google.com/file/d/"]');
    if(!a||a.querySelector('.media-fallback,.educart-original-fallback')||img.hasAttribute('data-album-fallback'))return;
    img.hidden=true;img.setAttribute('data-educart-unavailable','');
    const fallback=document.createElement('span');fallback.className='educart-original-fallback';fallback.textContent='Abrir original no Drive ↗';img.after(fallback);
  }
  document.addEventListener('error',event=>preserveOriginal(event.target),true);
  document.querySelectorAll('a.photo[href^="https://drive.google.com/file/d/"] img').forEach(img=>{
    if(img.complete&&img.naturalWidth===0)preserveOriginal(img);
  });
})();

/* EducART — experiências formativas dentro da Escola; preserva as portas da home. */
(function(){'use strict';const portal=document.getElementById('portalView');if(!portal)return;const section=document.createElement('section');section.id='educart-experiencias-formativas';section.style.cssText='max-width:1000px;margin:24px auto;padding:16px 18px;color:inherit';section.innerHTML='<h2 style="font-size:clamp(22px,4vw,30px);margin:0 0 8px">Experiências Formativas</h2><p>Conheça aulas, oficinas e processos de formação teatral na prática.</p><a class="ux-glass-primary" style="display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:9px 15px;text-decoration:none" href="/escola/experiencias-formativas/">Explorar experiências formativas ↗</a>';if(!document.getElementById(section.id))portal.append(section);for(const person of document.querySelectorAll('.conhecaPerson')){const name=person.querySelector('h3')?.textContent.trim();const dest=name&&(/Aline Nepomuceno/i.test(name)?'aline-nepomuceno':/Ant[oô]nio Marques/i.test(name)?'antonio-marques':/Felipe Bispo/i.test(name)?'felipe-bispo':'');if(!dest||person.querySelector('[data-educart-full-profile]'))continue;const a=document.createElement('a');a.dataset.educartFullProfile='1';a.className='conhecaFonte';a.href='/artistas/perfil/'+dest+'/';a.textContent='Portfólio completo ↗';(person.querySelector('.conhecaBio')||person).append(a)}})();

/* Houston · player modal único para vídeos Google Drive. Fotografias e documentos mantêm a navegação original. */
(function(){
 'use strict';
 if(document.getElementById('educart-drive-video-modal'))return;
 const idPattern=/^[A-Za-z0-9_-]{15,}$/;
 function driveId(url){try{const u=new URL(url,location.href);if(u.origin!=='https://drive.google.com')return '';return u.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]{15,})(?:\/(?:view|preview))?\/?$/)?.[1]||''}catch{return ''}}
 const style=document.createElement('style');style.textContent='#educart-drive-video-modal{box-sizing:border-box;width:min(780px,calc(100% - 24px));max-width:none;max-height:calc(100dvh - 24px);margin:auto;padding:14px;border:1px solid #dbc18b80;border-radius:18px;background:#111c2d;color:#fff8eb;box-shadow:0 18px 65px #000a;overflow:auto;font:15px/1.45 system-ui,sans-serif}#educart-drive-video-modal::backdrop{background:#050a13d9;backdrop-filter:blur(5px)}#educart-drive-video-modal header{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}#educart-drive-video-modal h2{font:700 clamp(16px,4vw,22px)/1.3 system-ui;margin:0;overflow-wrap:anywhere}#educart-drive-video-modal button{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid #eacb9366;background:#26364d;color:white;font-size:26px;cursor:pointer}#educart-drive-video-modal .drive-player{width:100%;aspect-ratio:16/9;background:#0c1523;border-radius:10px;overflow:hidden}#educart-drive-video-modal iframe{display:block;width:100%;height:100%;border:0}#educart-drive-video-modal footer{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding-top:12px}#educart-drive-video-modal a{color:#f1cb88;text-decoration:underline}#educart-drive-video-modal :focus-visible{outline:2px solid #f0c787;outline-offset:3px}';
 document.head.append(style);
 const d=document.createElement('dialog');d.id='educart-drive-video-modal';d.setAttribute('aria-labelledby','educart-drive-video-title');
 d.innerHTML='<header><h2 id="educart-drive-video-title">Vídeo</h2><button type="button" aria-label="Fechar vídeo" title="Fechar vídeo">×</button></header><div class="drive-player"></div><footer><a data-drive-external target="_blank" rel="noopener noreferrer">Abrir original no Drive ↗</a><small>O Drive pode solicitar autorização de acesso.</small></footer>';
 document.body.append(d);const player=d.querySelector('.drive-player'),close=d.querySelector('button'),heading=d.querySelector('h2'),original=d.querySelector('a');
 let opener=null;
 function clear(){player.replaceChildren()}
 function shut(){clear();if(d.open)d.close()}
 d.addEventListener('close',()=>{clear();const el=opener;opener=null;if(el?.isConnected)el.focus({preventScroll:true})});
 d.addEventListener('cancel',e=>{e.preventDefault();shut()});
 close.addEventListener('click',shut);
 d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)shut()});
 window.addEventListener('pagehide',shut);
 function open(id,title,trigger){if(!idPattern.test(id))return;clear();opener=trigger;heading.textContent=title||'Registro audiovisual';original.href='https://drive.google.com/file/d/'+id+'/view';const f=document.createElement('iframe');f.title=heading.textContent;f.src='https://drive.google.com/file/d/'+id+'/preview';f.allow='autoplay; fullscreen; encrypted-media; picture-in-picture';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';player.append(f);if(!d.open)d.showModal();close.focus({preventScroll:true})}
 function titleOf(el){return (el.closest('article,.u-block,.cast-overview-video')?.querySelector('h3,h4')?.textContent||el.getAttribute('aria-label')||el.textContent||'Registro audiovisual').trim().replace(/↗/g,'').trim()}
 // Substitui embeds de vídeo explicitamente identificados; não interfere com PDF.
 for(const frame of document.querySelectorAll('iframe[src*="drive.google.com/file/d/"]')){
  const id=driveId(frame.src),label=frame.title||'';if(!id||!/v[ií]deo|audiovisual|filmagem|grava[cç][aã]o/i.test(label))continue;
  const button=document.createElement('button');button.type='button';button.dataset.drive=id;button.className='ux-glass-primary';button.textContent='▶ Assistir ao vídeo';button.setAttribute('aria-label',label);button.style.cssText='margin:12px auto;min-height:44px;padding:10px 16px;display:block';frame.replaceWith(button);
 }
 document.addEventListener('click',e=>{
  const el=e.target instanceof Element?e.target.closest('button[data-drive],a[href]'):null;if(!el||el.closest('#educart-drive-video-modal'))return;
  let id=el.dataset.drive||'';
  if(el.tagName==='BUTTON'&&(el.dataset.youtube||el.dataset.playVideo))return;
  if(el.tagName==='A'){
   if(el.hasAttribute('data-drive-external')||el.querySelector('img')||el.closest('figure,.educart-media-grid,.u-grid-photos')||el.matches('.photo,.drive-thumbnail'))return;
   id=driveId(el.href);if(!id)return;
   const label=el.textContent.trim(),institution=location.pathname.startsWith('/acervo/registros-institucionais/');
   const sameCard=[...el.closest('article,.u-block')?.querySelectorAll('button[data-drive]')||[]].some(b=>b.dataset.drive===id);
   if(!sameCard&&!/v[ií]deo|audiovisual|selftape|filmagem|\.mov\b|\.mp4\b/i.test(label)&&!(institution&&/^Registro\s+\d+/i.test(label)))return;
   if(/\.pdf\b|documento|fotografia|retrato|imagem/i.test(label))return;
  }
  if(!idPattern.test(id))return;
  e.preventDefault();e.stopImmediatePropagation();open(id,titleOf(el),el);
 },true);
})();

/* Formações adicionais: vínculos docentes confirmados, separados das propostas sem professor. */
(function(){
 'use strict';
 const records={
  'aline nepomuceno':[{title:'EducART & Eloquence',state:'Experiência realizada',desc:'Construção de personagens, ensaios e apresentação cênica.',href:'/escola/experiencias-formativas/#eloquence'}],
  'antonio marques':[{title:'Teatro Musical',state:'Experiência realizada',desc:'Atividade formativa de teatro musical.',href:'/escola/experiencias-formativas/#teatro-musical'}],
  'felipe bispo':[{title:'Curso de Expressão',state:'Realizada · 15/11/2025',desc:'Curso de Expressão na TV Pelourinho.',href:'/escola/experiencias-formativas/#curso-de-expressao'}],
  'fernando santana':[{title:'Da Palavra à Atuação',state:'Fila de espera · SOL-032',desc:'Dramaturgia, interpretação e construção cênica. Domingos, 9h às 13h. Início a definir.',solution:'SOL-032'}],
  'deko alves':[],'eric flavio':[],'marcelo jardim':[],'marcia gil-braz':[],'taiana lemos':[],'tassia gramacho':[]
 };
 const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s*\(alininha\)\s*$/i,'').trim().toLowerCase();
 const style=document.createElement('style');style.textContent='.educart-docent-offers{margin:12px 0;padding:14px;border:1px solid #d8b87866;border-radius:14px;background:linear-gradient(150deg,#d8b87813,#18283e44);color:inherit}.educart-docent-offers h3,.educart-docent-offers h4{margin:0 0 8px;color:#f1ce8c;font-size:1rem}.educart-docent-offers .offer-item{padding:10px 0;border-top:1px solid #d8b87833}.educart-docent-offers .offer-item:first-of-type{border-top:0}.educart-docent-offers strong{display:block}.educart-docent-offers small{display:block;color:#d6c8ad;margin:4px 0}.educart-docent-offers p{margin:5px 0 9px}.educart-docent-offers button,.educart-docent-offers a{display:inline-flex;align-items:center;min-height:36px;color:#f1ce8c;background:none;border:0;text-decoration:underline;cursor:pointer;text-align:left;padding:0;font:inherit;font-weight:700}';
 document.head.append(style);
 function node(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e}
 function section(name,card){
  const list=records[norm(name)];if(!list||card.querySelector('.educart-docent-offers'))return;
  const box=node('section');box.className='educart-docent-offers';box.setAttribute('aria-label','Formações adicionais oferecidas');
  box.append(node(card.matches('.conhecaPerson')?'h4':'h3','Formações adicionais e experiências'));
  if(!list.length)box.append(node('p','Ofertas específicas a confirmar pela coordenação.'));
  for(const item of list){
   const row=node('div');row.className='offer-item';row.append(node('strong',item.title),node('small',item.state),node('p',item.desc));
   if(item.solution){const btn=node('button','Ver formação e fila de espera ↗');btn.type='button';btn.addEventListener('click',()=>{const dialog=btn.closest('dialog');if(dialog?.open)dialog.close();document.dispatchEvent(new CustomEvent('houston:open-additional-solution',{detail:{id:item.solution,origin:document.querySelector('#educart-formadores-button')||btn}}))});row.append(btn)}
   if(item.href){const link=node('a','Conhecer a experiência ↗');link.href=item.href;row.append(link)}
   box.append(row);
  }
  if(card.matches('.conhecaPerson')){const content=card.querySelector('.conhecaPersonContent')||card;const bio=content.querySelector('.conhecaBio');if(bio)bio.before(box);else content.append(box)}
  else {const intro=card.querySelector('.u-intro');const header=card.querySelector('.profile-head');(header||intro||card.firstElementChild)?.after(box)}
 }
 function update(){
  for(const card of document.querySelectorAll('.conhecaPerson')){const name=card.querySelector('h3')?.textContent||'';section(name,card);if(norm(name)==='aline nepomuceno'){const content=card.querySelector('.conhecaPersonContent')||card;if(!content.querySelector('.educart-coordination-profile')){const link=node('a','Conhecer a coordenadora ↗');link.className='conhecaFonte educart-coordination-profile';link.href='/artistas/perfil/aline-nepomuceno/';content.querySelector('.conhecaRole')?.after(link)}}}
  const profile=document.querySelector('main.shell>.profile');if(profile)section(profile.querySelector('h1')?.textContent||'',profile);
 }
 update();const target=document.querySelector('#educart-formadores-modal .formadores-content');if(target)new MutationObserver(update).observe(target,{childList:true});
})();
