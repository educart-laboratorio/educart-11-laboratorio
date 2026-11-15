import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migracao=readFileSync('../../supabase/security-review/EDUCART_12_DEV_BLINDAGEM_RPC_PIX_LEGADO_20261105.sql','utf8');
const financeiro=readFileSync('src/components/AdminFinanceiroDev.tsx','utf8');
const legado=readFileSync('../../supabase/security-review/EDUCART_11_DEV_PIX_CONFERENCIA_MANUAL_20261104.sql','utf8');
for(const esperado of [
 /ALTER FUNCTION public\.educart_conferir_pix_dev\(uuid,text,boolean\)\s+SET SCHEMA educart_interno_dev/,
 /CREATE FUNCTION public\.educart_conferir_pix_dev\(/,
 /LANGUAGE sql SECURITY INVOKER/,
 /educart_interno_dev\.educart_conferir_pix_dev/,
 /REVOKE ALL ON FUNCTION public\.educart_conferir_pix_dev\(uuid,text,boolean\)/,
 /GRANT EXECUTE ON FUNCTION public\.educart_conferir_pix_dev\(uuid,text,boolean\)/,
 /TO authenticated,service_role/,
 /BEGIN;[\s\S]*COMMIT;/,
])assert.match(migracao,esperado,'Migration Pix protegido');
assert.doesNotMatch(migracao,/DROP FUNCTION|DROP TABLE|UPDATE public\.educart_pix_manuais|ALTER TABLE public\.matriculas/i);
assert.doesNotMatch(financeiro,/educart_conferir_pix_dev/);
assert.match(financeiro,/AdminFinanceiroEssencialR11Dev/);
assert.match(legado,/educart_conferir_pix_dev/);
console.log('OK: Pix legado mantém API, internals protegidos e direitos originais; migração aditiva DEV.');
