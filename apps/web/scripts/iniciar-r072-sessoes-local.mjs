/**
 * EducART R07.2 — homologação de sessões reais em máquina de titular.
 * Inicia Next.js 16 APENAS em 127.0.0.1; não publica Worker, porta externa,
 * túnel, Cloudflare, DNS nem acesso compartilhado.
 * As credenciais são digitadas no formulário local do Supabase Auth DEV,
 * nunca em logs, GitHub Actions, chats ou arquivos versionados.
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

const dev='https://esjrjzyvyhtzwgihcbsc.supabase.co';
if (existsSync('.env.local') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env.local');
}
if (process.env.NEXT_PUBLIC_SUPABASE_URL !== dev ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_')) {
  console.error('R07.2 BLOQUEIO: configure apenas NEXT_PUBLIC_SUPABASE_URL (DEV) e NEXT_PUBLIC_SUPABASE_ANON_KEY (publishable DEV) em apps/web/.env.local.');
  process.exitCode=1;
} else if (process.argv.includes('--deploy') || process.argv.includes('--host') ||
           process.argv.includes('--hostname') || process.argv.includes('--public')) {
  console.error('R07.2 BLOQUEIO: o programa nao aceita opcoes de publicacao nem rede externa.');
  process.exitCode=1;
} else {
  const env={
    ...process.env,
    EDUCART_PRIVATE_PREVIEW_MODE:'local',
    NODE_ENV:'development',
    NEXT_TELEMETRY_DISABLED:'1',
  };
  const entry=resolve('node_modules/next/dist/bin/next');
  if(!existsSync(entry))throw Error('Dependencias ausentes. Execute npm ci antes da homologacao.');
  console.log('R07.2 — somente localhost. Abra http://localhost:3000/admin/login no mesmo computador.');
  console.log('Entre com a sua conta institucional do Supabase DEV. Não envie senhas, cookies ou tokens.');
  console.log('Feche o terminal com Ctrl+C para encerrar o ambiente isolado.');
  const child=spawn(process.execPath,[entry,'dev','--hostname','127.0.0.1','--port','3000'],{
    env,cwd:process.cwd(),stdio:'inherit',
  });
  const stop=()=>child.kill('SIGTERM');
  process.on('SIGINT',stop);
  process.on('SIGTERM',stop);
  child.once('exit',(code)=>{
    process.removeListener('SIGINT',stop);
    process.removeListener('SIGTERM',stop);
    process.exitCode=code||0;
  });
}
