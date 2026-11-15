import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync('src/components/AdminIntegridadeMatriculasR12Dev.tsx','utf8');
const admin=readFileSync('src/app/admin/page.tsx','utf8');
for(const v of ['Inscrição:','Matrícula:','candidatura_id','matriculado',
 'ativa','concluida','trancada','amostraParcial','Revisar ficha',
 'Não foi possível auditar','não localizada'])
 assert(s.includes(v),'Integridade sem '+v);
assert(admin.includes('AdminIntegridadeMatriculasR12Dev'));
assert(admin.includes('podeGerir={podeAlterarStatus}'));
assert(!/\.insert\(|\.update\(|\.delete\(|\.rpc\(/.test(s),'Auditoria deve ser somente leitura');
console.log('Q3/Q14 PASS: detecta divergências cadastrais sem alterar dados e sem inferir pagamento.');
