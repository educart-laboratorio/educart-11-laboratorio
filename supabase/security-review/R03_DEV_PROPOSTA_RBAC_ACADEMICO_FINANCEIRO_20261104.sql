-- EducART 1.1 R03 — MATRIZ CONSERVADORA PARA DATABASE-DEV.
-- STATUS ATUAL (04/11/2026): APLICADA SOMENTE EM database-dev, migração 20261104115532.
-- CÓPIA DE RASTREABILIDADE, fora de migrations genéricas. NÃO REAPLICAR EM DEV.
-- Não executar em produção: database-prod e educart.pro permanecem intactos.
-- Somente DB-dev, sem usuários, admins, inscrições nem dados acadêmicos reais.
-- Acesso acadêmico à Secretaria: leitura de pessoas, matrículas e finanças,
-- NÃO mudança de status, confirmação financeira, perfis/imagens/consentimentos.
-- Coordenação: gestão previamente existente, com membership + papel real.
-- Preserva SELECT individual de estudantes, SELECT geral de catálogo.
-- Alteração de pagamento 'pago' segue regra de confirmado_por (não prova quitação).
-- Não cria registros, não concede cargos, não muda storage.
DO $preflight$
BEGIN
 IF (select count(*) from public.portal_admins)<>0 OR (select count(*) from public.equipe_papeis)<>0
 THEN RAISE EXCEPTION 'R03: membro permanente presente - revisar migração de permissões antes de aplicar'; END IF;
 IF EXISTS (SELECT 1 FROM public.pessoas)
  OR EXISTS (SELECT 1 FROM public.matriculas)
  OR EXISTS (SELECT 1 FROM public.mensalidades_formacao)
  OR EXISTS (SELECT 1 FROM public.perfis_artisticos)
  OR EXISTS (SELECT 1 FROM public.midias_artisticas)
  OR EXISTS (SELECT 1 FROM public.autorizacoes_perfil)
  OR EXISTS (SELECT 1 FROM public.formacoes)
  OR EXISTS (SELECT 1 FROM public.modulos)
  OR EXISTS (SELECT 1 FROM public.turmas)
 THEN RAISE EXCEPTION 'R03: dados acadêmicos ou financeiros existentes - homologação específica exigida'; END IF;
 IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND policyname IN ('educart_secretaria_read_pessoas','educart_secretaria_read_matriculas'))
 THEN RAISE EXCEPTION 'R03: policies Secretaria já existentes'; END IF;
 IF (select count(*) from auth.users)<>0 THEN RAISE EXCEPTION 'R03: usuários Auth presentes - revisar ambiente'; END IF;
 IF (select count(*) from pg_policies where schemaname='public' and policyname like 'portal_admin_gerencia_%' and tablename in ('autorizacoes_perfil','formacoes','matriculas','midias_artisticas','modulos','perfis_artisticos','pessoas','turmas'))<>8
 THEN RAISE EXCEPTION 'R03: políticas de gestão não correspondem ao preflight'; END IF;
 IF (select count(*) from pg_policies where schemaname='public' and tablename='mensalidades_formacao' and policyname in ('mensalidades_admin_select','mensalidades_admin_insert','mensalidades_admin_update'))<>3
 THEN RAISE EXCEPTION 'R03: política financeira difere da base verificada'; END IF;
END $preflight$;

ALTER POLICY "portal_admin_gerencia_autorizacoes_perfil" ON public.autorizacoes_perfil
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_formacoes" ON public.formacoes
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_matriculas" ON public.matriculas
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_midias_artisticas" ON public.midias_artisticas
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_modulos" ON public.modulos
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_perfis_artisticos" ON public.perfis_artisticos
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_pessoas" ON public.pessoas
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

ALTER POLICY "portal_admin_gerencia_turmas" ON public.turmas
TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) WITH CHECK (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'));

-- Secretaria deve poder acompanhar pessoas e matrículas, SEM poder editar.
CREATE POLICY "educart_secretaria_read_pessoas" ON public.pessoas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
CREATE POLICY "educart_secretaria_read_matriculas" ON public.matriculas FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));

-- Formações/módulos/turmas já possuem políticas não-administrativas de leitura.
-- Preservadas intencionalmente para não romper catálogos ou acesso de estudantes.

ALTER POLICY "mensalidades_admin_select" ON public.mensalidades_formacao TO authenticated USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel IN ('secretaria','coordenacao')));
ALTER POLICY "mensalidades_admin_insert" ON public.mensalidades_formacao TO authenticated
WITH CHECK ((EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) AND (status <> 'pago' OR confirmado_por=(SELECT auth.uid())));
ALTER POLICY "mensalidades_admin_update" ON public.mensalidades_formacao TO authenticated
USING (EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao'))
WITH CHECK ((EXISTS (SELECT 1 FROM public.portal_admins pa WHERE pa.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis ep WHERE ep.user_id=(SELECT auth.uid()) AND ep.papel='coordenacao')) AND (status <> 'pago' OR confirmado_por=(SELECT auth.uid())));
