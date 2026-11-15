/** R32 — cartazes inteiros abrem Conhecer sem eliminar links, inscrição ou indisponibilidade. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pagina=readFileSync('src/app/formacao/page.tsx','utf8');
const css=readFileSync('src/app/entrada.css','utf8');
assert.equal((pagina.match(/className="eg-course-open"/g)||[]).length,2,
 'Os dois cartões devem ter uma área clicável inteira');
assert(pagina.includes("onClick={()=>setDetalhe('formacao')}")&&
 pagina.includes("onClick={()=>setDetalhe('expressao')}"),
 'Os cartazes precisam abrir o detalhe correspondente');
assert(pagina.includes('janela.showModal()')&&pagina.includes('janela.close()')&&
 pagina.includes('onCancel={e=>{e.preventDefault();setDetalhe(null);}}')&&
 pagina.includes('aria-labelledby="eg-conhecer-titulo"'),
 'Conhecer deve abrir uma janela nativa acessível, fechável também por Escape');
assert(pagina.includes('>Conhecer</button>')&&
 pagina.includes('<Link className="eg-button" href={href}>Quero me inscrever'),
 'Conhecer e Quero me inscrever são ações distintas');
assert(pagina.includes('detalhe===\'expressao\'')&&
 pagina.includes('Indisponível para inscrições avulsas')&&
 pagina.includes('fernando-santana-cartaz-referencia-dev.png'),
 'Atividade exclusiva deve poder ser conhecida sem oferecer matrícula');
assert(css.includes('.eg-course-open{position:absolute;inset:0;')&&
 css.includes('.eg-course .eg-course-info{z-index:3;pointer-events:none}')&&
 css.includes('.eg-course .eg-course-info a,.eg-course .eg-course-info button{pointer-events:auto'),
 'Cartaz inteiro clicável, links e botões originais ainda acessíveis');
assert(css.includes('object-position:center top')&&
 css.includes('.eg-cover-poster{height:350px;'),
 'Recorte inferior da imagem maior deve continuar preservado');
console.log('R32 PASS: dois cartões inteiramente clicáveis abrem Conhecer, links preservados, atividade exclusiva não matriculável.');
