import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// R26: contrato estrutural; exige prova E2E autenticada para homologação.
const rotina=readFileSync('src/components/AdminRotinaAcademicaLab.tsx','utf8');
const alunos=readFileSync('src/components/AdminEstudantesDev.tsx','utf8');
const painel=readFileSync('src/app/admin/page.tsx','utf8');
const css=readFileSync('src/app/admin/admin.css','utf8');
assert(rotina.includes('role="search" aria-label="Localizar estudante da EducART"'));
assert(rotina.includes("onSolicitarSecao('estudantes')"));
assert(rotina.includes("buscaInicial={buscaEncaminhada??''}")&&rotina.includes('focarBuscaInicial={buscaEncaminhada!==null}'));
assert(alunos.includes('useState(buscaInicial)')&&alunos.includes('buscaRef.current?.focus()'));
assert(alunos.includes('ref={buscaRef} id="academico-aluno-busca"'));
assert(alunos.includes('onClick={()=>setVisualizarPessoaId(p.id)}')&&alunos.includes('Perfil de '));
assert(painel.includes('const solicitarDestino=(destino:DestinoAdmin)=>')&&painel.includes('setDestinoSolicitado(destino)'));
assert(css.includes('.admin-tarefa-busca')&&css.includes('@media(max-width:900px)'));
console.log('R26 PASS: atalho busca → filtro e perfil existentes, sem gravação.');
