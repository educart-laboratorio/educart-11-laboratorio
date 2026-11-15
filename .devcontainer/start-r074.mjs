/**
 * R07.4: start automatico, seguro e SOMENTE dentro de GitHub Codespaces.
 * Nenhum token, cookie ou chave e impresso. Nao faz deploy nem cria tunel.
 */
import { existsSync, openSync, closeSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as esperar } from 'node:timers/promises';

const repo='educartsuporte-netizen/educart-portal';
const branchesPermitidas=new Set([
  'autodev-laboratorio-editavel-2026-11-03',
  'autodev-educart-11-consolidacao-interna-2026-11-05',
  'autodev-educart-11-formacao-turma-guiada-2026-11-05',
  'autodev-r07-estudantes-codespaces-private-20261106',
]);
const dev='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const workspace=resolve(process.cwd());
const app=resolve(workspace,'apps/web');
const keyValid=k=>typeof k==='string' && /^sb_publishable_[A-Za-z0-9_-]{15,}$/.test(k);
function bloquear(motivo) {
  console.error('R07.4 BLOQUEIO:',motivo);
  process.exitCode=1;
}
if (process.env.CODESPACES!=='true' || !process.env.CODESPACE_NAME ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(process.env.CODESPACE_NAME) ||
    !/^(?:[a-z0-9-]+\.)*github\.dev$/.test(process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN||'')) {
  bloquear('somente GitHub Codespaces autenticado; ambiente de homologacao nao identificado.');
} else if (process.env.NEXT_PUBLIC_SUPABASE_URL!==dev) {
  bloquear('somente Supabase DEV permitido.');
} else {
  // GITHUB_REPOSITORY e tipico de Actions, mas nao e garantido em Codespaces.
  // Verificar a identidade pelo remote Git real; rejeitar espelhos e hosts externos.
  // Nunca imprimir a URL do remote, pois poderia conter credenciais.
  const remote=spawnSync('git',['remote','get-url','origin'],{
    cwd:workspace,encoding:'utf8',timeout:5000,
  });
  const origin=remote.status===0 ? remote.stdout.trim() : '';
  const origensPermitidas=[
    'https://github.com/'+repo,
    'https://github.com/'+repo+'.git',
    'git@github.com:'+repo,
    'git@github.com:'+repo+'.git',
    'ssh://git@github.com/'+repo,
    'ssh://git@github.com/'+repo+'.git',
  ];
  if (!origensPermitidas.includes(origin) ||
      (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY!==repo)) {
    bloquear('repositorio esperado nao corresponde ao remote Git verificado.');
  } else if (!existsSync(resolve(app,'node_modules/next/dist/bin/next'))) {
    bloquear('dependencias ausentes; postCreateCommand deve executar npm ci antes.');
  } else {
  const git=spawnSync('git',['branch','--show-current'],{cwd:workspace,encoding:'utf8'});
  if (git.status!==0 || !branchesPermitidas.has(git.stdout.trim())) {
    bloquear('branch de laboratorio obrigatoria; nenhuma aplicacao foi iniciada.');
  } else {
    let key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    // Recuperar apenas uma variavel PUBLICAVEL que ja existe no proprio GitHub.
    // A leitura pode ser negada por permissoes do token de Codespaces.
    if (!keyValid(key) && process.env.GITHUB_TOKEN) {
      try {
        const response=await fetch(
          'https://api.github.com/repos/'+repo+'/actions/variables/EDUCART_DEV_SUPABASE_PUBLISHABLE_KEY',
          {headers:{
            Authorization:'Bearer '+process.env.GITHUB_TOKEN,
            Accept:'application/vnd.github+json',
            'X-GitHub-Api-Version':'2022-11-28',
          },redirect:'error',signal:AbortSignal.timeout(8000)},
        );
        if (response.ok) {
          const data=await response.json();
          if (data.name==='EDUCART_DEV_SUPABASE_PUBLISHABLE_KEY' &&
              keyValid(data.value)) key=data.value;
        }
      } catch { /* Falha fechada: nao buscar chave em fontes nao verificadas. */ }
    }
    if (!keyValid(key)) {
      bloquear('a chave publicavel DEV nao estava disponivel nas variaveis ou no ambiente Codespaces. Nao iniciar um servidor de login incompleto.');
      console.log('Alternativa: configurar um secret pessoal Codespaces NEXT_PUBLIC_SUPABASE_ANON_KEY (somente chave publica DEV), sem compartilhar por chat.');
    } else {
      // A checagem e feita no loopback do container, sem passar pelo GitHub.
      // Nao imprimir corpo HTTP, cookies ou tokens em logs.
      async function diagnosticarLoginLocal() {
        try {
          const r=await fetch('http://127.0.0.1:3000/admin/login',{
            headers:{Accept:'text/html'},redirect:'manual',
            signal:AbortSignal.timeout(4500),
          });
          const tipo=r.headers.get('content-type')||'';
          const html=r.status===200 && tipo.includes('text/html') ? await r.text() : '';
          return {codigo:r.status,educart:html.includes('ACESSO INSTITUCIONAL')};
        } catch { return {codigo:0,educart:false}; }
      }
      const antes=await diagnosticarLoginLocal();
      if (antes.educart) {
        console.log('R07.4 LOCAL OK: login EducART respondeu HTTP 200 dentro do Codespace.');
        console.log('Se o navegador externo mostrar 401, conferir autenticacao GitHub da porta Private.');
      } else if (antes.codigo!==0) {
        bloquear('porta 3000 ja responde HTTP '+antes.codigo+
          ' sem identificar o login EducART. Nao iniciar segundo servidor.');
      } else {
        const logPath='/tmp/educart-r074-next.log';
        const output=openSync(logPath,'a');
        const env={...process.env,
          NEXT_PUBLIC_SUPABASE_URL:dev,
          NEXT_PUBLIC_SUPABASE_ANON_KEY:key,
          EDUCART_PRIVATE_PREVIEW_MODE:'codespaces-private',
          NEXT_TELEMETRY_DISABLED:'1',
        };
        const child=spawn(process.execPath,[
          resolve(app,'node_modules/next/dist/bin/next'),
          'dev','--hostname','0.0.0.0','--port','3000',
        ],{cwd:app,env,detached:true,stdio:['ignore',output,output]});
        child.unref();closeSync(output);
        let pronto=false, ultimo=0;
        for(let tentativa=0;tentativa<24;tentativa++){
          await esperar(1500);
          const r=await diagnosticarLoginLocal();
          ultimo=r.codigo;
          if(r.educart){pronto=true;break;}
        }
        if(pronto){
          console.log('R07.4 LOCAL OK: login EducART HTTP 200 em loopback. Porta GitHub 3000 deve permanecer Private.');
          console.log('Se o navegador externo retornar 401, reautenticar a porta privada pelo editor Codespaces.');
        } else {
          bloquear('servidor nao comprovou login EducART HTTP 200 em loopback; ultimo HTTP '+
            (ultimo||'sem resposta')+'. Diagnostico local sem credenciais: '+logPath);
        }
      }
    }
  }
  }
}

// ABRACADABRA: aproveita o postStartCommand existente; nunca inicia outro servidor.
if (!process.exitCode && process.env.CODESPACES==='true' &&
    process.env.CODESPACE_NAME==='fuzzy-zebra-vprx9wr67x763x6wx' &&
    process.env.CI!=='true') {
  const log=openSync('/tmp/educart-fuzzy-autosync.log','a');
  try {
    const watcher=spawn(process.execPath,[resolve(workspace,'.devcontainer/auto-sync-fuzzy.mjs')],{
      cwd:workspace,env:process.env,detached:true,stdio:['ignore',log,log],
    });
    watcher.unref();
    console.log('ABRACADABRA: monitor de sincronização solicitado; log /tmp/educart-fuzzy-autosync.log');
  } finally {closeSync(log);}
}
