-- EducART 1.1 | R03 — prova de conceito RBAC Secretaria / Coordenação.
-- Data: 04/11/2026. Execução real no database-dev: BEGIN/ROLLBACK.
-- QUATRO CENÁRIOS TESTADOS: sem membership, Secretaria, Coordenação,
-- e ambos os papéis na mesma conta. Todos passaram sob RLS real.
-- ESTE SCRIPT NÃO É UMA MIGRAÇÃO ATIVA. TERMINA EM ROLLBACK.
-- Não executar em produção. Não criar/permanecer contas reais.
-- Atenção: as demais tabelas de dados de estudantes, presenças e
-- finanças exigem matriz de privilégios e RLS específica antes do RBAC final.
--
-- Cuidados na futura migração:
-- 1. Inventariar admins existentes e distribuir papéis por processo
--    aprovado (sem inferir cargos por nome/e-mail).
-- 2. Preservar registro auditável de quem concede/revoga cada papel.
-- 3. Secretaria: ler inscrições, acompanhar contatos; NÃO aprovar
--    matrícula/pagamento por privilégio implícito.
-- 4. Coordenação: ler inscrições e decidir status. Separar confirmação
--    financeira com conciliação/recebimento reais.
-- 5. O mesmo usuário poderá possuir os DOIS papéis, se expressamente
--    atribuído por administração autorizada.
-- 6. Alinhar botões, estados e mensagens de /admin/login, /admin,
--    módulo acadêmico e CSV antes de publicar.
-- 7. Evitar políticas ALL/USING(true) para tabelas sensíveis.

BEGIN;

CREATE TABLE public.equipe_papeis_r03_laboratorio (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  papel text NOT NULL CHECK (papel IN ('secretaria', 'coordenacao')),
  PRIMARY KEY (user_id, papel)
);

ALTER TABLE public.equipe_papeis_r03_laboratorio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipe_papeis_r03_laboratorio FROM anon, authenticated;
GRANT SELECT ON public.equipe_papeis_r03_laboratorio TO authenticated;

CREATE POLICY r03_ver_meus_papeis
ON public.equipe_papeis_r03_laboratorio
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

-- A policy original de admin_read permanece inalterada, com portal_admins.
-- Só UPDATE de status passa a requerer a função de Coordenação.
ALTER POLICY educart_admin_update_inscricoes ON public.inscricoes_oficina
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.portal_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
  ) AND EXISTS (
    SELECT 1 FROM public.equipe_papeis_r03_laboratorio ep
    WHERE ep.user_id = (SELECT auth.uid()) AND ep.papel = 'coordenacao'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.portal_admins pa
    WHERE pa.user_id = (SELECT auth.uid())
  ) AND EXISTS (
    SELECT 1 FROM public.equipe_papeis_r03_laboratorio ep
    WHERE ep.user_id = (SELECT auth.uid()) AND ep.papel = 'coordenacao'
  )
);

-- PROVA DE CONCEITO APENAS. Reverter todas as mudanças acima.
ROLLBACK;
