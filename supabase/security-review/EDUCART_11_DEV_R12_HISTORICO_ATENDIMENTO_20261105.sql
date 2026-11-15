-- EducART 1.1 / Q11 — Histórico de atendimento privado e manual, somente DEV.
-- Não integra o WhatsApp; nenhum envio automático ou processamento de mensagens externas.
CREATE TABLE public.educart_atendimentos_r12_dev (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 inscricao_id uuid NOT NULL REFERENCES public.inscricoes_oficina(id) ON DELETE RESTRICT,
 canal text NOT NULL CHECK(canal IN ('whatsapp','telefone','presencial','email','outro')),
 resultado text NOT NULL CHECK(resultado IN ('contatado','aguardando','interessado','retornar','sem_resposta')),
 observacao text NOT NULL DEFAULT '' CHECK(length(observacao)<=500),
 proximo_retorno_em date,
 registrado_por uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 registrado_em timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT educart_r12_retorno_data_coerente CHECK(
   (resultado='retornar' AND proximo_retorno_em IS NOT NULL)
   OR (resultado<>'retornar' AND proximo_retorno_em IS NULL)
 )
);
CREATE INDEX educart_r12_atendimentos_inscricao_data_idx
 ON public.educart_atendimentos_r12_dev(inscricao_id,registrado_em DESC);
CREATE INDEX educart_r12_atendimentos_retorno_idx
 ON public.educart_atendimentos_r12_dev(proximo_retorno_em)
 WHERE resultado='retornar';

ALTER TABLE public.educart_atendimentos_r12_dev ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.educart_atendimentos_r12_dev FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON public.educart_atendimentos_r12_dev TO authenticated;
CREATE POLICY educart_r12_atendimento_equipe_ler_dev
 ON public.educart_atendimentos_r12_dev FOR SELECT TO authenticated
 USING (
  EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
  AND EXISTS(SELECT 1 FROM public.equipe_papeis e
    WHERE e.user_id=(SELECT auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
 );
CREATE POLICY educart_r12_atendimento_equipe_inserir_dev
 ON public.educart_atendimentos_r12_dev FOR INSERT TO authenticated
 WITH CHECK (
  registrado_por=(SELECT auth.uid())
  AND EXISTS(SELECT 1 FROM public.inscricoes_oficina i WHERE i.id=inscricao_id)
  AND EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid()))
  AND EXISTS(SELECT 1 FROM public.equipe_papeis e
    WHERE e.user_id=(SELECT auth.uid()) AND e.papel IN ('secretaria','coordenacao'))
 );
COMMENT ON TABLE public.educart_atendimentos_r12_dev IS
 'Q11 DEV: anotação manual e imutável por inscrição, sem integração com redes sociais ou envio.';
