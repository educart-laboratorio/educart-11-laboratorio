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