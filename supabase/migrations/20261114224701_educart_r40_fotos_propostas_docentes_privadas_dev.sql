-- EducART R40 DEV — fotos privadas das propostas docentes (sem tocar produção).
-- Imagens originais preservadas, no máximo 8 MiB e sem URL pública.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('educart-fotos-propostas-docentes-dev','educart-fotos-propostas-docentes-dev',false,8388608,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS educart_r40_docentes_foto_anon_insert_dev ON storage.objects;
CREATE POLICY educart_r40_docentes_foto_anon_insert_dev
ON storage.objects FOR INSERT TO anon
WITH CHECK (
 bucket_id='educart-fotos-propostas-docentes-dev'
 AND name ~ '^propostas/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/foto\.(jpg|png|webp)$'
);
DROP POLICY IF EXISTS educart_r40_docentes_foto_coord_select_dev ON storage.objects;
CREATE POLICY educart_r40_docentes_foto_coord_select_dev
ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='educart-fotos-propostas-docentes-dev'
 AND auth.uid() IS NOT NULL
 AND EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
 AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao')
);
