import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const files=[
"src/app/admin/page.tsx",
"src/components/AdminGestaoInscricoesDev.tsx",
"src/components/AdminRotinaAcademicaLab.tsx",
"src/components/AdminChamadasDev.tsx",
"src/components/AdminMatriculaUnificadaDev.tsx"
];
let count=0;
for(const file of files){
  const code=read(file);
  assert(code.includes("import { AdminAjuda } from '@/components/AdminAjuda';"),'Import ausente: '+file);
  const headings=[...code.matchAll(/<(h[1-4])(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)];
  assert(headings.length,'Títulos ausentes: '+file);
  for(const heading of headings){
    if(heading[2].includes('selectedInscricao.nome_completo'))continue;
    assert(heading[2].includes('<AdminAjuda '),'Título sem ajuda: '+file+' '+heading[2].slice(0,60));
    count++;
  }
}
assert(count>=12,'Ajuda contextual insuficiente nas telas ativas: '+count);
const main=read('src/app/admin/page.tsx'),academic=read('src/components/AdminRotinaAcademicaLab.tsx');
assert(main.includes('admin-area-option')&&main.includes('<AdminAjuda titulo={item.nome}'),
 'Ajuda contextual dos quatro grupos deve permanecer.');
assert(main.includes('admin-subarea-selector')&&academic.includes('<AdminAjuda titulo="Acadêmico"'),
 'Navegação contextual não pode retirar ajuda das telas acadêmicas.');
const help=read('src/components/AdminAjuda.tsx');
for(const s of ['type="button"','aria-expanded','aria-controls','role="region"',"e.key === 'Escape'","addEventListener('pointerdown'","removeEventListener('pointerdown'","passos","cuidado"])assert(help.includes(s),'Acessibilidade: '+s);
const css=read('src/app/admin/admin.css');
for(const s of ['.admin-layout-root .admin-help .admin-help-trigger','.admin-layout-root .admin-help .admin-help-balloon','@media (max-width:640px)','@media (forced-colors:active)'])assert(css.includes(s),'CSS: '+s);
console.log('R10 PASS: '+count+' títulos com ajuda, 4 destinos, subáreas contextuais, toque e teclado; sem deploy.');
