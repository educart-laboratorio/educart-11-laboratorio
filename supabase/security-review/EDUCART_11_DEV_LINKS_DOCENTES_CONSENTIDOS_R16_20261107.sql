-- EducART R16 | Somente DEV: links consentidos para perfis públicos mínimos.
-- Institucional: não usar este arquivo em PROD sem ordem separada da direção.
-- Contatos, disponibilidade, experiência privada e histórico de turmas NUNCA saem pela RPC pública.
ALTER TABLE public.educart_docentes_dev
  ADD COLUMN IF NOT EXISTS apresentacao_publica text;
DO $ddl$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='educart_docentes_apresentacao_publica_limite_r16') THEN
    ALTER TABLE public.educart_docentes_dev ADD CONSTRAINT educart_docentes_apresentacao_publica_limite_r16
      CHECK (apresentacao_publica IS NULL OR length(apresentacao_publica)<=1200);
  END IF;
END $ddl$;

CREATE TABLE IF NOT EXISTS public.educart_docente_links_dev (
  docente_id uuid PRIMARY KEY REFERENCES public.educart_docentes_dev(id) ON DELETE RESTRICT,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  ativado_em timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz,
  criado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);
ALTER TABLE public.educart_docente_links_dev ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhum acesso Data API direto (nem à Coordenação).
REVOKE ALL ON TABLE public.educart_docente_links_dev FROM PUBLIC, anon, authenticated;
-- Exposição pública exclusivamente via RPC com colunas permitidas.
CREATE OR REPLACE FUNCTION public.educart_publicar_perfil_docente_dev(p_docente_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $rpc$
DECLARE v_token uuid;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
    OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                  WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Somente Coordenação pode gerar links de docentes.' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.educart_docentes_dev d
    WHERE d.id=p_docente_id AND d.situacao='ativo'
      AND d.autorizou_divulgacao IS TRUE
      AND length(btrim(coalesce(d.apresentacao_publica,'')))>=10
  ) THEN
    RAISE EXCEPTION 'O docente precisa estar ativo, ter consentimento e apresentação pública preenchida.' USING ERRCODE='23514';
  END IF;
  INSERT INTO public.educart_docente_links_dev AS l (docente_id,criado_por)
  VALUES (p_docente_id,(SELECT auth.uid()))
  ON CONFLICT (docente_id) DO UPDATE SET
    token=CASE WHEN l.revogado_em IS NULL THEN l.token ELSE gen_random_uuid() END,
    ativado_em=now(), revogado_em=NULL
  RETURNING token INTO v_token;
  RETURN v_token;
END $rpc$;

CREATE OR REPLACE FUNCTION public.educart_revogar_perfil_docente_dev(p_docente_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $rpc$
DECLARE v_count bigint;
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
    OR NOT EXISTS(SELECT 1 FROM public.equipe_papeis e
                  WHERE e.user_id=(SELECT auth.uid()) AND e.papel='coordenacao') THEN
    RAISE EXCEPTION 'Somente Coordenação pode desativar links de docentes.' USING ERRCODE='42501';
  END IF;
  UPDATE public.educart_docente_links_dev SET revogado_em=now()
  WHERE docente_id=p_docente_id AND revogado_em IS NULL;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  RETURN v_count>0;
END $rpc$;

CREATE OR REPLACE FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(p_token uuid)
RETURNS TABLE(nome_profissional text, areas_atuacao text, formacao_profissional text, apresentacao_publica text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $rpc$
  SELECT coalesce(nullif(btrim(d.nome_artistico),''),d.nome_completo),
         d.areas_atuacao,d.formacao_profissional,d.apresentacao_publica
  FROM public.educart_docente_links_dev l
  JOIN public.educart_docentes_dev d ON d.id=l.docente_id
  WHERE l.token=p_token AND l.revogado_em IS NULL
    AND d.autorizou_divulgacao IS TRUE AND d.situacao='ativo'
    AND length(btrim(coalesce(d.apresentacao_publica,'')))>=10
  LIMIT 1;
$rpc$;

REVOKE ALL ON FUNCTION public.educart_publicar_perfil_docente_dev(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.educart_revogar_perfil_docente_dev(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.educart_publicar_perfil_docente_dev(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_revogar_perfil_docente_dev(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(uuid) TO anon,authenticated;
COMMENT ON FUNCTION public.educart_ler_perfil_docente_compartilhado_dev(uuid)
IS 'R16 DEV: acesso por token aleatório; entrega só quatro campos profissionais consentidos, sem dados privados.';
