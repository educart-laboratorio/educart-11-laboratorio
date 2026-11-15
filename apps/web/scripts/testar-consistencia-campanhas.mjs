import assert from 'node:assert/strict';
import fs from 'node:fs';
import { csvCellSeguro } from '../src/lib/csv-seguro.ts';
import {
  CAMPANHA_FORMACAO_ATUAL,
  CAMPANHA_INTERESSE_FORMACAO_ANTERIOR,
  CAMPANHA_OUTUBRO_2026,
  classificarCampanha,
} from '../src/lib/campanhas.ts';

// Cenário sintético representando o histórico: nenhum dado real é carregado.
const inscricoes = [
  ...Array.from({ length: 2 }, () => ({ turma_campanha: CAMPANHA_FORMACAO_ATUAL })),
  ...Array.from({ length: 10 }, () => ({ turma_campanha: CAMPANHA_OUTUBRO_2026 })),
  { turma_campanha: 'Nova campanha sem classificação' },
];
const totalPorGrupo = (grupo) => inscricoes.filter((i) => classificarCampanha(i.turma_campanha) === grupo).length;
assert.equal(totalPorGrupo('formacao'), 2);
assert.equal(totalPorGrupo('historico'), 10);
assert.equal(totalPorGrupo('outras'), 1);
assert.equal(totalPorGrupo('formacao') + totalPorGrupo('historico') + totalPorGrupo('outras'), inscricoes.length);
assert.equal(classificarCampanha(CAMPANHA_INTERESSE_FORMACAO_ANTERIOR), 'formacao');
assert.equal(classificarCampanha('  TURMA DE OUTUBRO / 2026  '), 'historico');
assert.equal(classificarCampanha(''), 'outras');
assert.equal(classificarCampanha(null), 'outras');

const admin = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
const payload = fs.readFileSync('src/lib/inscricao-validation.ts', 'utf8');
const oficial = fs.readFileSync('src/components/InscricaoForm.tsx', 'utf8');
const workflow = fs.readFileSync('../../.github/workflows/validar-inscricao-responsiva-lab.yml', 'utf8');

assert.match(admin, /useState<FiltroCampanha>\('formacao'\)/);
assert.match(admin, /const inscricoesDaCampanha = useMemo/);
assert.match(admin, /const total = inscricoesDaCampanha.length/);
assert.match(admin, /filteredInscricoes\.map\(\(i\) =>/); // Exportação respeita filtros.
assert.match(admin, /id="filter-campanha-select"/);
assert.match(admin, /Status cadastral — pagamento não verificado/);
assert.doesNotMatch(admin, /Gerencie os inscritos na Nova Turma de Outubro/);
assert.match(admin, /csvCellSeguro/);
assert.equal(csvCellSeguro('=1+2'), '"\'=1+2"');
assert.equal(csvCellSeguro('  =HYPERLINK("x")'), '"\'  =HYPERLINK(""x"")"');
assert.equal(csvCellSeguro('\t@SOMETHING'), '"\'\t@SOMETHING"');
assert.equal(csvCellSeguro('\n+cmd'), '"\'\n+cmd"');
assert.equal(csvCellSeguro('-22'), '"\'-22"');
assert.equal(csvCellSeguro('normal, "texto"'), '"normal, ""texto"""');

assert.match(payload, /turma_campanha: CAMPANHA_FORMACAO_ATUAL/);
assert.match(oficial, /from\('inscricoes_oficina'\)\.insert/);
assert.match(payload, /turma_campanha: CAMPANHA_FORMACAO_ATUAL/);
assert.match(workflow, /sem deploy/);
console.log('OK: campanhas, indicadores, filtro, exportação segura e fluxo legado bloqueado.');
