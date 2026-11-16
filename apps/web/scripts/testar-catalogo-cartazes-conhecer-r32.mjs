/** R32 / piso publico — cartoes Conhecer, inscricoes suspensas e sem imagem nao autorizada. */
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
 pagina.includes('<Link className="eg-button" href={href}>Consultar inscrições'),
 'Conhecer e consulta das inscricoes sao acoes distintas');
assert(pagina.includes('detalhe===\'expressao\'')&&
 pagina.includes('Indisponível para inscrições avulsas')&&
 pagina.includes('eg-cover-texto')&&
 !pagina.includes('fernando-santana-cartaz-referencia-dev.png')&&
 pagina.includes('Inscrições online temporariamente suspensas'),
 'Atividade exclusiva deve ser conhecida sem cartaz nao autorizado nem promessa de inscricao');
assert(css.includes('.eg-course-open{position:absolute;inset:0;')&&
 css.includes('.eg-course .eg-course-info{z-index:3;pointer-events:none}')&&
 css.includes('.eg-course .eg-course-info a,.eg-course .eg-course-info button{pointer-events:auto'),
 'Cartaz inteiro clicável, links e botões originais ainda acessíveis');
assert(css.includes('.eg-cover-texto span{')&&
 css.includes('height:350px;overflow:hidden;background:linear-gradient'),
 'Capa tipografica preserva a leitura sem fotografia nao autorizada');
console.log('R32 PASS: dois cartoes Conhecer, sem cartaz nao autorizado e inscricoes online suspensas na vitrine.');
