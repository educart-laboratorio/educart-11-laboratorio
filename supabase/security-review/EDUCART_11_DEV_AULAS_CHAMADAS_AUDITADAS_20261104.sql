-- EducART 1.1 / integração institucional — Aulas e chamadas auditadas, SOMENTE DEV.
-- Não rodar em database-prod. Mantém candidatura/pessoa/matrícula/turma como fonte única.
-- Política: Coordenação cria e valida aulas, Secretaria e Coordenação registram a primeira chamada,
-- somente Coordenação corrige registros já feitos, com motivo e trilha imutável.
DO $preflight$
BEGIN
  IF to_regclass('public.educart_aulas_dev') IS NOT NULL
     OR to_regclass('public.educart_chamadas_dev') IS NOT NULL THEN
    RAISE EXCEPTION 'EducART aulas/chamadas DEV já instaladas; não reaplicar';
  END IF;
  IF to_regclass('public.matriculas') IS NULL
     OR to_regclass('public.portal_admins') IS NULL
     OR to_regclass('public.equipe_papeis') IS NULL THEN
    RAISE EXCEPTION 'Modelo acadêmico/RBAC ausente; interrompendo';
  END IF;
END $preflight$;

CREATE SCHEMA IF NOT EXISTS educart_interno_dev;
REVOKE ALL ON SCHEMA educart_interno_dev FROM PUBLIC, anon, authenticated;

CREATE TABLE public.educart_aulas_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  data_aula date NOT NULL,
  inicio time NOT NULL,
  fim time NOT NULL,
  tema text NOT NULL CHECK (length(btrim(tema)) BETWEEN 3 AND 160),
  situacao text NOT NULL DEFAULT 'planejada'
    CHECK (situacao IN ('planejada','realizada','cancelada')),
  criada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  criada_em timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educart_aula_horario_valido_dev CHECK (fim>inicio),
  CONSTRAINT educart_aula_turma_data_hora_unica_dev UNIQUE (turma_id,data_aula,inicio)
);

CREATE TABLE public.educart_chamadas_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL REFERENCES public.educart_aulas_dev(id) ON DELETE RESTRICT,
  matricula_id uuid NOT NULL REFERENCES public.matriculas(id) ON DELETE RESTRICT,
  situacao text NOT NULL CHECK (situacao IN ('presente','ausente','justificada')),
  justificativa text CHECK (justificativa IS NULL OR length(btrim(justificativa))<=500),
  motivo_ajuste text CHECK (motivo_ajuste IS NULL OR length(btrim(motivo_ajuste)) BETWEEN 8 AND 300),
  registrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  atualizado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educart_chamada_aula_matricula_unica_dev UNIQUE(aula_id,matricula_id),
  CONSTRAINT educart_chamada_justificativa_dev CHECK (
    situacao <> 'justificada' OR length(btrim(coalesce(justificativa,''))) BETWEEN 8 AND 500
  )
);

CREATE TABLE public.educart_chamadas_historico_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chamada_id uuid NOT NULL REFERENCES public.educart_chamadas_dev(id) ON DELETE RESTRICT,
  operacao text NOT NULL CHECK (operacao IN ('registro','correcao')),
  situacao_anterior text,
  situacao_nova text NOT NULL,
  justificativa_anterior text,
  justificativa_nova text,
  motivo text,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  registrado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX educart_aulas_por_turma_dev_idx ON public.educart_aulas_dev(turma_id,data_aula DESC);
CREATE INDEX educart_chamadas_por_matricula_dev_idx ON public.educart_chamadas_dev(matricula_id);
CREATE INDEX educart_chamadas_historico_chamada_dev_idx ON public.educart_chamadas_historico_dev(chamada_id,registrado_em);

ALTER TABLE public.educart_aulas_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educart_chamadas_dev ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.educart_chamadas_historico_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_aulas_dev,public.educart_chamadas_dev,public.educart_chamadas_historico_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.educart_aulas_dev TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.educart_chamadas_dev TO authenticated;
GRANT SELECT ON public.educart_chamadas_historico_dev TO authenticated;

-- Equipe: SELECT de aulas e chamadas; estudantes: somente a própria turma e própria chamada.
CREATE POLICY educart_aulas_equipe_ler_dev ON public.educart_aulas_dev FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid())
   AND ep.papel IN ('secretaria','coordenacao'))
);
CREATE POLICY educart_aulas_estudante_ler_dev ON public.educart_aulas_dev FOR SELECT TO authenticated USING (
 EXISTS (
   SELECT 1 FROM public.matriculas m JOIN public.pessoas p ON p.id=m.pessoa_id
   WHERE m.turma_id=educart_aulas_dev.turma_id AND p.auth_user_id=(SELECT auth.uid())
     AND m.situacao IN ('ativa','concluida')
 )
);
CREATE POLICY educart_aulas_coord_inserir_dev ON public.educart_aulas_dev FOR INSERT TO authenticated WITH CHECK (
 criada_por=(SELECT auth.uid())
 AND EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')
);
CREATE POLICY educart_aulas_coord_atualizar_dev ON public.educart_aulas_dev FOR UPDATE TO authenticated USING (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')
) WITH CHECK (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')
);

CREATE POLICY educart_chamadas_equipe_ler_dev ON public.educart_chamadas_dev FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid())
   AND ep.papel IN ('secretaria','coordenacao'))
);
CREATE POLICY educart_chamadas_estudante_ler_dev ON public.educart_chamadas_dev FOR SELECT TO authenticated USING (
 EXISTS (
   SELECT 1 FROM public.matriculas m JOIN public.pessoas p ON p.id=m.pessoa_id
   WHERE m.id=educart_chamadas_dev.matricula_id AND p.auth_user_id=(SELECT auth.uid())
 )
);
CREATE POLICY educart_chamadas_equipe_inserir_dev ON public.educart_chamadas_dev FOR INSERT TO authenticated WITH CHECK (
 registrado_por=(SELECT auth.uid()) AND atualizado_por=(SELECT auth.uid())
 AND EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid())
   AND ep.papel IN ('secretaria','coordenacao'))
);
CREATE POLICY educart_chamadas_coord_corrigir_dev ON public.educart_chamadas_dev FOR UPDATE TO authenticated USING (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')
) WITH CHECK (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')
);
CREATE POLICY educart_historico_equipe_ler_dev ON public.educart_chamadas_historico_dev FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid())
   AND ep.papel IN ('secretaria','coordenacao'))
);

-- Verificação server-side, sem confiar em alterações feitas pelo React.
CREATE FUNCTION educart_interno_dev.validar_aula_dev() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
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
END $$;

CREATE FUNCTION educart_interno_dev.validar_chamada_dev() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
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
END $$;

-- SECURITY DEFINER isolado em schema NÃO exposto, somente trigger registra eventos.
CREATE FUNCTION educart_interno_dev.auditar_chamada_dev() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 INSERT INTO public.educart_chamadas_historico_dev
   (chamada_id,operacao,situacao_anterior,situacao_nova,
    justificativa_anterior,justificativa_nova,motivo,autor_id)
 VALUES (NEW.id,CASE WHEN TG_OP='INSERT' THEN 'registro' ELSE 'correcao' END,
         CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.situacao END,NEW.situacao,
         CASE WHEN TG_OP='INSERT' THEN NULL ELSE OLD.justificativa END,
         NEW.justificativa,NEW.motivo_ajuste,NEW.atualizado_por);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION educart_interno_dev.validar_aula_dev() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION educart_interno_dev.validar_chamada_dev() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION educart_interno_dev.auditar_chamada_dev() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER educart_aulas_guarda_dev BEFORE INSERT OR UPDATE ON public.educart_aulas_dev
 FOR EACH ROW EXECUTE FUNCTION educart_interno_dev.validar_aula_dev();
CREATE TRIGGER educart_chamadas_guarda_dev BEFORE INSERT OR UPDATE ON public.educart_chamadas_dev
 FOR EACH ROW EXECUTE FUNCTION educart_interno_dev.validar_chamada_dev();
CREATE TRIGGER educart_chamadas_auditoria_dev AFTER INSERT OR UPDATE ON public.educart_chamadas_dev
 FOR EACH ROW EXECUTE FUNCTION educart_interno_dev.auditar_chamada_dev();
