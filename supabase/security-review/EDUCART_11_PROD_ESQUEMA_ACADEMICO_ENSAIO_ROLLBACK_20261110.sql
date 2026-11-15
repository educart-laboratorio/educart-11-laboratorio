-- EDUCART 1.1 — ENSAIO DE COMPATIBILIDADE ACADÊMICA • NÃO APLICAR EM PROD
-- Consultado do esquema DEV em 10/11/2026; revisão de limites em 11/11/2026.
-- Este arquivo é deliberadamente ROLLBACK-ONLY: NÃO é migração oficial.
-- Conteúdo: 13 tabelas estruturais com restrições, 25 políticas RLS,
-- 6 gatilhos e 11 funções, privilégios de acesso e lógica R12 pendente.
-- Ensaios descartáveis: criação, leitura/insersão autenticada com papel,
-- formação/turma guiada, novo vínculo pendente, auditoria, negação de
-- duplicidade e usuário sem papel. Nada aqui constitui prova visual ou restore.
-- Exclusões deliberadas: dados reais, concessão automática de coordenacao,
-- 'legado_ativo' pela RPC de matrícula, ativação histórica segura de turma,
-- efetivação financeira Pix/bolsa, convites e storage em PROD.
-- ATENÇÃO: a UI atual ainda oferece opções de 'legado_ativo' e outros
-- fluxos DEV/1.2; devem ser protegidos/desabilitados na implantação 1.1
-- até contrato backend correspondente ser homologado.
-- Divergência independente: política INSERT pública de inscricoes_oficina
-- no PROD não restringe status, ao contrário do DEV. Correção em rascunho
-- separado: EDUCART_11_PROD_CORRECAO_POLITICA_INSCRICOES_ENSAIO_20261111.sql.
-- Não operar em PROD. Mesmo transação ROLLBACK adquire locks.
-- Antes de migração definitiva: backup restaurável, GRANT/RLS/DEBUG,
-- teste JWT real, navegação desktop/celular, controle de mudanças,
-- conciliação legado, revisão de segurança e autorização específica.
-- Preservar inscricoes_oficina, portal_admins, perfis_administrativos_oficina,
-- seu histórico e suas políticas vigentes até ajuste explicitamente aprovado.
-- Referência: PR #19; pré-check read-only desta pasta.

BEGIN;
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

DO $preflight$
BEGIN
  IF to_regclass('public.inscricoes_oficina') IS NULL OR
     to_regclass('public.portal_admins') IS NULL OR
     to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Pré-requisitos de legado/autenticação ausentes';
  END IF;
END
$preflight$;

-- equipe_papeis: 4 colunas, 4 restrições verificadas no DEV.
CREATE TABLE public.equipe_papeis (
  user_id uuid NOT NULL,
  papel text NOT NULL,
  atribuido_em timestamp with time zone DEFAULT now() NOT NULL,
  atribuido_por uuid,
  CONSTRAINT equipe_papeis_papel_check CHECK (papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])),
  CONSTRAINT equipe_papeis_atribuido_por_fkey FOREIGN KEY (atribuido_por) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT equipe_papeis_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT equipe_papeis_pkey PRIMARY KEY (user_id, papel)
);
ALTER TABLE public.equipe_papeis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.equipe_papeis FROM PUBLIC, anon, authenticated;

-- pessoas: 9 colunas, 3 restrições verificadas no DEV.
CREATE TABLE public.pessoas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  auth_user_id uuid,
  nome_completo text NOT NULL,
  email text,
  telefone text,
  data_nascimento date,
  cidade text,
  bairro text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT pessoas_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT pessoas_pkey PRIMARY KEY (id),
  CONSTRAINT pessoas_auth_user_id_key UNIQUE (auth_user_id)
);
ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.pessoas FROM PUBLIC, anon, authenticated;

-- formacoes: 29 colunas, 10 restrições verificadas no DEV.
CREATE TABLE public.formacoes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  publicada boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  descricao text,
  publico_alvo text,
  idade_minima integer,
  exige_experiencia boolean DEFAULT false NOT NULL,
  duracao_meses integer,
  carga_horaria_horas integer,
  ementa text,
  modulos_planejados text,
  avaliacao text,
  criterios_conclusao text,
  chamada_curta text,
  formato text DEFAULT 'presencial'::text NOT NULL,
  objetivos text,
  disciplinas text,
  metodologia text,
  competencias text,
  atividades_praticas text,
  certificacao text,
  projeto_final text,
  materiais_inclusos text,
  perguntas_frequentes text,
  valor_matricula_referencia_centavos integer,
  valor_mensalidade_referencia_centavos integer,
  quantidade_mensalidades_referencia integer,
  CONSTRAINT educart_formacao_carga_dev_ck CHECK (carga_horaria_horas IS NULL OR carga_horaria_horas >= 1 AND carga_horaria_horas <= 10000),
  CONSTRAINT educart_formacao_duracao_dev_ck CHECK (duracao_meses IS NULL OR duracao_meses >= 1 AND duracao_meses <= 240),
  CONSTRAINT educart_formacao_idade_minima_dev_ck CHECK (idade_minima IS NULL OR idade_minima >= 0 AND idade_minima <= 120),
  CONSTRAINT educart_solucao_chamada_dev_ck CHECK (chamada_curta IS NULL OR char_length(chamada_curta) <= 180),
  CONSTRAINT educart_solucao_formato_dev_ck CHECK (formato = ANY (ARRAY['presencial'::text, 'online'::text, 'hibrido'::text])),
  CONSTRAINT educart_solucao_matricula_dev_ck CHECK (valor_matricula_referencia_centavos IS NULL OR valor_matricula_referencia_centavos >= 0 AND valor_matricula_referencia_centavos <= 10000000),
  CONSTRAINT educart_solucao_mensal_dev_ck CHECK (valor_mensalidade_referencia_centavos IS NULL OR valor_mensalidade_referencia_centavos >= 0 AND valor_mensalidade_referencia_centavos <= 10000000),
  CONSTRAINT educart_solucao_quantidade_dev_ck CHECK (quantidade_mensalidades_referencia IS NULL OR quantidade_mensalidades_referencia >= 1 AND quantidade_mensalidades_referencia <= 120),
  CONSTRAINT formacoes_tipo_check CHECK (tipo = ANY (ARRAY['curso'::text, 'oficina'::text])),
  CONSTRAINT formacoes_pkey PRIMARY KEY (id)
);
ALTER TABLE public.formacoes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.formacoes FROM PUBLIC, anon, authenticated;

-- educart_docentes_dev: 16 colunas, 7 restrições verificadas no DEV.
CREATE TABLE public.educart_docentes_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome_completo text NOT NULL,
  nome_artistico text,
  email text,
  whatsapp text,
  instagram text,
  formacao_profissional text,
  areas_atuacao text,
  experiencia_profissional text,
  minibiografia text,
  disponibilidade text,
  autorizou_divulgacao boolean DEFAULT false NOT NULL,
  situacao text DEFAULT 'pendente_validacao'::text NOT NULL,
  criado_por uuid DEFAULT auth.uid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  apresentacao_publica text,
  CONSTRAINT educart_docentes_apresentacao_publica_limite_r16 CHECK (apresentacao_publica IS NULL OR length(apresentacao_publica) <= 1200),
  CONSTRAINT educart_docentes_bio_limite_ck CHECK (minibiografia IS NULL OR char_length(minibiografia) <= 4000),
  CONSTRAINT educart_docentes_dev_nome_completo_check CHECK (char_length(TRIM(BOTH FROM nome_completo)) >= 3 AND char_length(TRIM(BOTH FROM nome_completo)) <= 150),
  CONSTRAINT educart_docentes_dev_situacao_check CHECK (situacao = ANY (ARRAY['pendente_validacao'::text, 'ativo'::text, 'inativo'::text])),
  CONSTRAINT educart_docentes_email_valido_ck CHECK (email IS NULL OR char_length(email) <= 254 AND POSITION(('@'::text) IN (email)) > 1),
  CONSTRAINT educart_docentes_whatsapp_valido_ck CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 30),
  CONSTRAINT educart_docentes_dev_pkey PRIMARY KEY (id)
);
ALTER TABLE public.educart_docentes_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_docentes_dev FROM PUBLIC, anon, authenticated;

-- modulos: 4 colunas, 4 restrições verificadas no DEV.
CREATE TABLE public.modulos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  formacao_id uuid NOT NULL,
  nome text NOT NULL,
  ordem integer NOT NULL,
  CONSTRAINT modulos_ordem_check CHECK (ordem >= 1),
  CONSTRAINT modulos_formacao_id_fkey FOREIGN KEY (formacao_id) REFERENCES formacoes(id) ON DELETE RESTRICT,
  CONSTRAINT modulos_pkey PRIMARY KEY (id),
  CONSTRAINT modulos_formacao_id_ordem_key UNIQUE (formacao_id, ordem)
);
ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.modulos FROM PUBLIC, anon, authenticated;

-- turmas: 16 colunas, 10 restrições verificadas no DEV.
CREATE TABLE public.turmas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  formacao_id uuid NOT NULL,
  codigo text NOT NULL,
  inicio_em date,
  termina_em date,
  capacidade integer,
  situacao text DEFAULT 'planejada'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  criada_por uuid DEFAULT auth.uid(),
  responsavel_nome text,
  local_nome text,
  local_endereco text,
  inscricoes_abrem_em date,
  inscricoes_encerram_em date,
  horarios_semanais jsonb DEFAULT '[]'::jsonb NOT NULL,
  docente_id uuid,
  CONSTRAINT educart_turma_horarios_array_dev_ck CHECK (jsonb_typeof(horarios_semanais) = 'array'::text AND jsonb_array_length(horarios_semanais) <= 7),
  CONSTRAINT educart_turma_inscricoes_datas_dev_ck CHECK (inscricoes_abrem_em IS NULL OR inscricoes_encerram_em IS NULL OR inscricoes_abrem_em <= inscricoes_encerram_em),
  CONSTRAINT turmas_capacidade_check CHECK (capacidade IS NULL OR capacidade > 0),
  CONSTRAINT turmas_check CHECK (inicio_em IS NULL OR termina_em IS NULL OR termina_em >= inicio_em),
  CONSTRAINT turmas_situacao_check CHECK (situacao = ANY (ARRAY['planejada'::text, 'aberta'::text, 'em_andamento'::text, 'encerrada'::text, 'cancelada'::text])),
  CONSTRAINT turmas_criada_por_fkey FOREIGN KEY (criada_por) REFERENCES auth.users(id),
  CONSTRAINT turmas_docente_id_fkey FOREIGN KEY (docente_id) REFERENCES educart_docentes_dev(id) ON DELETE RESTRICT,
  CONSTRAINT turmas_formacao_id_fkey FOREIGN KEY (formacao_id) REFERENCES formacoes(id) ON DELETE RESTRICT,
  CONSTRAINT turmas_pkey PRIMARY KEY (id),
  CONSTRAINT turmas_formacao_id_codigo_key UNIQUE (formacao_id, codigo)
);
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.turmas FROM PUBLIC, anon, authenticated;

-- matriculas: 9 colunas, 9 restrições verificadas no DEV.
CREATE TABLE public.matriculas (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  pessoa_id uuid NOT NULL,
  turma_id uuid NOT NULL,
  modulo_atual_id uuid,
  candidatura_id uuid,
  origem text NOT NULL,
  situacao text DEFAULT 'pendente'::text NOT NULL,
  ingresso_em date,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT matriculas_origem_check CHECK (origem = ANY (ARRAY['novo'::text, 'recadastramento'::text])),
  CONSTRAINT matriculas_situacao_check CHECK (situacao = ANY (ARRAY['pendente'::text, 'ativa'::text, 'trancada'::text, 'concluida'::text, 'cancelada'::text])),
  CONSTRAINT matriculas_candidatura_id_fkey FOREIGN KEY (candidatura_id) REFERENCES inscricoes_oficina(id) ON DELETE SET NULL,
  CONSTRAINT matriculas_modulo_atual_id_fkey FOREIGN KEY (modulo_atual_id) REFERENCES modulos(id) ON DELETE RESTRICT,
  CONSTRAINT matriculas_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT,
  CONSTRAINT matriculas_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT,
  CONSTRAINT matriculas_pkey PRIMARY KEY (id),
  CONSTRAINT matriculas_candidatura_id_key UNIQUE (candidatura_id),
  CONSTRAINT matriculas_pessoa_id_turma_id_key UNIQUE (pessoa_id, turma_id)
);
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.matriculas FROM PUBLIC, anon, authenticated;

-- educart_vinculos_manuais_r12_dev: 8 colunas, 8 restrições verificadas no DEV.
CREATE TABLE public.educart_vinculos_manuais_r12_dev (
  matricula_id uuid NOT NULL,
  pessoa_id uuid NOT NULL,
  turma_id uuid NOT NULL,
  tipo_vinculo text NOT NULL,
  referencia_conferencia text NOT NULL,
  ingresso_declarado_em date,
  registrado_por uuid NOT NULL,
  registrado_em timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT educart_vinculos_manuais_r12_dev_referencia_conferencia_check CHECK (length(btrim(referencia_conferencia)) >= 12 AND length(btrim(referencia_conferencia)) <= 180),
  CONSTRAINT educart_vinculos_manuais_r12_dev_tipo_vinculo_check CHECK (tipo_vinculo = ANY (ARRAY['legado_ativo'::text, 'vinculo_pendente'::text])),
  CONSTRAINT educart_vinculos_manuais_r12_dev_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_vinculos_manuais_r12_dev_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_vinculos_manuais_r12_dev_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_vinculos_manuais_r12_dev_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_vinculos_manuais_r12_dev_pkey PRIMARY KEY (matricula_id),
  CONSTRAINT educart_vinculos_manuais_r12_dev_pessoa_id_turma_id_key UNIQUE (pessoa_id, turma_id)
);
ALTER TABLE public.educart_vinculos_manuais_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_vinculos_manuais_r12_dev FROM PUBLIC, anon, authenticated;

-- educart_ativacoes_turmas_historicas_r12_dev: 7 colunas, 6 restrições verificadas no DEV.
CREATE TABLE public.educart_ativacoes_turmas_historicas_r12_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  turma_id uuid NOT NULL,
  situacao_anterior text NOT NULL,
  inicio_declarado date NOT NULL,
  referencia_conferencia text NOT NULL,
  registrado_por uuid NOT NULL,
  registrado_em timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT educart_ativacoes_turmas_historica_referencia_conferencia_check CHECK (length(btrim(referencia_conferencia)) >= 12 AND length(btrim(referencia_conferencia)) <= 180),
  CONSTRAINT educart_ativacoes_turmas_historicas_r12_situacao_anterior_check CHECK (situacao_anterior = ANY (ARRAY['planejada'::text, 'aberta'::text])),
  CONSTRAINT educart_ativacoes_turmas_historicas_r12_dev_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_ativacoes_turmas_historicas_r12_dev_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_ativacoes_turmas_historicas_r12_dev_pkey PRIMARY KEY (id),
  CONSTRAINT educart_ativacoes_turmas_historicas_r12_dev_turma_id_key UNIQUE (turma_id)
);
ALTER TABLE public.educart_ativacoes_turmas_historicas_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_ativacoes_turmas_historicas_r12_dev FROM PUBLIC, anon, authenticated;

CREATE INDEX matriculas_pessoa_id_idx ON public.matriculas USING btree (pessoa_id);
CREATE INDEX matriculas_turma_id_situacao_idx ON public.matriculas USING btree (turma_id, situacao);
CREATE INDEX educart_turmas_docente_id_dev_idx ON public.turmas USING btree (docente_id);

-- CAMADA RLS MÍNIMA PARA GESTÃO INSTITUCIONAL (AINDA SEM EXECUTAR EM PROD)
-- Membership em portal_admins + papel em equipe_papeis, nunca metadata de usuário.
-- Criado com REVOKE/ENABLE RLS acima; todas as permissões aqui são explícitas.
-- NÃO cria, atribui ou promove administradores. Não concede DELETE.
GRANT SELECT ON public.equipe_papeis TO authenticated;
CREATE POLICY educart_prod_equipe_ler_propria ON public.equipe_papeis
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.pessoas TO authenticated;
CREATE POLICY educart_prod_pessoas_ler_equipe ON public.pessoas
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY educart_prod_pessoas_gerir_coord ON public.pessoas
 FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

GRANT SELECT, INSERT, UPDATE ON public.formacoes TO authenticated;
CREATE POLICY educart_prod_formacoes_ler_equipe ON public.formacoes
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY educart_prod_formacoes_gerir_coord ON public.formacoes
 FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

GRANT SELECT, INSERT, UPDATE ON public.modulos TO authenticated;
CREATE POLICY educart_prod_modulos_ler_equipe ON public.modulos
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY educart_prod_modulos_gerir_coord ON public.modulos
 FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

GRANT SELECT, INSERT, UPDATE ON public.turmas TO authenticated;
CREATE POLICY educart_prod_turmas_ler_equipe ON public.turmas
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY educart_prod_turmas_gerir_coord ON public.turmas
 FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

GRANT SELECT, INSERT, UPDATE ON public.educart_docentes_dev TO authenticated;
CREATE POLICY educart_prod_docentes_ler_equipe ON public.educart_docentes_dev
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY educart_prod_docentes_inserir_coord ON public.educart_docentes_dev
 FOR INSERT TO authenticated WITH CHECK ((EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) AND criado_por=(SELECT auth.uid()));
CREATE POLICY educart_prod_docentes_atualizar_coord ON public.educart_docentes_dev
 FOR UPDATE TO authenticated USING ((EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) AND criado_por=(SELECT auth.uid()))
 WITH CHECK ((EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) AND criado_por=(SELECT auth.uid()));

GRANT SELECT ON public.matriculas TO authenticated;
CREATE POLICY educart_prod_matriculas_ler_equipe ON public.matriculas
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));

GRANT SELECT ON public.educart_vinculos_manuais_r12_dev TO authenticated;
CREATE POLICY educart_prod_vinculos_manuais_r12_ler_coord ON public.educart_vinculos_manuais_r12_dev
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

GRANT SELECT ON public.educart_ativacoes_turmas_historicas_r12_dev TO authenticated;
CREATE POLICY educart_prod_ativacoes_turmas_historicas_r12_ler_coord ON public.educart_ativacoes_turmas_historicas_r12_dev
 FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid())) AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

-- FUNÇÕES DE INTEGRIDADE DEV TRANSPOSTAS EM CANDIDATO PROD, SEM INSTALAÇÃO.
-- Mantêm veto à matrícula ativa sem conferência e docente ativo obrigatório.
CREATE FUNCTION public.educart_exigir_docente_turma_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.docente_id IS NULL THEN
    RAISE EXCEPTION 'Cadastre e selecione um professor antes de criar uma turma';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.educart_docentes_dev d
    WHERE d.id=NEW.docente_id AND d.situacao='ativo'
  ) THEN
    RAISE EXCEPTION 'Professor inativo ou sem cadastro válido';
  END IF;
  RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION public.educart_exigir_docente_turma_dev() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.educart_guarda_efetiva_financeira_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE v_sensitive boolean:=false;
BEGIN
 IF tg_op='INSERT' THEN
   IF tg_table_name='matriculas' THEN
     IF new.situacao='ativa' THEN
       RAISE EXCEPTION 'Matrícula ativa exige conferência transacional'
         USING errcode='42501';
     END IF;
   ELSIF tg_table_name='mensalidades_formacao' THEN
     IF new.status='pago' THEN
       RAISE EXCEPTION 'Mensalidade paga exige conferência transacional'
         USING errcode='42501';
     END IF;
   END IF;
   RETURN new;
 END IF;

 IF tg_table_name='educart_pix_manuais' THEN
   v_sensitive:=true;
 ELSIF tg_table_name='matriculas' THEN
   v_sensitive:=(old.situacao='ativa' AND new.situacao IS DISTINCT FROM 'ativa')
        OR (new.situacao='ativa' AND old.situacao IS DISTINCT FROM 'ativa');
 ELSIF tg_table_name='inscricoes_oficina' THEN
   v_sensitive:=(old.status='matriculado' AND new.status IS DISTINCT FROM 'matriculado')
        OR (new.status='matriculado' AND old.status IS DISTINCT FROM 'matriculado');
 ELSIF tg_table_name='mensalidades_formacao' THEN
   v_sensitive:=(old.status='pago' AND new.status IS DISTINCT FROM 'pago')
        OR (new.status='pago' AND old.status IS DISTINCT FROM 'pago');
 END IF;
 IF v_sensitive AND current_user<>'postgres' THEN
   RAISE EXCEPTION 'Mudança financeira só é permitida na RPC de conferência autorizada'
     USING errcode='42501';
 END IF;
 RETURN new;
END; $function$;
REVOKE ALL ON FUNCTION public.educart_guarda_efetiva_financeira_dev() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.educart_bloquear_status_financeiro_direto_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_trocou_financeiro boolean := false;
begin
 if tg_table_name='matriculas' then
   v_trocou_financeiro :=
     (old.situacao='ativa' and new.situacao is distinct from 'ativa')
     or (new.situacao='ativa' and old.situacao is distinct from 'ativa');
 elsif tg_table_name='inscricoes_oficina' then
   v_trocou_financeiro :=
     (old.status='matriculado' and new.status is distinct from 'matriculado')
     or (new.status='matriculado' and old.status is distinct from 'matriculado');
 elsif tg_table_name='mensalidades_formacao' then
   v_trocou_financeiro :=
     (old.status='pago' and new.status is distinct from 'pago')
     or (new.status='pago' and old.status is distinct from 'pago');
 end if;
 if v_trocou_financeiro
   and current_setting('educart.pix_conferencia_rpc',true) is distinct from 'true'
 then
   raise exception 'Status financeiro só muda pela conferência transacional de Pix'
     using errcode='42501';
 end if;
 return new;
end;
$function$;
REVOKE ALL ON FUNCTION public.educart_bloquear_status_financeiro_direto_dev() FROM PUBLIC,anon,authenticated;

CREATE TRIGGER educart_turmas_professor_obrigatorio_dev BEFORE INSERT ON public.turmas
 FOR EACH ROW EXECUTE FUNCTION public.educart_exigir_docente_turma_dev();
CREATE TRIGGER educart_guarda_efetiva_matricula_dev BEFORE INSERT OR UPDATE ON public.matriculas
 FOR EACH ROW EXECUTE FUNCTION public.educart_guarda_efetiva_financeira_dev();
CREATE TRIGGER educart_matricula_ativa_por_pix BEFORE UPDATE ON public.matriculas
 FOR EACH ROW EXECUTE FUNCTION public.educart_bloquear_status_financeiro_direto_dev();

-- RPC 11 argumentos: reuso do contrato existente do painel, SOMENTE vínculo pendente.
-- Funcionário autenticado precisa de membership portal_admins + equipe_papeis coordenacao.
-- Não ativa legados nem concede papéis. Código mínimo derivado da RPC DEV vigente.
CREATE SCHEMA educart_interno_11;
REVOKE ALL ON SCHEMA educart_interno_11 FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA educart_interno_11 TO authenticated;
CREATE FUNCTION educart_interno_11.educart_r12_vincular_estudante_turma_dev(p_turma_id uuid, p_pessoa_existente_id uuid, p_nome_completo text, p_email text, p_telefone text, p_nascimento date, p_tipo_vinculo text, p_ingresso_em date, p_referencia_conferencia text, p_confirmei_identidade boolean, p_confirmei_documentos boolean)
 RETURNS TABLE(matricula_id uuid, pessoa_id uuid, situacao text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid:=auth.uid();
  v_turma public.turmas%rowtype;
  v_pessoa uuid;
  v_nome text:=btrim(coalesce(p_nome_completo,''));
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_telefone text:=regexp_replace(coalesce(p_telefone,''),'[^0-9]','','g');
  v_situacao text;
  v_matricula uuid;
BEGIN
  IF v_uid IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
     OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                   WHERE e.user_id=v_uid AND e.papel='coordenacao')
  THEN RAISE EXCEPTION 'Operador administrativo sem permissão' USING ERRCODE='42501'; END IF;
  IF p_confirmei_identidade IS DISTINCT FROM TRUE
    OR p_tipo_vinculo NOT IN ('vinculo_pendente','novo_pendente')
    OR length(btrim(coalesce(p_referencia_conferencia,''))) NOT BETWEEN 12 AND 180
    OR p_ingresso_em>current_date OR p_nascimento>current_date
  THEN RAISE EXCEPTION 'Vínculo exige conferência e referência válida' USING ERRCODE='22023'; END IF;
  IF p_tipo_vinculo='legado_ativo' AND
       (p_confirmei_documentos IS DISTINCT FROM TRUE OR p_ingresso_em IS NULL)
  THEN RAISE EXCEPTION 'Reconhecer estudante ativo exige documento conferido e ingresso conhecido'
       USING ERRCODE='22023'; END IF;

  -- Ingresso novo é sempre acadêmico PENDENTE; nunca uma ativação histórica.
  IF p_tipo_vinculo='novo_pendente' AND
       (p_ingresso_em IS NOT NULL OR p_confirmei_documentos IS TRUE)
  THEN RAISE EXCEPTION 'Novo ingresso pendente não admite data histórica nem ativação documental'
       USING ERRCODE='22023'; END IF;

  SELECT * INTO v_turma FROM public.turmas WHERE id=p_turma_id FOR UPDATE;
  IF NOT FOUND OR v_turma.situacao IN ('cancelada','encerrada') THEN
    RAISE EXCEPTION 'Turma inexistente, encerrada ou cancelada' USING ERRCODE='22023'; END IF;
  IF p_tipo_vinculo='legado_ativo' AND v_turma.situacao<>'em_andamento' THEN
    RAISE EXCEPTION 'Vínculo ativo histórico exige turma em andamento' USING ERRCODE='22023'; END IF;
  IF v_turma.capacidade IS NOT NULL AND
      (SELECT count(*) FROM public.matriculas m
       WHERE m.turma_id=p_turma_id AND m.situacao IN ('ativa','pendente'))>=v_turma.capacidade
  THEN RAISE EXCEPTION 'Turma sem vagas disponíveis' USING ERRCODE='23514'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('educart-prod-reconciliacao-pessoas',0));
  IF p_pessoa_existente_id IS NOT NULL THEN
    SELECT id INTO v_pessoa FROM public.pessoas WHERE id=p_pessoa_existente_id FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pessoa selecionada não existe' USING ERRCODE='22023'; END IF;
    IF v_nome<>'' OR v_email<>'' OR v_telefone<>'' OR p_nascimento IS NOT NULL THEN
      RAISE EXCEPTION 'Pessoa existente não pode ser alterada implicitamente' USING ERRCODE='22023'; END IF;
  ELSE
    IF v_nome !~ '^[^[:cntrl:]]{3,150}$'
      OR (v_email='' AND v_telefone='')
      OR length(v_email)>320
      OR (v_email<>'' AND v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$')
      OR (v_telefone<>'' AND length(v_telefone) NOT BETWEEN 10 AND 13)
    THEN RAISE EXCEPTION 'Novo cadastro requer nome e contato válidos' USING ERRCODE='22023'; END IF;
    IF EXISTS(
       SELECT 1 FROM public.pessoas p
       WHERE (v_email<>'' AND lower(btrim(coalesce(p.email,'')))=v_email)
          OR (v_telefone<>'' AND regexp_replace(coalesce(p.telefone,''),'[^0-9]','','g')=v_telefone)
    ) THEN RAISE EXCEPTION 'Possível cadastro duplicado; selecione a pessoa existente'
           USING ERRCODE='23505'; END IF;
    INSERT INTO public.pessoas(nome_completo,email,telefone,data_nascimento)
    VALUES(v_nome,nullif(v_email,''),nullif(v_telefone,''),p_nascimento)
    RETURNING id INTO v_pessoa;
  END IF;

  IF EXISTS(SELECT 1 FROM public.matriculas m
            WHERE m.pessoa_id=v_pessoa AND m.turma_id=p_turma_id)
  THEN RAISE EXCEPTION 'Estudante já possui vínculo com esta turma' USING ERRCODE='23505'; END IF;
  v_situacao:='pendente'; -- Segurança 1.1: proibir ativação histórica por esta RPC
  INSERT INTO public.matriculas(pessoa_id,turma_id,origem,situacao,ingresso_em)
  VALUES(v_pessoa,p_turma_id,
         CASE WHEN p_tipo_vinculo='novo_pendente' THEN 'novo' ELSE 'recadastramento' END,
         v_situacao,p_ingresso_em)
  RETURNING id INTO v_matricula;
  INSERT INTO public.educart_vinculos_manuais_r12_dev(
   matricula_id,pessoa_id,turma_id,tipo_vinculo,referencia_conferencia,
   ingresso_declarado_em,registrado_por)
  VALUES(v_matricula,v_pessoa,p_turma_id,
         CASE WHEN p_tipo_vinculo='novo_pendente' THEN 'vinculo_pendente' ELSE p_tipo_vinculo END,
         btrim(p_referencia_conferencia),p_ingresso_em,v_uid);
  RETURN QUERY SELECT v_matricula,v_pessoa,v_situacao;
END;
$function$;

CREATE FUNCTION public.educart_r12_vincular_estudante_turma_dev(p_turma_id uuid, p_pessoa_existente_id uuid, p_nome_completo text, p_email text, p_telefone text, p_nascimento date, p_tipo_vinculo text, p_ingresso_em date, p_referencia_conferencia text, p_confirmei_identidade boolean, p_confirmei_documentos boolean)
 RETURNS TABLE(matricula_id uuid, pessoa_id uuid, situacao text)
 LANGUAGE sql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT * FROM educart_interno_11.educart_r12_vincular_estudante_turma_dev(
   $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11);
$function$;

REVOKE ALL ON FUNCTION educart_interno_11.educart_r12_vincular_estudante_turma_dev(uuid,uuid,text,text,text,date,text,date,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.educart_r12_vincular_estudante_turma_dev(uuid,uuid,text,text,text,date,text,date,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_11.educart_r12_vincular_estudante_turma_dev(uuid,uuid,text,text,text,date,text,date,text,boolean,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r12_vincular_estudante_turma_dev(uuid,uuid,text,text,text,date,text,date,text,boolean,boolean) TO authenticated;

-- RPC guiada do DEV real, SECURITY INVOKER e permissão específica.
CREATE FUNCTION public.educart_criar_formacao_turma_guiada_dev(p_formacao_existente uuid, p_formacao jsonb, p_turma jsonb)
 RETURNS TABLE(formacao_id uuid, turma_id uuid)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_formacao_id uuid;
  v_turma_id uuid;
  v_nome text := trim(coalesce(p_formacao->>'nome',''));
  v_tipo text := coalesce(p_formacao->>'tipo','curso');
  v_codigo text := upper(trim(coalesce(p_turma->>'codigo','')));
  v_horarios jsonb := coalesce(p_turma->'horarios_semanais','[]'::jsonb);
  v_item jsonb;
  v_dia integer;
  v_dias integer[] := ARRAY[]::integer[];
  v_inicio text;
  v_fim text;
  v_inicio_turma date;
  v_fim_turma date;
  v_abertura date;
  v_encerramento date;
  v_capacidade integer;
  v_docente_id uuid;
  v_docente_nome text;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
     OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                   WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Somente Coordenação autorizada pode concluir o planejamento' USING ERRCODE='42501';
  END IF;
  IF (p_turma->>'docente_id') IS NULL OR (p_turma->>'docente_id') = '' THEN
    RAISE EXCEPTION 'Selecione um professor previamente cadastrado para a turma';
  END IF;
  BEGIN
    v_docente_id := (p_turma->>'docente_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Identificador do professor inválido';
  END;
  SELECT d.nome_completo INTO v_docente_nome
    FROM public.educart_docentes_dev d
    WHERE d.id=v_docente_id AND d.situacao='ativo';
  IF v_docente_nome IS NULL THEN
    RAISE EXCEPTION 'Professor inexistente, inativo ou não autorizado';
  END IF;
  IF p_turma IS NULL OR jsonb_typeof(p_turma)<>'object' THEN
    RAISE EXCEPTION 'Ficha de turma inválida';
  END IF;
  IF v_codigo !~ '^[A-Z0-9][A-Z0-9._-]{2,39}$' THEN
    RAISE EXCEPTION 'Código de turma inválido (3 a 40 caracteres)';
  END IF;
  IF NULLIF(p_turma->>'capacidade','') IS NOT NULL THEN
    v_capacidade := (p_turma->>'capacidade')::integer;
    IF v_capacidade NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Capacidade fora do limite'; END IF;
  END IF;
  IF NULLIF(p_turma->>'inicio_em','') IS NOT NULL THEN v_inicio_turma := (p_turma->>'inicio_em')::date; END IF;
  IF NULLIF(p_turma->>'termina_em','') IS NOT NULL THEN v_fim_turma := (p_turma->>'termina_em')::date; END IF;
  IF v_inicio_turma IS NOT NULL AND v_fim_turma IS NOT NULL AND v_fim_turma<v_inicio_turma THEN
    RAISE EXCEPTION 'Término anterior ao início';
  END IF;
  IF NULLIF(p_turma->>'inscricoes_abrem_em','') IS NOT NULL THEN
    v_abertura := (p_turma->>'inscricoes_abrem_em')::date;
  END IF;
  IF NULLIF(p_turma->>'inscricoes_encerram_em','') IS NOT NULL THEN
    v_encerramento := (p_turma->>'inscricoes_encerram_em')::date;
  END IF;
  IF v_abertura IS NOT NULL AND v_encerramento IS NOT NULL AND v_encerramento<v_abertura THEN
    RAISE EXCEPTION 'Encerramento de inscrições anterior à abertura';
  END IF;
  IF jsonb_typeof(v_horarios) IS DISTINCT FROM 'array'
     OR jsonb_array_length(v_horarios) NOT BETWEEN 1 AND 7 THEN
    RAISE EXCEPTION 'Informe de um a sete horários semanais para a turma';
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_horarios) LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object'
       OR (v_item->>'dia') NOT IN ('0','1','2','3','4','5','6') THEN
      RAISE EXCEPTION 'Dia da semana inválido';
    END IF;
    v_dia := (v_item->>'dia')::integer;
    IF v_dia=ANY(v_dias) THEN RAISE EXCEPTION 'Dia da semana repetido na turma'; END IF;
    v_dias := array_append(v_dias,v_dia);
    v_inicio := v_item->>'inicio';
    v_fim := v_item->>'fim';
    IF v_inicio IS NULL OR v_fim IS NULL
      OR v_inicio !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR v_fim !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
      OR v_inicio >= v_fim THEN
      RAISE EXCEPTION 'Horário inválido: início deve ser anterior ao fim';
    END IF;
  END LOOP;

  IF p_formacao_existente IS NOT NULL THEN
    SELECT f.id INTO v_formacao_id FROM public.formacoes f WHERE f.id=p_formacao_existente;
    IF v_formacao_id IS NULL THEN RAISE EXCEPTION 'Formação existente não encontrada'; END IF;
  ELSE
    IF jsonb_typeof(p_formacao) IS DISTINCT FROM 'object'
      OR length(v_nome) NOT BETWEEN 3 AND 120 OR v_tipo NOT IN ('curso','oficina') THEN
      RAISE EXCEPTION 'Nome ou tipo da formação inválido';
    END IF;
    IF EXISTS (SELECT 1 FROM public.formacoes f WHERE lower(trim(f.nome))=lower(v_nome)) THEN
      RAISE EXCEPTION 'Já existe uma formação com esse nome: escolha a existente';
    END IF;
    IF NULLIF(p_formacao->>'idade_minima','') IS NOT NULL
      AND (p_formacao->>'idade_minima')::integer NOT BETWEEN 0 AND 120 THEN
      RAISE EXCEPTION 'Idade mínima inválida';
    END IF;
    INSERT INTO public.formacoes(
      nome,tipo,publicada,descricao,publico_alvo,idade_minima,exige_experiencia,
      duracao_meses,carga_horaria_horas,ementa,modulos_planejados,avaliacao,criterios_conclusao,
      chamada_curta,formato,objetivos,disciplinas,metodologia,competencias,atividades_praticas,
      certificacao,projeto_final,materiais_inclusos,perguntas_frequentes,
      valor_matricula_referencia_centavos,valor_mensalidade_referencia_centavos,quantidade_mensalidades_referencia
    ) VALUES (
      v_nome,v_tipo,false,nullif(trim(p_formacao->>'descricao'),''),
      nullif(trim(p_formacao->>'publico_alvo'),''),
      nullif(p_formacao->>'idade_minima','')::integer,
      coalesce((p_formacao->>'exige_experiencia')::boolean,false),
      nullif(p_formacao->>'duracao_meses','')::integer,
      nullif(p_formacao->>'carga_horaria_horas','')::integer,
      nullif(trim(p_formacao->>'ementa'),''),
      nullif(trim(p_formacao->>'modulos_planejados'),''),
      nullif(trim(p_formacao->>'avaliacao'),''),
      nullif(trim(p_formacao->>'criterios_conclusao'),''),
      nullif(trim(p_formacao->>'chamada_curta'),''),
      coalesce(nullif(p_formacao->>'formato',''),'presencial'),
      nullif(trim(p_formacao->>'objetivos'),''),
      nullif(trim(p_formacao->>'disciplinas'),''),
      nullif(trim(p_formacao->>'metodologia'),''),
      nullif(trim(p_formacao->>'competencias'),''),
      nullif(trim(p_formacao->>'atividades_praticas'),''),
      nullif(trim(p_formacao->>'certificacao'),''),
      nullif(trim(p_formacao->>'projeto_final'),''),
      nullif(trim(p_formacao->>'materiais_inclusos'),''),
      nullif(trim(p_formacao->>'perguntas_frequentes'),''),
      nullif(p_formacao->>'valor_matricula_referencia_centavos','')::integer,
      nullif(p_formacao->>'valor_mensalidade_referencia_centavos','')::integer,
      nullif(p_formacao->>'quantidade_mensalidades_referencia','')::integer
    ) RETURNING id INTO v_formacao_id;
  END IF;

  INSERT INTO public.turmas(
    formacao_id,codigo,inicio_em,termina_em,capacidade,situacao,
    responsavel_nome,local_nome,local_endereco,inscricoes_abrem_em,
    inscricoes_encerram_em,horarios_semanais,docente_id
  ) VALUES (
    v_formacao_id,v_codigo,v_inicio_turma,v_fim_turma,v_capacidade,'planejada',
    v_docente_nome,
    nullif(trim(p_turma->>'local_nome'),''),
    nullif(trim(p_turma->>'local_endereco'),''),
    v_abertura,v_encerramento,v_horarios,v_docente_id
  ) RETURNING id INTO v_turma_id;

  RETURN QUERY SELECT v_formacao_id,v_turma_id;
END
$function$;
REVOKE ALL ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.educart_criar_formacao_turma_guiada_dev(uuid,jsonb,jsonb) TO authenticated;


-- EXTENSÃO AUDITADA DE AULAS/CHAMADAS. ENSAIO ROLLBACK APENAS.
CREATE TABLE public.educart_aulas_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  turma_id uuid NOT NULL,
  data_aula date NOT NULL,
  inicio time without time zone NOT NULL,
  fim time without time zone NOT NULL,
  tema text NOT NULL,
  situacao text DEFAULT 'planejada'::text NOT NULL,
  criada_por uuid DEFAULT auth.uid() NOT NULL,
  criada_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizada_em timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT educart_aula_horario_valido_dev CHECK (fim > inicio),
  CONSTRAINT educart_aulas_dev_situacao_check CHECK (situacao = ANY (ARRAY['planejada'::text, 'realizada'::text, 'cancelada'::text])),
  CONSTRAINT educart_aulas_dev_tema_check CHECK (length(btrim(tema)) >= 3 AND length(btrim(tema)) <= 160),
  CONSTRAINT educart_aulas_dev_criada_por_fkey FOREIGN KEY (criada_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_aulas_dev_turma_id_fkey FOREIGN KEY (turma_id) REFERENCES turmas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_aulas_dev_pkey PRIMARY KEY (id),
  CONSTRAINT educart_aula_turma_data_hora_unica_dev UNIQUE (turma_id, data_aula, inicio)
);
ALTER TABLE public.educart_aulas_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_aulas_dev FROM PUBLIC,anon,authenticated;
CREATE TABLE public.educart_chamadas_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  aula_id uuid NOT NULL,
  matricula_id uuid NOT NULL,
  situacao text NOT NULL,
  justificativa text,
  motivo_ajuste text,
  registrado_por uuid NOT NULL,
  atualizado_por uuid NOT NULL,
  registrado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT educart_chamada_justificativa_dev CHECK (situacao <> 'justificada'::text OR length(btrim(COALESCE(justificativa, ''::text))) >= 8 AND length(btrim(COALESCE(justificativa, ''::text))) <= 500),
  CONSTRAINT educart_chamadas_dev_justificativa_check CHECK (justificativa IS NULL OR length(btrim(justificativa)) <= 500),
  CONSTRAINT educart_chamadas_dev_motivo_ajuste_check CHECK (motivo_ajuste IS NULL OR length(btrim(motivo_ajuste)) >= 8 AND length(btrim(motivo_ajuste)) <= 300),
  CONSTRAINT educart_chamadas_dev_situacao_check CHECK (situacao = ANY (ARRAY['presente'::text, 'ausente'::text, 'justificada'::text])),
  CONSTRAINT educart_chamadas_dev_atualizado_por_fkey FOREIGN KEY (atualizado_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_dev_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES educart_aulas_dev(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_dev_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_dev_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_dev_pkey PRIMARY KEY (id),
  CONSTRAINT educart_chamada_aula_matricula_unica_dev UNIQUE (aula_id, matricula_id)
);
ALTER TABLE public.educart_chamadas_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_chamadas_dev FROM PUBLIC,anon,authenticated;
CREATE TABLE public.educart_chamadas_historico_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  chamada_id uuid NOT NULL,
  operacao text NOT NULL,
  situacao_anterior text,
  situacao_nova text NOT NULL,
  justificativa_anterior text,
  justificativa_nova text,
  motivo text,
  autor_id uuid NOT NULL,
  registrado_em timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT educart_chamadas_historico_dev_operacao_check CHECK (operacao = ANY (ARRAY['registro'::text, 'correcao'::text])),
  CONSTRAINT educart_chamadas_historico_dev_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_historico_dev_chamada_id_fkey FOREIGN KEY (chamada_id) REFERENCES educart_chamadas_dev(id) ON DELETE RESTRICT,
  CONSTRAINT educart_chamadas_historico_dev_pkey PRIMARY KEY (id)
);
ALTER TABLE public.educart_chamadas_historico_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_chamadas_historico_dev FROM PUBLIC,anon,authenticated;
CREATE TABLE public.educart_ajustes_aulas_r12_dev (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  aula_id uuid NOT NULL,
  operacao text NOT NULL,
  data_anterior date NOT NULL,
  inicio_anterior time without time zone NOT NULL,
  fim_anterior time without time zone NOT NULL,
  data_nova date,
  inicio_novo time without time zone,
  fim_novo time without time zone,
  motivo text NOT NULL,
  registrado_por uuid NOT NULL,
  registrado_em timestamp with time zone DEFAULT now() NOT NULL,
  aula_substituta_id uuid,
  CONSTRAINT educart_ajustes_aulas_r12_dev_motivo_check CHECK (length(btrim(motivo)) >= 8 AND length(btrim(motivo)) <= 300),
  CONSTRAINT educart_ajustes_aulas_r12_dev_operacao_check CHECK (operacao = ANY (ARRAY['cancelar'::text, 'remarcar'::text])),
  CONSTRAINT educart_ajustes_aulas_r12_dev_aula_id_fkey FOREIGN KEY (aula_id) REFERENCES educart_aulas_dev(id) ON DELETE RESTRICT,
  CONSTRAINT educart_ajustes_aulas_r12_dev_aula_substituta_id_fkey FOREIGN KEY (aula_substituta_id) REFERENCES educart_aulas_dev(id) ON DELETE RESTRICT,
  CONSTRAINT educart_ajustes_aulas_r12_dev_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT educart_ajustes_aulas_r12_dev_pkey PRIMARY KEY (id)
);
ALTER TABLE public.educart_ajustes_aulas_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.educart_ajustes_aulas_r12_dev FROM PUBLIC,anon,authenticated;
CREATE INDEX educart_r12_ajuste_aulas_idx ON public.educart_ajustes_aulas_r12_dev USING btree (aula_id, registrado_em DESC);
CREATE INDEX educart_aulas_por_turma_dev_idx ON public.educart_aulas_dev USING btree (turma_id, data_aula DESC);
CREATE INDEX educart_chamadas_por_matricula_dev_idx ON public.educart_chamadas_dev USING btree (matricula_id);
CREATE INDEX educart_chamadas_historico_chamada_dev_idx ON public.educart_chamadas_historico_dev USING btree (chamada_id, registrado_em);
GRANT SELECT, INSERT, UPDATE ON public.educart_aulas_dev TO authenticated;
CREATE POLICY educart_aulas_coord_atualizar_dev ON public.educart_aulas_dev FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = 'coordenacao'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = 'coordenacao'::text))))));
CREATE POLICY educart_aulas_coord_inserir_dev ON public.educart_aulas_dev FOR INSERT TO authenticated WITH CHECK (((criada_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = 'coordenacao'::text))))));
CREATE POLICY educart_aulas_equipe_ler_dev ON public.educart_aulas_dev FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])))))));
CREATE POLICY educart_aulas_estudante_ler_dev ON public.educart_aulas_dev FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (matriculas m
     JOIN pessoas p ON ((p.id = m.pessoa_id)))
  WHERE ((m.turma_id = educart_aulas_dev.turma_id) AND (p.auth_user_id = ( SELECT auth.uid() AS uid)) AND (m.situacao = ANY (ARRAY['ativa'::text, 'concluida'::text]))))));
GRANT SELECT, INSERT, UPDATE ON public.educart_chamadas_dev TO authenticated;
CREATE POLICY educart_chamadas_coord_corrigir_dev ON public.educart_chamadas_dev FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = 'coordenacao'::text)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = 'coordenacao'::text))))));
CREATE POLICY educart_chamadas_equipe_inserir_dev ON public.educart_chamadas_dev FOR INSERT TO authenticated WITH CHECK (((registrado_por = ( SELECT auth.uid() AS uid)) AND (atualizado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])))))));
CREATE POLICY educart_chamadas_equipe_ler_dev ON public.educart_chamadas_dev FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])))))));
CREATE POLICY educart_chamadas_estudante_ler_dev ON public.educart_chamadas_dev FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (matriculas m
     JOIN pessoas p ON ((p.id = m.pessoa_id)))
  WHERE ((m.id = educart_chamadas_dev.matricula_id) AND (p.auth_user_id = ( SELECT auth.uid() AS uid))))));
GRANT SELECT ON public.educart_chamadas_historico_dev TO authenticated;
CREATE POLICY educart_historico_equipe_ler_dev ON public.educart_chamadas_historico_dev FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins pa
  WHERE (pa.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis ep
  WHERE ((ep.user_id = ( SELECT auth.uid() AS uid)) AND (ep.papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])))))));
GRANT SELECT ON public.educart_ajustes_aulas_r12_dev TO authenticated;
CREATE POLICY educart_r12_ajuste_aulas_equipe_ler ON public.educart_ajustes_aulas_r12_dev FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM portal_admins a
  WHERE (a.user_id = ( SELECT auth.uid() AS uid)))) AND (EXISTS ( SELECT 1
   FROM equipe_papeis e
  WHERE ((e.user_id = ( SELECT auth.uid() AS uid)) AND (e.papel = ANY (ARRAY['secretaria'::text, 'coordenacao'::text])))))));
CREATE FUNCTION educart_interno_11.validar_aula_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.portal_admins pa JOIN public.equipe_papeis ep ON ep.user_id=pa.user_id
   WHERE pa.user_id=auth.uid() AND ep.papel='coordenacao'
 ) THEN RAISE EXCEPTION 'Aula exclusiva da Coordenação' USING errcode='42501'; END IF;
 IF TG_OP='UPDATE' THEN
   IF NEW.id<>OLD.id OR NEW.turma_id<>OLD.turma_id OR NEW.criada_por<>OLD.criada_por
     OR NEW.data_aula<>OLD.data_aula OR NEW.inicio<>OLD.inicio OR NEW.fim<>OLD.fim THEN
      RAISE EXCEPTION 'Identidade da aula imutável; crie outra aula' USING errcode='42501';
   END IF;
   IF NEW.situacao='cancelada' AND OLD.situacao<>'cancelada'
      AND EXISTS(SELECT 1 FROM public.educart_chamadas_dev WHERE aula_id=OLD.id) THEN
     RAISE EXCEPTION 'Aula com chamadas não pode ser cancelada' USING errcode='23514';
   END IF;
   NEW.atualizada_em=now();
 END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION educart_interno_11.validar_aula_dev() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION educart_interno_11.validar_chamada_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE v_uid uuid:=auth.uid(); v_turma uuid; v_situacao_aula text;
        v_matricula_turma uuid; v_matricula_situacao text;
BEGIN
 IF v_uid IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.portal_admins pa JOIN public.equipe_papeis ep ON ep.user_id=pa.user_id
    WHERE pa.user_id=v_uid AND ep.papel IN ('secretaria','coordenacao')
 ) THEN RAISE EXCEPTION 'Chamada restrita à equipe' USING errcode='42501'; END IF;
 IF TG_OP='UPDATE' THEN
   IF NOT EXISTS (
     SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=v_uid AND ep.papel='coordenacao'
   ) THEN RAISE EXCEPTION 'Correção exclusiva da Coordenação' USING errcode='42501'; END IF;
   IF NEW.id<>OLD.id OR NEW.aula_id<>OLD.aula_id OR NEW.matricula_id<>OLD.matricula_id
      OR NEW.registrado_por<>OLD.registrado_por OR NEW.registrado_em<>OLD.registrado_em THEN
     RAISE EXCEPTION 'Chave e autoria da chamada são imutáveis' USING errcode='42501';
   END IF;
   IF length(btrim(coalesce(NEW.motivo_ajuste,''))) NOT BETWEEN 8 AND 300 THEN
     RAISE EXCEPTION 'Informe motivo da correção (8-300 caracteres)' USING errcode='22023';
   END IF;
   IF NEW.situacao IS NOT DISTINCT FROM OLD.situacao
      AND NEW.justificativa IS NOT DISTINCT FROM OLD.justificativa THEN
     RAISE EXCEPTION 'Correção sem mudança' USING errcode='22023';
   END IF;
 ELSE
   NEW.registrado_por=v_uid;
   NEW.registrado_em=now();
   NEW.motivo_ajuste=NULL;
 END IF;
 SELECT a.turma_id,a.situacao INTO v_turma,v_situacao_aula
   FROM public.educart_aulas_dev a WHERE a.id=NEW.aula_id;
 SELECT m.turma_id,m.situacao INTO v_matricula_turma,v_matricula_situacao
   FROM public.matriculas m WHERE m.id=NEW.matricula_id;
 IF v_turma IS NULL OR v_matricula_turma IS NULL OR v_turma<>v_matricula_turma THEN
   RAISE EXCEPTION 'Aula e matrícula devem pertencer à mesma turma' USING errcode='23514';
 END IF;
 IF v_situacao_aula<>'realizada' OR
    v_matricula_situacao NOT IN ('ativa','concluida') THEN
   RAISE EXCEPTION 'Aula realizada e matrícula ativa/concluída são obrigatórias' USING errcode='23514';
 END IF;
 IF (SELECT data_aula FROM public.educart_aulas_dev WHERE id=NEW.aula_id)>current_date THEN
   RAISE EXCEPTION 'Não é permitido registrar chamada futura' USING errcode='23514';
 END IF;
 NEW.atualizado_por=v_uid;
 NEW.atualizado_em=now();
 IF TG_OP='INSERT' THEN NEW.registrado_por=v_uid; END IF;
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION educart_interno_11.validar_chamada_dev() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION educart_interno_11.auditar_chamada_dev()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
 INSERT INTO public.educart_chamadas_historico_dev
   (chamada_id,operacao,situacao_anterior,situacao_nova,
    justificativa_anterior,justificativa_nova,motivo,autor_id)
 VALUES (NEW.id,CASE WHEN TG_OP='INSERT' THEN 'registro' ELSE 'correcao' END,
         CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.situacao END,NEW.situacao,
         CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.justificativa END,
         NEW.justificativa,NEW.motivo_ajuste,NEW.atualizado_por);
 RETURN NEW;
END $function$;
REVOKE ALL ON FUNCTION educart_interno_11.auditar_chamada_dev() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION educart_interno_11.educart_r12_ajustar_aula_dev(p_aula_id uuid, p_operacao text, p_data_nova date, p_inicio_novo time without time zone, p_fim_novo time without time zone, p_motivo text, p_confirmo boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
 v_uid uuid:=auth.uid();
 v_aula public.educart_aulas_dev%rowtype;
 v_hoje date:=(now() AT TIME ZONE 'America/Bahia')::date;
 v_substituta uuid;v_id uuid;
BEGIN
 IF v_uid IS NULL
  OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=v_uid)
  OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=v_uid AND e.papel='coordenacao')
 THEN RAISE EXCEPTION 'Ajuste reservado à Coordenação' USING ERRCODE='42501'; END IF;
 IF p_confirmo IS DISTINCT FROM TRUE OR p_operacao NOT IN ('remarcar','cancelar')
   OR length(btrim(coalesce(p_motivo,''))) NOT BETWEEN 8 AND 300
 THEN RAISE EXCEPTION 'Confirmação e motivo obrigatórios' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_aula FROM public.educart_aulas_dev WHERE id=p_aula_id FOR UPDATE;
 IF NOT FOUND OR v_aula.situacao<>'planejada'
 THEN RAISE EXCEPTION 'Somente aula planejada pode ser alterada' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.educart_chamadas_dev c WHERE c.aula_id=p_aula_id)
 THEN RAISE EXCEPTION 'Aula com chamada não pode ser alterada' USING ERRCODE='23514'; END IF;
 IF p_operacao='remarcar' THEN
   IF p_data_nova IS NULL OR p_data_nova<v_hoje
      OR p_inicio_novo IS NULL OR p_fim_novo IS NULL OR p_inicio_novo>=p_fim_novo
      OR (p_data_nova=v_aula.data_aula AND p_inicio_novo=v_aula.inicio AND p_fim_novo=v_aula.fim)
   THEN RAISE EXCEPTION 'Nova data e horário válidos obrigatórios' USING ERRCODE='22023'; END IF;
   -- O trigger proíbe UPDATE de data/horário. Nova aula recebe nova identidade.
   INSERT INTO public.educart_aulas_dev(turma_id,data_aula,inicio,fim,tema,situacao,criada_por)
   VALUES(v_aula.turma_id,p_data_nova,p_inicio_novo,p_fim_novo,v_aula.tema,'planejada',v_uid)
   RETURNING id INTO v_substituta;
 ELSE
   IF p_data_nova IS NOT NULL OR p_inicio_novo IS NOT NULL OR p_fim_novo IS NOT NULL
   THEN RAISE EXCEPTION 'Cancelamento não aceita nova data' USING ERRCODE='22023'; END IF;
 END IF;
 UPDATE public.educart_aulas_dev SET situacao='cancelada' WHERE id=p_aula_id;
 INSERT INTO public.educart_ajustes_aulas_r12_dev(
  aula_id,operacao,data_anterior,inicio_anterior,fim_anterior,data_nova,
  inicio_novo,fim_novo,motivo,registrado_por,aula_substituta_id)
 VALUES(p_aula_id,p_operacao,v_aula.data_aula,v_aula.inicio,v_aula.fim,
   CASE WHEN p_operacao='remarcar' THEN p_data_nova END,
   CASE WHEN p_operacao='remarcar' THEN p_inicio_novo END,
   CASE WHEN p_operacao='remarcar' THEN p_fim_novo END,
   btrim(p_motivo),v_uid,v_substituta)
 RETURNING id INTO v_id;
 RETURN v_id;
END;$function$;
REVOKE ALL ON FUNCTION educart_interno_11.educart_r12_ajustar_aula_dev(uuid,text,date,time without time zone,time without time zone,text,boolean) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.educart_r12_ajustar_aula_dev(p_aula_id uuid, p_operacao text, p_data_nova date, p_inicio_novo time without time zone, p_fim_novo time without time zone, p_motivo text, p_confirmo boolean)
 RETURNS uuid
 LANGUAGE sql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
 SELECT educart_interno_11.educart_r12_ajustar_aula_dev($1,$2,$3,$4,$5,$6,$7);
$function$;
REVOKE ALL ON FUNCTION public.educart_r12_ajustar_aula_dev(uuid,text,date,time without time zone,time without time zone,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION educart_interno_11.educart_r12_ajustar_aula_dev(uuid,text,date,time without time zone,time without time zone,text,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_r12_ajustar_aula_dev(uuid,text,date,time without time zone,time without time zone,text,boolean) TO authenticated;
CREATE TRIGGER educart_aulas_guarda_dev BEFORE INSERT OR UPDATE ON public.educart_aulas_dev FOR EACH ROW EXECUTE FUNCTION educart_interno_11.validar_aula_dev();
CREATE TRIGGER educart_chamadas_guarda_dev BEFORE INSERT OR UPDATE ON public.educart_chamadas_dev FOR EACH ROW EXECUTE FUNCTION educart_interno_11.validar_chamada_dev();
CREATE TRIGGER educart_chamadas_auditoria_dev AFTER INSERT OR UPDATE ON public.educart_chamadas_dev FOR EACH ROW EXECUTE FUNCTION educart_interno_11.auditar_chamada_dev();

-- ETAPA NÃO PRESENTE: RPC de ativação de turma histórica, política completa
-- de aulas/chamadas, cadastro de papéis por autoridade competente, teste JWT/RLS,
-- dados reais, backup/restauração e autorização de publicação.
-- Importante: 'legado_ativo' permanece bloqueado por esta RPC até sanar contrato financeiro.
ROLLBACK;
