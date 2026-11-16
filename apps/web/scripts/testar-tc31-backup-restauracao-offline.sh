#!/usr/bin/env bash
# GSI TC31: prova de pg_dump/pg_restore apenas com dados sinteticos e PostgreSQL 17.
# Nenhum acesso ao Supabase, Cloudflare, tokens, segredos ou ambiente de producao.
set -Eeuo pipefail
test "${GITHUB_REPOSITORY:-}" = "educart-laboratorio/educart-11-laboratorio" || {
  echo "TC31: repositorio divergente"; exit 1;
}
test "${GITHUB_REF_NAME:-}" = "gsi-integracao-triple-core-20261115" || {
  echo "TC31: branch divergente"; exit 1;
}
command -v docker >/dev/null
work="$(mktemp -d)"
source_name="tc31-origem-${GITHUB_RUN_ID:-local}-$$"
restore_name="tc31-destino-${GITHUB_RUN_ID:-local}-$$"
cleanup() {
  docker rm -f "$source_name" "$restore_name" >/dev/null 2>&1 || true
  rm -rf "$work"
}
trap cleanup EXIT
umask 077
for n in "$source_name" "$restore_name"; do
  docker run -d --rm --network none --name "$n" \
    -e POSTGRES_PASSWORD=syntetico-tc31-unico postgres:17 >/dev/null
  ready=0
  for i in $(seq 1 70); do
    if docker logs "$n" 2>&1 | grep -Fq 'PostgreSQL init process complete; ready for start up.' \
       && docker exec "$n" pg_isready -U postgres -d postgres >/dev/null 2>&1; then ready=1; break; fi
    sleep 1
  done
  test "$ready" -eq 1 || { echo "TC31: postgres sintetico nao iniciou"; exit 1; }
done
docker exec -i "$source_name" psql -Xq -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fn$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$fn$;
CREATE TABLE public.inscricoes_oficina(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 nome_completo text NOT NULL,
 data_nascimento date NOT NULL,
 status text DEFAULT 'pendente_confirmacao',
 created_at timestamptz DEFAULT now()
);
CREATE TABLE public.portal_admins(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
CREATE TABLE public.perfis_administrativos_oficina(
 inscricao_id uuid PRIMARY KEY REFERENCES public.inscricoes_oficina(id),
 prioridade text NOT NULL DEFAULT 'normal'
);
ALTER TABLE public.inscricoes_oficina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_administrativos_oficina ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir envio publico de fichas de inscricao"
 ON public.inscricoes_oficina FOR INSERT TO anon,authenticated
 WITH CHECK (data_nascimento <= (((now() AT TIME ZONE 'America/Bahia')::date - INTERVAL '14 years')::date));
CREATE POLICY educart_admin_read_inscricoes ON public.inscricoes_oficina
 FOR SELECT TO authenticated USING (EXISTS
 (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY educart_admin_update_inscricoes ON public.inscricoes_oficina
 FOR UPDATE TO authenticated USING (EXISTS
 (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())))
 WITH CHECK (EXISTS
 (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY educart_portal_admins_self_read ON public.portal_admins
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY educart_admin_read_perfis ON public.perfis_administrativos_oficina
 FOR SELECT TO authenticated USING (EXISTS
 (SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())));
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.portal_admins VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO public.inscricoes_oficina(nome_completo,data_nascimento)
 SELECT 'SINTETICO-'||i,'2000-01-01'::date FROM generate_series(1,14) i;
INSERT INTO public.perfis_administrativos_oficina(inscricao_id)
 SELECT id FROM public.inscricoes_oficina ORDER BY nome_completo LIMIT 6;
SQL
# Backup REAL da base DESCARTAVEL, em um container; sem qualquer rede.
docker exec "$source_name" pg_dump -U postgres -d postgres -Fc -n public -n auth > "$work/sintetico.dump"
test -s "$work/sintetico.dump"
docker exec -i "$restore_name" psql -Xq -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
DROP SCHEMA IF EXISTS public CASCADE;
SQL
docker exec -i "$restore_name" pg_restore -U postgres -d postgres --exit-on-error < "$work/sintetico.dump"
query="SELECT
 (SELECT count(*) FROM public.inscricoes_oficina)||'|'||
 (SELECT count(*) FROM public.portal_admins)||'|'||
 (SELECT count(*) FROM public.perfis_administrativos_oficina)||'|'||
 (SELECT count(*) FROM auth.users)||'|'||
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity)||'|'||
 (SELECT count(*) FROM pg_policies WHERE schemaname='public')||'|'||
 (SELECT md5(string_agg(id::text,',' ORDER BY id)) FROM auth.users);"
original="$(docker exec "$source_name" psql -XAtq -v ON_ERROR_STOP=1 -U postgres -d postgres -c "$query")"
restaurado="$(docker exec "$restore_name" psql -XAtq -v ON_ERROR_STOP=1 -U postgres -d postgres -c "$query")"
test "$original" = "$restaurado" || { echo "TC31: snapshot divergente"; exit 1; }
case "$restaurado" in 14\|1\|6\|1\|3\|5\|*) ;; *) echo "TC31: contagens sinteticas inesperadas"; exit 1;; esac
echo "TC31 PASS: pg_dump e pg_restore PostgreSQL17 em DOIS containers isolados; 14/1/6/1 sinteticamente, 3 tabelas RLS e 5 policies preservadas; nenhum dado real/secret lido."
