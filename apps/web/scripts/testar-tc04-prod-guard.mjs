// Contrato negativo: o ambiente PROD incompleto nao consulta os modulos DEV.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const p=fs.readFileSync('src/app/admin/page.tsx','utf8');
const a=fs.readFileSync('src/components/AdminRotinaAcademicaLab.tsx','utf8');
assert(p.includes("? 'academico' : 'secretaria'"),'PROD nao inicia na secretaria');
assert(p.includes("disabled={!ACOES_ACADEMICAS_EXCLUSIVAS_DEV && item.id!=='pessoas'}"),'Menu PROD habilita areas nao homologadas');
assert(p.includes("destino==='inscricoes'||['visao','turmas','estudantes','docentes','agenda','frequencia'].includes(destino)"),'Rota academica em PROD sem fallback');
const ini=a.indexOf("const atualizarIndicadores=useCallback(async()=>{");
const guarda=a.indexOf("if(!ACOES_ACADEMICAS_EXCLUSIVAS_DEV)",ini);
const consulta=a.indexOf("supabase.from('educart_aulas_dev')",ini);
assert(guarda>ini && consulta>guarda,'Consulta academica ocorre antes do portao');
assert(a.includes('O banco oficial ainda não contém as tabelas'),'PROD sem aviso honesto de homologacao');
console.log('TC04: PROD nao tenta consultas academicas DEV; inicia na Secretaria legada.');
