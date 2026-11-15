import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { horarioSemanalNaData } from '../src/lib/academico/horario-turma.ts';
const gradeA=[{dia:6,inicio:'09:00',fim:'11:00'},{dia:2,inicio:'18:30',fim:'20:00'}];
const gradeB=[{dia:6,inicio:'15:00',fim:'17:00'}];
assert.deepEqual(horarioSemanalNaData(gradeA,'2026-11-07'),gradeA[0]); // sábado
assert.deepEqual(horarioSemanalNaData(gradeA,'2026-11-10'),gradeA[1]); // terça
assert.deepEqual(horarioSemanalNaData(gradeB,'2026-11-07'),gradeB[0]); // mesma data, outra turma
assert.equal(horarioSemanalNaData(gradeA,'2026-11-08'),null); // sem encontro nesse dia
assert.equal(horarioSemanalNaData([], '2026-11-07'),null); // turma legada sem grade
assert.equal(horarioSemanalNaData(null, '2026-11-07'),null);
assert.equal(horarioSemanalNaData(gradeA,'2026-02-30'),null); // data impossível
assert.equal(horarioSemanalNaData(gradeA,'2026-11-7'),null); // ISO incompleto
assert.equal(horarioSemanalNaData([{dia:6,inicio:'25:00',fim:'26:00'}],'2026-11-07'),null);
assert.equal(horarioSemanalNaData([{dia:6,inicio:'17:00',fim:'15:00'}],'2026-11-07'),null);
const ui=readFileSync('src/components/AdminChamadasDev.tsx','utf8');
assert.match(ui,/select\('id,codigo,horarios_semanais'\)/);
assert.match(ui,/horarioSemanalNaData\(gradeDaTurma, dataAula\)/);
assert.match(ui,/Ajuste manualmente apenas se a aula for excepcional/);
assert.match(ui,/Esta turma ainda não possui horários semanais cadastrados/);
assert.doesNotMatch(ui,/useState\('15:00'\)|useState\('17:00'\)/);
console.log('Q10 R12.2 PASS: sugestões por dia e turma sem horário universal; exceções continuam manuais.');
