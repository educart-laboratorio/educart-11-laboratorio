import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gerarCsvExcel, csvCellSeguro } from '../src/lib/csv-seguro.ts';

const fonte = caminho => fs.readFileSync(caminho,'utf8');
const admin = fonte('src/app/admin/page.tsx');
const academia = fonte('src/components/AdminRotinaAcademicaLab.tsx');
const turmas = fonte('src/components/AdminPlanejamentoFormacaoTurmaDev.tsx');
const planoSql = fonte('../../supabase/security-review/EDUCART_11_DEV_PLANEJAMENTO_FORMACAO_TURMA_GUIADA_20261105.sql');
const css = fonte('src/app/admin/admin.css');

const csv = gerarCsvExcel(
  ['Nome Completo', 'WhatsApp', 'Detalhes da Experiência'],
  [['Ana "Teste"', '71999998888', '=1+1'], ['Pessoa; Exemplo', '71988887777', 'texto']],
);
assert.ok(csv.startsWith('\uFEFFsep=;\r\n'), 'Excel reconhecerá ponto e vírgula');
assert.ok(csv.includes('"Nome Completo";"WhatsApp";"Detalhes da Experiência"\r\n'));
assert.ok(csv.includes('"Ana ""Teste""";"71999998888";"\'=1+1"'), 'aspas escapadas e fórmula desativada');
assert.ok(csv.includes('"Pessoa; Exemplo";"71988887777";"texto"'), 'separador dentro de célula preservado');
assert.match(csvCellSeguro('   +1'), /^"'\s+\+1"$/, 'proteção contra fórmulas com espaços');
assert.throws(() => gerarCsvExcel(['a', 'b'], [['a']]), /colunas? inconsistentes?/);

assert.match(admin, /gerarCsvExcel\(headers, rows\)/, 'dashboard utiliza gerador testado');
assert.match(admin, /<AdminRotinaAcademicaLab supabase=\{supabase\} podeGerir=\{podeAlterarStatus\}/);
assert.match(admin, /id:'turmas'/, 'Formações e turmas permanece acessível no menu contextual');
assert.match(academia, /<AdminPlanejamentoFormacaoTurmaDev supabase=\{supabase\} podeGerir=\{podeGerir\}/);
assert.match(turmas, /from\('formacoes'\)/);
assert.match(turmas, /from\('turmas'\)/);
assert.match(turmas, /obterPapeisGestao/);
assert.match(turmas, /includes\('coordenacao'\)/);
assert.match(turmas, /educart_criar_formacao_turma_guiada_dev/);
assert.match(turmas, /horarios_semanais/);
assert.match(planoSql, /'planejada'/);
assert.match(planoSql, /v_nome,v_tipo,false/);
assert.doesNotMatch(turmas, /database-prod|service_role|sb_secret_|\.from\('inscricoes_oficina'\)/);
assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(academia, /<AdminChamadasDev/);
assert.doesNotMatch(academia, /FICTICIOS|NOMES_DEMONSTRACAO/);

console.log('OK: CSV Excel pt-BR, isolamento DEV, RLS/RBAC, turmas e demonstrações preservadas.');
