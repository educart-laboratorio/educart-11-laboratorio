/* EducART V23.1: navegação aditiva, preserva a Houston */
(function(){'use strict';
const school=location.pathname==='/'||location.pathname==='/index.html';
const welcome=document.getElementById('educartWelcomeScreen');
const here=school?'escola':location.pathname.startsWith('/espetaculos')?'espetaculos':'artistas';
const s=document.createElement('style');s.id='educart-navigation-v231';
s.textContent='.educart-areas-v231{position:fixed;z-index:19990;bottom:max(8px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(560px,calc(100% - 16px));display:flex;gap:3px;padding:5px;border:1px solid #f7d56a;border-radius:18px;background:#fbbf24;box-shadow:0 6px 26px #0009;backdrop-filter:blur(12px)}.educart-areas-v231 a{flex:1;min-width:0;text-align:center;padding:9px 0;color:#16191f;text-decoration:none;border-radius:13px;font:600 11px/1.3 system-ui,sans-serif;white-space:nowrap}.educart-areas-v231 a[aria-current="page"]{background:#e8a317;color:#16191f}.educart-areas-v231 a:focus-visible,.experienceBar .expBrand--nine:focus-visible{outline:3px solid #ffc56f;outline-offset:3px}body:not(.welcome-pending){padding-bottom:70px!important}body.welcome-pending .educart-areas-v231{display:none!important}.experienceBar .expBrand--nine{cursor:pointer!important}';
document.head.appendChild(s);
const n=document.createElement('nav');n.className='educart-areas-v231';n.setAttribute('aria-label','Áreas da EducART');
for(const x of [['inicio','⌂ Início','/'],['escola','▣ Escola','/?area=escola'],['artistas','🎭 Artistas','/artistas/'],['espetaculos','✦ Espetáculos','/espetaculos/']]){
 const a=document.createElement('a');a.href=x[2];a.textContent=x[1];a.dataset.educartArea=x[0];if(here===x[0])a.setAttribute('aria-current','page');n.appendChild(a);}
document.body.appendChild(n);
function enterSchool(){if(!school||!welcome)return;
 const portal=document.getElementById('portalView'),form=document.getElementById('formacaoView'),bar=document.querySelector('body > .experienceBar');
 if(portal){portal.hidden=false;portal.inert=false;}if(form){form.hidden=true;form.inert=false;}if(bar)bar.inert=false;
 const expanded=document.getElementById('expandedJourney');if(expanded&&'open' in expanded)expanded.open=false;
 welcome.hidden=true;document.body.classList.remove('welcome-pending');window.scrollTo(0,0);}
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
    #educartWelcomeScreen .educart-door-pair .card-title{font-size:clamp(10px,3.2vw,17px);white-space:nowrap;letter-spacing:-.025em}
    #educartWelcomeScreen .educart-door-pair .card-subtitle{font-size:clamp(8px,2vw,10px)}
    #educartWelcomeScreen .card-agenda{--ref-left:rgba(52,83,139,.75);--ref-right:rgba(46,74,128,.70);--ref-border:rgba(123,155,220,.78);--ref-glow:rgba(100,151,240,.43);--ref-subtitle:#d2e2fc;animation:educart-agenda-glow 3s ease-in-out infinite alternate}
    @keyframes educart-agenda-glow{from{box-shadow:0 0 13px 2px rgba(100,151,240,.35),0 0 3px 1px var(--ref-border),inset 0 2px 4px rgba(255,255,255,.22),0 7px 14px rgba(0,0,0,.20)}to{box-shadow:0 0 20px 3px rgba(100,151,240,.49),0 0 4px 1px var(--ref-border),inset 0 2px 5px rgba(255,255,255,.25),0 7px 14px rgba(0,0,0,.20)}}
    @media(prefers-reduced-motion:reduce){#educartWelcomeScreen .card-agenda{animation:none}}
    #educartWelcomeScreen .card-agenda .icon-wrapper{display:grid;place-items:center;color:#dceaff;background:linear-gradient(135deg,#557cb9,#294678)}
    #educartWelcomeScreen .card-agenda .icon-wrapper svg{opacity:1;width:68%;height:68%}
    #educartWelcomeScreen .card-agenda .arrow-wrapper{color:#a8c6f9}
    @media(max-width:420px){#educartWelcomeScreen .educart-door-pair{gap:7px}#educartWelcomeScreen .educart-door-pair .card-subtitle{display:none}#educartWelcomeScreen .educart-door-pair .card-content{padding:4px 5px;gap:3px}}
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
