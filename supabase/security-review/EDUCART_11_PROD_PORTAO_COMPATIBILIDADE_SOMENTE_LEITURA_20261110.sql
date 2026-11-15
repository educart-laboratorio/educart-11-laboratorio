-- EducART 1.1 — Auditoria reproduzível de compatibilidade DEV/PROD
-- Somente SELECT e catálogos PostgreSQL; não executar DDL/DML; sem dados pessoais.
-- Compare os resultados separadamente no DEV e em PROD antes de projetar migrações.
-- A presença de tabelas não dispensa teste Auth/RLS/GRANT nem comprova restauração de backup.
-- R42: a proposta docente R35 e o bucket privado R40 são externos às 13 tabelas
-- da migração acadêmica candidata; não ativar o envio público sem sua revisão.
WITH requisitos(nome, finalidade) AS (
  VALUES
  ('inscricoes_oficina','legado'),('portal_admins','legado'),
  ('educart_propostas_solucoes_docentes_dev','propostas'),
  ('perfis_administrativos_oficina','legado'),('equipe_papeis','acesso'),
  ('pessoas','academico'),('formacoes','academico'),('modulos','academico'),
  ('educart_docentes_dev','academico'),('turmas','academico'),
  ('matriculas','academico'),
  ('educart_vinculos_manuais_r12_dev','auditoria'),
  ('educart_ativacoes_turmas_historicas_r12_dev','auditoria'),
  ('educart_aulas_dev','interface'),('educart_chamadas_dev','interface'),
  ('educart_chamadas_historico_dev','auditoria'),('educart_ajustes_aulas_r12_dev','auditoria')
),
tabelas AS (
  SELECT r.nome, r.finalidade, c.oid IS NOT NULL AS existe,
    coalesce(c.relrowsecurity,false) AS rls,
    CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('anon',c.oid,'SELECT') ELSE false END AS anon_select_grant,
    CASE WHEN c.oid IS NOT NULL THEN has_table_privilege('authenticated',c.oid,'SELECT') ELSE false END AS auth_select_grant,
    (SELECT count(*) FROM pg_policies p
     WHERE p.schemaname='public' AND p.tablename=r.nome) AS politicas
  FROM requisitos r
  LEFT JOIN pg_class c ON c.relname=r.nome AND c.relkind IN ('r','p')
    AND c.relnamespace='public'::regnamespace
),
funcoes_necessarias(nome) AS (
  VALUES ('educart_r12_vincular_estudante_turma_dev'),
         ('educart_r12_ativar_turma_historica_dev'),
         ('educart_criar_formacao_turma_guiada_dev'),
         ('educart_r12_ajustar_aula_dev')
),
funcoes AS (
 SELECT f.nome,
 EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname=f.nome) AS existe
 FROM funcoes_necessarias f
),
rpc_privilegios AS (
 SELECT p.proname AS nome, pg_get_function_identity_arguments(p.oid) AS assinatura,
   has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute_grant,
   has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute_grant,
   p.prosecdef AS security_definer
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname IN (SELECT nome FROM funcoes_necessarias)
),
gatilhos AS (
 SELECT c.relname AS tabela,t.tgname AS nome,(t.tgenabled='O') AS habilitado,
 p.proname AS funcao FROM pg_trigger t
 JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_proc p ON p.oid=t.tgfoid
 WHERE n.nspname='public' AND NOT t.tgisinternal
   AND c.relname IN ('matriculas','turmas','inscricoes_oficina','educart_aulas_dev','educart_chamadas_dev')
)
SELECT jsonb_pretty(jsonb_build_object(
 'tabelas',(SELECT jsonb_agg(jsonb_build_object(
  'nome',nome,'finalidade',finalidade,'existe',existe,'rls',rls,'politicas',politicas,'anon_select_grant',anon_select_grant,'auth_select_grant',auth_select_grant)
  ORDER BY finalidade,nome) FROM tabelas),
 'rpcs',(SELECT jsonb_agg(jsonb_build_object('nome',nome,'existe',existe)
  ORDER BY nome) FROM funcoes),
 'rpc_privilegios',(SELECT coalesce(jsonb_agg(jsonb_build_object(
   'nome',nome,'assinatura',assinatura,'anon_execute_grant',anon_execute_grant,
   'auth_execute_grant',auth_execute_grant,'security_definer',security_definer)
   ORDER BY nome,assinatura),'[]'::jsonb) FROM rpc_privilegios),
 'gatilhos',(SELECT coalesce(jsonb_agg(jsonb_build_object(
  'tabela',tabela,'nome',nome,'habilitado',habilitado,'funcao',funcao)
  ORDER BY tabela,nome),'[]'::jsonb) FROM gatilhos),
 'qtd_inscricoes_historicas',(SELECT count(*) FROM public.inscricoes_oficina),
 'inscricoes_por_status',(SELECT coalesce(jsonb_object_agg(status,quantidade),'{}'::jsonb)
  FROM (SELECT coalesce(status,'(nulo)') AS status,count(*) AS quantidade
   FROM public.inscricoes_oficina GROUP BY 1) sub),
 'qtd_admins',(SELECT count(*) FROM public.portal_admins),
 'qtd_usuarios_auth',(SELECT count(*) FROM auth.users),
 'qtd_objetos_storage',(SELECT count(*) FROM storage.objects),
 'tamanho_banco_bytes',pg_database_size(current_database()),
 'possui_schema_interno_dev',to_regnamespace('educart_interno_dev') IS NOT NULL,
 'propostas_foto_storage',jsonb_build_object(
   'bucket_existe',EXISTS(SELECT 1 FROM storage.buckets b
      WHERE b.id='educart-fotos-propostas-docentes-dev'),
   'bucket_privado',coalesce((SELECT NOT b.public FROM storage.buckets b
      WHERE b.id='educart-fotos-propostas-docentes-dev'),false),
   'bucket_limite_bytes',(SELECT b.file_size_limit FROM storage.buckets b
      WHERE b.id='educart-fotos-propostas-docentes-dev'),
   'policy_anon_insert',EXISTS(SELECT 1 FROM pg_policies p
      WHERE p.schemaname='storage' AND p.tablename='objects'
      AND p.policyname='educart_r40_docentes_foto_anon_insert_dev'),
   'policy_coord_select',EXISTS(SELECT 1 FROM pg_policies p
      WHERE p.schemaname='storage' AND p.tablename='objects'
      AND p.policyname='educart_r40_docentes_foto_coord_select_dev')
 )
)) AS auditoria;
