/** R34 — nenhuma cópia real sem segredos, autorização e restauração isolada.
 * Este teste não abre PROD nem contém dados reais.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const wf=readFileSync('../../.github/workflows/educart-r34-backup-real-prod.yml','utf8');
for(const s of [
 'autodev-r07-estudantes-codespaces-private-20261106',
 "github.event.head_commit.message == 'backup(r34): executar backup real controlado'",
 'secrets.EDUCART_PROD_BACKUP_DB_URL',
 'secrets.EDUCART_PROD_BACKUP_PASSPHRASE',
 'version: 3.1.0',
 'quote(password, safe="")',
 're.fullmatch(',
 'envfile.write("PROD_DB_URL=" + raw +',
 'u.username == "postgres.doygnsubiitencoyzjzk"',
 'u.hostname.endswith(".pooler.supabase.com")',
 'Inventario somente leitura do PROD antes do dump',
 'test "$n_storage" -eq 0',
 "grep -Eq '^COPY[[:space:]]+auth[.]users[[:space:]]'",
 'FROM auth.identities',
 'FROM storage.buckets',
 'FROM storage.objects',
 'auth_restored=',
 'doygnsubiitencoyzjzk',
 'supabase db dump --db-url="$PROD_DB_URL" --role-only',
 'supabase db dump --db-url="$PROD_DB_URL" -f "$out/schema.sql"',
 'supabase db dump --db-url="$PROD_DB_URL" --data-only',
 '(cd "$restauracao" && supabase start)',
 'psql --single-transaction --variable ON_ERROR_STOP=1',
 'original=$(psql "$PROD_DB_URL" -Atq',
 'test "$original" = "$restaurado"',
 'test "$rls" = 3',
 'openssl enc -aes-256-cbc',
 'cmp -s "$out/arquivo-aberto.tar.gz" "$out/verificado.tar.gz"',
 'actions/upload-artifact@v4',
 'retention-days: 7',
 'if-no-files-found: error',
 'rm -rf "$RUNNER_TEMP/educart-rg34"'
]) assert(wf.includes(s),'Portao RG34 ausente: '+s);
assert(!wf.includes('supabase db dump --remote='),'R34 exige a flag --db-url para string de conexao');
assert(!/educart-production|wrangler|deploy-worker|apply_migration|git push|git commit/i.test(wf),
 'RG34 nunca pode tocar Cloudflare PROD nem alterar banco/commitar dados');
assert(wf.includes('permissions:\n  contents: read'),'RG34 so pode ler repositorio');
assert(wf.indexOf('Restauracao independente')<wf.indexOf('Guardar SOMENTE'),
 'Artefato so pode ser liberado depois de restauracao de teste');
console.log('R34 PASS: backup real preparado com segredos privados, restore isolado, RLS, cifragem, sem deploy.');
