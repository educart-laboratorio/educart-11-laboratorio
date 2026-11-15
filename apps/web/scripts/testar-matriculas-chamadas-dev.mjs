/** Registros acadêmicos na interface operacional real, sem tela de leitura redundante. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ler=p=>readFileSync(p,'utf8');
const admin=ler('src/app/admin/page.tsx');
const academia=ler('src/components/AdminRotinaAcademicaLab.tsx');
const chamadas=ler('src/components/AdminChamadasDev.tsx');
assert.match(admin, /<AdminRotinaAcademicaLab/);
assert.match(academia, /<AdminChamadasDev/);
assert.match(chamadas, /supabase\.auth\.getUser\(\)/);
assert.match(chamadas, /obterPapeisGestao/);
for(const tabela of ['turmas','matriculas','educart_aulas_dev','educart_chamadas_dev','educart_chamadas_historico_dev']){
 assert(chamadas.includes("'"+tabela+"'"),'Fonte acadêmica ausente: '+tabela);
}
assert.match(chamadas, /motivo_ajuste/);
assert.match(chamadas, /role="alert"/);
assert.doesNotMatch(chamadas, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
console.log('LIPE: módulo único de aulas, matrículas e chamadas, com autorização e histórico.');
