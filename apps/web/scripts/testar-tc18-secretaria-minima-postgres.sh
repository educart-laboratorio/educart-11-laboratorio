#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SOURCE="$ROOT/supabase/security-review/EDUCART_11_PROD_RBAC_MINIMO_SECRETARIA_ENSAIO_20261116.sql"
test -s "$SOURCE"
NAME="gsi-tc18-postgres-$$"
TMP="$(mktemp -d)"
cleanup(){ docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
docker run -d --rm --network none --name "$NAME" -e POSTGRES_PASSWORD=tc18-sintetico postgres:16 >/dev/null
ready=0
for _ in $(seq 1 60); do
  # pg_isready pode responder durante a inicialização temporária anterior ao restart.
  if docker logs "$NAME" 2>&1 | grep -Fq 'PostgreSQL init process complete; ready for start up.' \
    && docker exec "$NAME" psql -U postgres -d postgres -XAtq -v ON_ERROR_STOP=1 -c 'SELECT 1' 2>/dev/null | grep -Fxq 1; then ready=1; break; fi
  sleep 1
done
test "$ready" = 1
docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 <<'BOOT'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $fun$
SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$fun$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.portal_admins(user_id uuid PRIMARY KEY REFERENCES auth.users(id));
ALTER TABLE public.portal_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.portal_admins TO authenticated;
CREATE POLICY educart_portal_admins_self_read ON public.portal_admins FOR SELECT TO authenticated
 USING (user_id=(SELECT auth.uid()));
CREATE TABLE public.inscricoes_oficina(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),data_nascimento date NOT NULL,status text DEFAULT 'pendente_confirmacao');
ALTER TABLE public.inscricoes_oficina ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.inscricoes_oficina TO anon,authenticated;
GRANT SELECT,UPDATE ON public.inscricoes_oficina TO authenticated;
CREATE POLICY "Permitir envio publico de fichas de inscricao"
 ON public.inscricoes_oficina FOR INSERT TO anon,authenticated
 WITH CHECK (data_nascimento <= (((now() AT TIME ZONE 'America/Bahia')::date - '14 years'::interval)::date));
CREATE POLICY educart_admin_read_inscricoes ON public.inscricoes_oficina FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())));
CREATE POLICY educart_admin_update_inscricoes ON public.inscricoes_oficina FOR UPDATE TO authenticated
 USING(EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())))
 WITH CHECK(EXISTS(SELECT 1 FROM public.portal_admins a WHERE a.user_id=(SELECT auth.uid())));
CREATE TABLE public.perfis_administrativos_oficina(inscricao_id uuid PRIMARY KEY REFERENCES public.inscricoes_oficina(id));
INSERT INTO auth.users VALUES('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
INSERT INTO public.portal_admins VALUES('11111111-1111-4111-8111-111111111111');
INSERT INTO public.inscricoes_oficina(data_nascimento) VALUES('2000-01-01');
BOOT
if cat "$SOURCE" | docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 >"$TMP/no-gate.log" 2>&1;then
 echo "::error::Sem portao nao pode passar";exit 1
fi
grep -Fq 'TC18: autorizacao e restauracao' "$TMP/no-gate.log"
test "$(docker exec "$NAME" psql -U postgres -XAtq -c "SELECT to_regclass('public.equipe_papeis') IS NULL")" = t
echo "TC18 PORTAO NEGATIVO PASS."
# Mesmo com flags sinteticamente habilitadas, nenhum papel entra sem UID
# nominal previamente identificado como administrador Auth do legado.
{
 printf "SET educart.tc18_aprovacao='DIRECAO_LIBEROU_FASE_MINIMA';\n"
 printf "SET educart.tc18_restore='RESTAURACAO_TESTADA';\n"
 cat "$SOURCE"
} | docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 >"$TMP/no-uid.log" 2>&1 && {
 echo "::error::Migracao aceitou execucao sem UID nominal"; exit 1;
}
grep -Fq 'TC18: coordenador UID aprovado ausente' "$TMP/no-uid.log"
echo "TC18 UID NOMINAL OBRIGATORIO PASS."
# Rejeitar tambem identidade Auth existente sem vinculo de portal_admins.
{
 printf "SET educart.tc18_aprovacao='DIRECAO_LIBEROU_FASE_MINIMA';\n"
 printf "SET educart.tc18_restore='RESTAURACAO_TESTADA';\n"
 printf "SET educart.tc18_coordenador_uid='22222222-2222-4222-8222-222222222222';\n"
 cat "$SOURCE"
} | docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 >"$TMP/uid-externo.log" 2>&1 && {
 echo "::error::Migracao aceitou UID fora da administracao"; exit 1;
}
grep -Fq 'TC18: coordenador nao e admin Auth existente' "$TMP/uid-externo.log"
echo "TC18 UID EXTERNO NEGADO PASS."
{
 printf "SET educart.tc18_aprovacao='DIRECAO_LIBEROU_FASE_MINIMA';\n"
 printf "SET educart.tc18_restore='RESTAURACAO_TESTADA';\n"
 printf "SET educart.tc18_coordenador_uid='11111111-1111-4111-8111-111111111111';\n"
 cat "$SOURCE"
} | docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 >"$TMP/rollback.log" 2>&1 || {
 cat "$TMP/rollback.log";exit 1;
}
test "$(docker exec "$NAME" psql -U postgres -XAtq -c "SELECT to_regclass('public.equipe_papeis') IS NULL")" = t
echo "TC18 SQL ROLLBACK PASS."
node - "$SOURCE" <<'NODE' >"$TMP/positive.sql"
const fs=require('node:fs'),assert=require('node:assert/strict');
const s=fs.readFileSync(process.argv[2],'utf8');
assert.match(s,/\nROLLBACK;\s*$/);
process.stdout.write("SET educart.tc18_aprovacao='DIRECAO_LIBEROU_FASE_MINIMA';\nSET educart.tc18_restore='RESTAURACAO_TESTADA';\nSET educart.tc18_coordenador_uid='11111111-1111-4111-8111-111111111111';\n"+s.replace(/\nROLLBACK;\s*$/,'\nCOMMIT;\n'));
NODE
docker exec -i "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 <"$TMP/positive.sql" >"$TMP/positive.log" 2>&1 || {
 echo "::error::Copia efemera SQL nao passou";tail -n 40 "$TMP/positive.log";exit 1;
}
test "$(docker exec "$NAME" psql -U postgres -XAtq -c 'SELECT count(*) FROM public.equipe_papeis')" = 1
test "$(docker exec "$NAME" psql -U postgres -XAtq -c 'SELECT count(*) FROM public.inscricoes_oficina')" = 1
echo "TC18 LEGADO PRESERVADO PASS."
if docker exec "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 -c \
 "SET ROLE anon; INSERT INTO public.inscricoes_oficina(data_nascimento,status) VALUES('2000-01-01','matriculado');" >"$TMP/anon.log" 2>&1;then
 echo "::error::Anon conseguiu status matriculado";exit 1
fi
grep -Fq 'row-level security policy' "$TMP/anon.log"
docker exec "$NAME" psql -U postgres -Xq -v ON_ERROR_STOP=1 -c \
 "BEGIN;SET ROLE anon; INSERT INTO public.inscricoes_oficina(data_nascimento) VALUES('2000-01-01');ROLLBACK;" >/dev/null
NO_ROLE="$(docker exec "$NAME" psql -U postgres -XAtq -v ON_ERROR_STOP=1 -c "
BEGIN;
DELETE FROM public.equipe_papeis WHERE papel='coordenacao';
SET ROLE authenticated;SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
WITH ch AS(UPDATE public.inscricoes_oficina SET status='confirmado' RETURNING 1) SELECT count(*) FROM ch;
ROLLBACK;")"
test "$NO_ROLE" = 0
OTHER="$(docker exec "$NAME" psql -U postgres -XAtq -v ON_ERROR_STOP=1 -c "
SET ROLE authenticated;SET request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
SELECT count(*) FROM public.inscricoes_oficina;SELECT count(*) FROM public.equipe_papeis;")"
test "$OTHER" = "$(printf '0\n0')"
WITH_ROLE="$(docker exec "$NAME" psql -U postgres -XAtq -v ON_ERROR_STOP=1 -c "
BEGIN;SET ROLE authenticated;SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
WITH ch AS(UPDATE public.inscricoes_oficina SET status='confirmado' RETURNING 1) SELECT count(*) FROM ch;ROLLBACK;")"
test "$WITH_ROLE" = 1
test "$(docker exec "$NAME" psql -U postgres -XAtq -c "SELECT count(*) FROM public.inscricoes_oficina WHERE status='pendente_confirmacao'")" = 1
echo "TC18 RLS PASS: anon nao matricula, pendente permitido; sem papel 0, coordenacao 1, externo 0; provisionamento atomico."
echo "TC18 PASS: PostgreSQL descartavel, PROD e DEV intocados."
