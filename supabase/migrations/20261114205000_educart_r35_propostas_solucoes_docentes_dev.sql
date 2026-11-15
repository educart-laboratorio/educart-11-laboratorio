-- R35 DEV · propostas de soluções recebidas por formulário público /criar.
-- Adição isolada: não altera formacoes, docentes, turmas, matrículas ou produção.
CREATE TABLE IF NOT EXISTS public.educart_propostas_solucoes_docentes_dev (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_professor text NOT NULL CHECK (char_length(btrim(nome_professor)) BETWEEN 3 AND 150),
  email text CHECK (email IS NULL OR (char_length(email) <= 254 AND email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$')),
  whatsapp text CHECK (whatsapp IS NULL OR char_length(whatsapp) <= 30),
  proposta jsonb NOT NULL CHECK (jsonb_typeof(proposta)='object' AND char_length(proposta::text) <= 45000),
  estado text NOT NULL DEFAULT 'pendente_analise' CHECK (estado='pendente_analise'),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (NULLIF(btrim(coalesce(email,'')),'') IS NOT NULL OR NULLIF(btrim(coalesce(whatsapp,'')),'') IS NOT NULL),
  CHECK (length(btrim(coalesce(proposta->>'nome',''))) BETWEEN 3 AND 120),
  CHECK (proposta->>'tipo' IN ('curso','oficina','aula','solucao'))
);
CREATE INDEX IF NOT EXISTS educart_propostas_docentes_criado_em_dev_idx
ON public.educart_propostas_solucoes_docentes_dev(criado_em DESC);
ALTER TABLE public.educart_propostas_solucoes_docentes_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_propostas_solucoes_docentes_dev FROM PUBLIC,anon,authenticated;
GRANT INSERT ON public.educart_propostas_solucoes_docentes_dev TO anon;
GRANT SELECT ON public.educart_propostas_solucoes_docentes_dev TO authenticated;
DROP POLICY IF EXISTS educart_propostas_docentes_enviar_anon_dev ON public.educart_propostas_solucoes_docentes_dev;
CREATE POLICY educart_propostas_docentes_enviar_anon_dev
ON public.educart_propostas_solucoes_docentes_dev
FOR INSERT TO anon WITH CHECK (estado='pendente_analise');
DROP POLICY IF EXISTS educart_propostas_docentes_ler_coord_dev ON public.educart_propostas_solucoes_docentes_dev;
CREATE POLICY educart_propostas_docentes_ler_coord_dev
ON public.educart_propostas_solucoes_docentes_dev
FOR SELECT TO authenticated USING (
 auth.uid() IS NOT NULL
 AND EXISTS (SELECT 1 FROM public.portal_admins a WHERE a.user_id=auth.uid())
 AND EXISTS (SELECT 1 FROM public.equipe_papeis e WHERE e.user_id=auth.uid() AND e.papel='coordenacao')
);
COMMENT ON TABLE public.educart_propostas_solucoes_docentes_dev IS
'R35 DEV: formulário público de proposta docente, leitura exclusivamente pela Coordenação. Não cria formação, turma, publicação, conta, matrícula ou cobrança.';
