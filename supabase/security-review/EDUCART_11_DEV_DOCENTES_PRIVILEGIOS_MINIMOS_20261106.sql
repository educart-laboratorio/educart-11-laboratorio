-- EducART 1.1 R14 DEV · correção de menor privilégio após inspeção real dos GRANTs.
-- Supabase pode pré-conceder ALL a authenticated em novas tabelas public.
-- Sem perda de dados, sem PROD, mantém SELECT/INSERT/UPDATE autorizados e proíbe DELETE/TRUNCATE.
REVOKE ALL ON TABLE public.educart_docentes_dev FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.educart_docentes_dev TO authenticated;

DROP POLICY IF EXISTS educart_docentes_coordenacao_dev ON public.educart_docentes_dev;

CREATE POLICY educart_docentes_select_coordenacao_dev ON public.educart_docentes_dev
FOR SELECT TO authenticated USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
);

CREATE POLICY educart_docentes_insert_coordenacao_dev ON public.educart_docentes_dev
FOR INSERT TO authenticated WITH CHECK (
  criado_por=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
);

CREATE POLICY educart_docentes_update_coordenacao_dev ON public.educart_docentes_dev
FOR UPDATE TO authenticated USING (
  criado_por=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
) WITH CHECK (
  criado_por=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.portal_admins p WHERE p.user_id=(SELECT auth.uid()))
  AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
);
