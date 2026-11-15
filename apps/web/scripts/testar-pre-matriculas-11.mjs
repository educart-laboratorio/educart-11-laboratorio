import assert from 'node:assert/strict';
import fs from 'node:fs';

const ler = caminho => fs.readFileSync(caminho, 'utf8');
const sql = ler('../../supabase/security-review/EDUCART_11_DEV_PRE_MATRICULA_ATOMICA_PROPOSTA_20261104.sql');
const matricula = ler('src/components/AdminMatriculaUnificadaDev.tsx');
const academia = ler('src/components/AdminRotinaAcademicaLab.tsx');
const admin = ler('src/app/admin/page.tsx');

for (const teste of [
  /security invoker/i,
  /auth\.uid\(\)/,
  /from public\.portal_admins/,
  /from public\.equipe_papeis/,
  /p\.papel = 'coordenacao'/,
  /pg_advisory_xact_lock/,
  /from public\.inscricoes_oficina/,
  /from public\.pessoas/,
  /from public\.turmas/,
  /from public\.matriculas/,
  /for update/,
  /capacidade/,
  /candidatura_id = p_candidatura_id/,
  /Pessoa possivelmente existente/,
  /insert into public\.pessoas/,
  /insert into public\.matriculas/,
  /'novo','pendente'/,
  /grant execute on function public\.educart_pre_matricular_dev/,
  /to authenticated/,
]) assert.match(sql, teste, `RPC não contém controle obrigatório: ${teste}`);

assert.doesNotMatch(sql, /security definer/i, 'RPC não pode contornar RLS');
assert.doesNotMatch(sql, /insert into public\.mensalidades_formacao/i, 'sem cobrança automática');
assert.doesNotMatch(sql, /update public\.inscricoes_oficina/i, 'não altera pré-cadastro');
assert.doesNotMatch(sql, /insert into public\.perfis_artisticos/i, 'não cria perfil artístico sem consentimento');

assert.match(matricula, /educart_efetivar_matricula_unificada_dev/);
assert.match(matricula, /obterPapeisGestao/);
assert.match(matricula, /podeAutorizarBolsa/);
assert.doesNotMatch(matricula, /educart_pre_matricular_dev/);
assert.match(admin, /<AdminMatriculaUnificadaDev/, 'A 1.2 efetiva matrícula a partir da inscrição');
assert.match(academia, /<AdminPlanejamentoFormacaoTurmaDev supabase=\{supabase\} podeGerir=\{podeGerir\}/);
assert.match(admin, /<AdminRotinaAcademicaLab supabase=\{supabase\} podeGerir=\{podeAlterarStatus\}/);

console.log('OK: RPC de pré-matrícula legada preservada, mas retirada do fluxo principal da 1.2; LIPE mantida.');
