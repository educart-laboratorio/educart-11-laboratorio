-- R38: desativação reversível das RPCs experimentais do estudante no DEV.
-- Nenhuma tabela, pessoa, matrícula, convite ou dado será apagado.
REVOKE ALL ON FUNCTION public.educart_r37_criar_convite(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.educart_r37_enviar_atualizacao(text,jsonb)
  FROM PUBLIC, anon, authenticated;
