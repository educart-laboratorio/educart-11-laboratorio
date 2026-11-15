/** R42: contrato estático de migração candidata — SEM conectar ao banco. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler=(p)=>readFileSync(p,'utf8');
const candidata=ler('../../supabase/security-review/EDUCART_11_PROD_COMPLEMENTO_R35_R40_CANDIDATO_20261115.sql');
const r35=ler('../../supabase/migrations/20261114205000_educart_r35_propostas_solucoes_docentes_dev.sql');
const r40=ler('../../supabase/migrations/20261114224701_educart_r40_fotos_propostas_docentes_privadas_dev.sql');
const config=ler('src/lib/supabase/client.ts');
const formulario=ler('src/app/criar/FormularioPropostaDocente.tsx');
const caixa=ler('src/components/AdminPropostasDocentesDev.tsx');

for(const literal of [
  'educart.autorizacao_prod_11',
  'educart.backup_restaurado_11',
  'educart.autorizacao_propostas_11',
  'DIRECAO_APROVOU_PROPOSTAS',
  'RESTAURACAO_TESTADA',
  "e.papel='coordenacao'",
  'u.email_confirmed_at IS NOT NULL',
  'r35_snapshot_inscricoes',
  'r35_snapshot_admins',
  'CREATE TABLE public.educart_propostas_solucoes_docentes_dev',
  'ENABLE ROW LEVEL SECURITY',
  'FOR INSERT TO anon',
  'FOR SELECT TO authenticated',
  'public=false',
  'educart_r40_docentes_foto_anon_insert_dev',
  'educart_r40_docentes_foto_coord_select_dev',
]){
  // Bucket usa false no valor SQL, sem literal "public=false" na inserção.
  if(literal==='public=false') {
    assert.match(candidata,/false,8388608,ARRAY\['image\/jpeg','image\/png','image\/webp'\]/);
  } else assert(candidata.includes(literal),'Pré-condição R42 ausente: '+literal);
}
for(const campo of ['nome_professor','email','whatsapp','proposta','estado','criado_em']){
  assert(r35.includes(campo) && candidata.includes(campo),'Coluna R35 divergente: '+campo);
}
assert(candidata.includes('foto\\.(jpg|png|webp)'),'Restrição de extensão R40 ausente');
assert(r40.includes('educart-fotos-propostas-docentes-dev'));
assert(candidata.includes('educart-fotos-propostas-docentes-dev'));
assert(!/\b(?:DELETE|UPDATE|TRUNCATE|ALTER TABLE|DROP TABLE)\s+(?:FROM\s+)?public\.(?:inscricoes_oficina|portal_admins|perfis_administrativos_oficina)/i.test(candidata),'Legado não pode ser alterado');
assert(!/\b(?:INSERT INTO|UPDATE)\s+(?:auth\.users|public\.equipe_papeis|public\.portal_admins)\b/i.test(candidata),'Não provisionar identidades/papéis');
assert(config.includes("NEXT_PUBLIC_EDUCART_PROPOSTAS_DOCENTES_APROVADAS === 'true'"));
assert(formulario.includes('if(!PROPOSTAS_DOCENTES_HABILITADAS)return <section'));
assert(formulario.includes('if(!PROPOSTAS_DOCENTES_HABILITADAS){setErro('));
assert(caixa.includes('PROPOSTAS_DOCENTES_HABILITADAS'),'Caixa de entrada segue a mesma ativação do envio');
assert(!caixa.includes('ACOES_ACADEMICAS_EXCLUSIVAS_DEV'),'Não limitar consulta ao DEV após homologação PROD');
assert(caixa.includes('if(!podeGerir||!PROPOSTAS_DOCENTES_HABILITADAS)return;'),'Consulta exige gestão e ativação');
assert(caixa.includes('if(!podeGerir||!PROPOSTAS_DOCENTES_HABILITADAS)return null;'),'UI não expõe módulo sem permissão');
assert(caixa.includes(".from('educart_propostas_solucoes_docentes_dev')"),'Consultar o mesmo destino R35');
assert(caixa.includes('Nenhuma proposta docente recebida até o momento.'),'Estado vazio de propostas deve ser explícito');
console.log('R42 PASS: suplemento R35/R40 com portão, RLS e Storage; legado intocado e formulário fail-closed.');
