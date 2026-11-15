import { execSync } from 'node:child_process';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERRO: DATABASE_URL não encontrada no ambiente ou .env.development');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run') ? ' --dry-run' : '';

try {
  execSync(`npx supabase db push --include-all${isDryRun} --db-url "${dbUrl}"`, {
    stdio: 'inherit'
  });
} catch (error) {
  process.exit(error.status || 1);
}
