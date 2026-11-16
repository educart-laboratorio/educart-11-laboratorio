#!/usr/bin/env bash
# TC-04 / SUPER GSI: ensaio da candidata PROD existente, exclusivamente sintetico.
# Nada conecta Supabase PROD/DEV, Cloudflare ou credenciais reais.
set -Eeuo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SQL="$REPO_ROOT/supabase/security-review/EDUCART_11_PROD_CANDIDATA_MIGRACAO_ADITIVA_20261111.sql"
test -s "$SQL"
CTR="gsi-tc04-sintetico-$$"
LAB="$(mktemp -d)"
cleanup() { docker rm -f "$CTR" >/dev/null 2>&1 || true; rm -rf "$LAB"; }
trap cleanup EXIT

docker run --detach --rm --network none --name "$CTR" \
  -e POSTGRES_PASSWORD=apenas-sintetico-tc04 postgres:16 >/dev/null
pronto=0
for _ in $(seq 1 60); do
  if docker logs "$CTR" 2>&1 | grep -Fq 'PostgreSQL init process complete; ready for start up.' \
    && docker exec "$CTR" psql -U postgres -d postgres -XAtq -v ON_ERROR_STOP=1 \
      -c 'SELECT 1' 2>/dev/null | grep -Fxq '1'; then pronto=1; break; fi
  sleep 1
done
test "$pronto" = 1 || { echo "::error::PostgreSQL descartavel indisponivel"; exit 1; }

docker exec -i "$CTR" psql -U postgres -d postgres -Xq -v ON_ERROR_STOP=1 <<'SQLBOOT'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
 SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$fn$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.portal_admins(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.portal_admins TO authenticated;
CREATE POLICY educart_portal_admins_self_read ON public.portal_admins
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE TABLE public.inscricoes_oficina (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 data_nascimento date NOT NULL,
 status text NOT NULL DEFAULT 'pendente_confirmacao'
);
CREATE TABLE public.perfis_administrativos_oficina (
 inscricao_id uuid PRIMARY KEY REFERENCES public.inscricoes_oficina(id)
);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
INSERT INTO public.portal_admins VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.inscricoes_oficina(data_nascimento) VALUES ('2000-01-01');
SQLBOOT
echo "TC04: legado academico sintetico criado, PROD e DEV reais intocados."

# Primeiro dever: sem portoes o SQL NUNCA pode executar.
if cat "$SQL" | docker exec -i "$CTR" psql -U postgres -d postgres -Xq -v ON_ERROR_STOP=1 \
  >"$LAB/negativo.log" 2>&1; then
  echo "::error::Candidata aceitou execucao sem os portoes"; exit 1
fi
grep -Fq 'Portão bloqueado' "$LAB/negativo.log" || {
  echo "::error::Negativo falhou por razao diferente da trava"; tail -n 10 "$LAB/negativo.log"; exit 1;
}
test "$(docker exec "$CTR" psql -U postgres -XAtq -c "SELECT to_regclass('public.equipe_papeis') IS NULL")" = "t"
echo "TC04: tentativa sem portoes negada; nenhum objeto criado."

# Simulacao das duas liberacoes APENAS no banco descartavel.
{
  printf "SET educart.autorizacao_prod_11 = 'DIRECAO_LIBEROU_IMPLANTACAO';\n"
  printf "SET educart.backup_restaurado_11 = 'RESTAURACAO_TESTADA';\n"
  cat "$SQL"
} | docker exec -i "$CTR" psql -U postgres -d postgres -Xq -v ON_ERROR_STOP=1 \
    >"$LAB/positivo.log" 2>&1 || {
      echo "::error::Candidata existente falhou no banco descartavel"; tail -n 40 "$LAB/positivo.log"; exit 1;
    }

docker exec -i "$CTR" psql -U postgres -d postgres -Xq -v ON_ERROR_STOP=1 <<'SQLVERIFY'
DO $check$
DECLARE v_tabelas integer; v_policies integer; v_triggers integer;
BEGIN
 SELECT count(*) INTO v_tabelas FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind='r' AND c.relname IN
 ('equipe_papeis','pessoas','formacoes','educart_docentes_dev','modulos','turmas','matriculas',
 'educart_vinculos_manuais_r12_dev','educart_ativacoes_turmas_historicas_r12_dev',
 'educart_aulas_dev','educart_chamadas_dev','educart_chamadas_historico_dev','educart_ajustes_aulas_r12_dev');
 SELECT count(*) INTO v_policies FROM pg_policies WHERE schemaname='public' AND tablename IN
 ('equipe_papeis','pessoas','formacoes','educart_docentes_dev','modulos','turmas','matriculas',
 'educart_vinculos_manuais_r12_dev','educart_ativacoes_turmas_historicas_r12_dev',
 'educart_aulas_dev','educart_chamadas_dev','educart_chamadas_historico_dev','educart_ajustes_aulas_r12_dev');
 SELECT count(*) INTO v_triggers FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 WHERE c.relnamespace='public'::regnamespace AND NOT t.tgisinternal AND c.relname IN
 ('equipe_papeis','pessoas','formacoes','educart_docentes_dev','modulos','turmas','matriculas',
 'educart_vinculos_manuais_r12_dev','educart_ativacoes_turmas_historicas_r12_dev',
 'educart_aulas_dev','educart_chamadas_dev','educart_chamadas_historico_dev','educart_ajustes_aulas_r12_dev');
 IF v_tabelas<>13 OR v_policies<>25 OR v_triggers<>6 THEN
  RAISE EXCEPTION 'Contadores inesperados: tabelas %, RLS policies %, triggers %', v_tabelas,v_policies,v_triggers;
 END IF;
 IF (SELECT count(*) FROM public.inscricoes_oficina)<>1 OR
    (SELECT count(*) FROM public.portal_admins)<>1 OR
    (SELECT count(*) FROM public.equipe_papeis)<>0 THEN
    RAISE EXCEPTION 'Legado ou permissoes modificados sem autorizacao';
 END IF;
 IF has_table_privilege('anon','public.equipe_papeis','SELECT') THEN
   RAISE EXCEPTION 'Acesso anonimo incorreto a equipe_papeis';
 END IF;
END;
$check$;
INSERT INTO public.pessoas(nome_completo) VALUES ('FICCAO TC04 - SEM DADOS REAIS');
INSERT INTO public.equipe_papeis(user_id,papel) VALUES ('11111111-1111-4111-8111-111111111111','coordenacao');
SQLVERIFY
echo "TC04: 13 tabelas, 25 policies, 6 triggers, legado intacto e sem papeis automaticos."

# Identidade autorizada: le o seu papel; RLS academico requer papel + portal_admins.
PERMITIDOS="$(docker exec "$CTR" psql -U postgres -d postgres -XAtq -v ON_ERROR_STOP=1 \
 -c "SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; SELECT count(*) FROM public.pessoas; SELECT count(*) FROM public.equipe_papeis;")"
test "$PERMITIDOS" = "$(printf '1\n1')"
# Outra identidade Auth sem portal_admins/sem papel: negada mesmo autenticada.
NEGADOS="$(docker exec "$CTR" psql -U postgres -d postgres -XAtq -v ON_ERROR_STOP=1 \
 -c "SET ROLE authenticated; SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222'; SELECT count(*) FROM public.pessoas; SELECT count(*) FROM public.equipe_papeis;")"
test "$NEGADOS" = "$(printf '0\n0')"
echo "TC04: JWT sintetico autorizado 1/1; outra identidade 0/0. Sem conexao a bases reais."
