/**
 * AutoDEV ABRACADABRA — monitor não destrutivo da ÚNICA prévia Fuzzy Zebra.
 * Só faz fast-forward em CI aprovado. NÃO comprova homologação visual.
 */
import {spawnSync} from 'node:child_process';
import {existsSync,openSync,readFileSync,writeFileSync,closeSync,unlinkSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const BRANCH='autodev-r07-estudantes-codespaces-private-20261106';
export const CODESPACE='fuzzy-zebra-vprx9wr67x763x6wx';
const REPO='educartsuporte-netizen/educart-portal';
const DEV='https://esjrjzyvyhtzwgihcbsc.supabase.co';
const WORKFLOW='validar-educart-11-consolidacao-interna.yml';
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const LOCK='/tmp/educart-fuzzy-autosync.pid';

export function ambientePermitido(e){
  return e.CODESPACES==='true' && e.CODESPACE_NAME===CODESPACE &&
    e.NEXT_PUBLIC_SUPABASE_URL===DEV && e.CI!=='true' &&
    (!e.GITHUB_REPOSITORY||e.GITHUB_REPOSITORY===REPO) &&
    /^(?:[a-z0-9-]+\.)*github\.dev$/.test(e.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN||'');
}
export function ciAprovado(runs,sha){
  if(!/^[a-f0-9]{40}$/.test(sha)||!Array.isArray(runs))return false;
  const lista=runs.filter(r=>r.head_sha===sha&&r.event==='push')
    .sort((a,b)=>(b.id||0)-(a.id||0));
  return lista.length>0 && lista[0].status==='completed' &&
    lista[0].conclusion==='success';
}
function git(args,timeout=12000){
  const p=spawnSync('git',args,{cwd:ROOT,encoding:'utf8',timeout,maxBuffer:131072});
  return {ok:p.status===0,out:(p.stdout||'').trim()};
}
const shaOk=s=>/^[0-9a-f]{40}$/.test(s||'');
const origemOk=s=>[
  'https://github.com/'+REPO,'https://github.com/'+REPO+'.git',
  'git@github.com:'+REPO,'git@github.com:'+REPO+'.git',
  'ssh://git@github.com/'+REPO,'ssh://git@github.com/'+REPO+'.git',
].includes(s);
function log(s){console.log('[ABRACADABRA Fuzzy Zebra]',new Date().toISOString(),s);}
async function githubCI(sha){
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN;
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization='Bearer '+token;
  const url='https://api.github.com/repos/'+REPO+'/actions/workflows/'+WORKFLOW+
    '/runs?branch='+encodeURIComponent(BRANCH)+'&head_sha='+sha+'&per_page=10';
  try{
    const r=await fetch(url,{headers,redirect:'error',signal:AbortSignal.timeout(8500)});
    if(!r.ok){log('CI inacessível ('+r.status+'); bloqueado.');return false;}
    return ciAprovado((await r.json()).workflow_runs,sha);
  }catch{log('Não foi possível verificar CI; bloqueado.');return false;}
}
async function verificarLoopback(){
  try{
    const r=await fetch('http://127.0.0.1:3000/admin/login',{
      headers:{Accept:'text/html'},redirect:'manual',signal:AbortSignal.timeout(5000)
    });
    return r.status===200 && (r.headers.get('content-type')||'').includes('text/html');
  }catch{return false;}
}
async function ciclo(){
  if(!ambientePermitido(process.env))return;
  const orig=git(['remote','get-url','origin']);
  const path=git(['rev-parse','--show-toplevel']);
  const b=git(['branch','--show-current']);
  if(!orig.ok||!origemOk(orig.out)||!path.ok||resolve(path.out)!==ROOT||
    !b.ok||b.out!==BRANCH)return log('Identidade, origem ou branch incorreta; bloqueado.');
  if(existsSync(resolve(ROOT,'.git/index.lock')))return log('Git ocupado; aguardando.');
  const h=git(['rev-parse','HEAD']);
  const status=git(['status','--porcelain=v1','--untracked-files=normal']);
  if(!h.ok||!shaOk(h.out)||!status.ok||status.out)
    return log('Alterações locais ou Git inconsistente; nada foi sobrescrito.');
  const lr=git(['ls-remote','--heads','origin','refs/heads/'+BRANCH],18000);
  const m=lr.out.match(/^([a-f0-9]{40})\s+refs\/heads\/([^\s]+)$/);
  if(!lr.ok||!m||m[2]!==BRANCH)return log('Sem referência remota confiável.');
  const sha=m[1];
  if(sha===h.out)return;
  if(!await githubCI(sha))return log('Aguardando CI do novo commit.');
  // Fetch não altera a árvore de trabalho.
  if(!git(['fetch','--no-tags','origin','refs/heads/'+BRANCH],45000).ok)
    return log('Fetch falhou; árvore intacta.');
  const f=git(['rev-parse','FETCH_HEAD']);
  const now=git(['rev-parse','HEAD']);
  const active=git(['branch','--show-current']);
  const clean=git(['status','--porcelain=v1','--untracked-files=normal']);
  const ancestor=git(['merge-base','--is-ancestor',h.out,sha]);
  if(!f.ok||f.out!==sha||!now.ok||now.out!==h.out||
     !active.ok||active.out!==BRANCH||!clean.ok||clean.out||!ancestor.ok)
    return log('Conflito, divergência ou edição concorrente: abortado sem reset.');
  if(!git(['merge','--ff-only',sha],45000).ok)
    return log('Git recusou avanço rápido; nenhuma ação destrutiva.');
  const final=git(['rev-parse','HEAD']);
  if(final.ok&&final.out===sha){
    log('Git sincronizado '+sha.slice(0,12)+'; prévia autenticada AINDA NÃO homologada.');
    log(await verificarLoopback()
      ? 'Servidor Next local HTTP 200; verificação visual ainda necessária.'
      : 'Servidor Next local não comprovado; não iniciar outro automaticamente.');
  }
}
function lock(){
  function criar(){
    const fd=openSync(LOCK,'wx',0o600);writeFileSync(fd,String(process.pid));closeSync(fd);
  }
  try{criar();return true;}
  catch(e){
    if(e.code!=='EEXIST')throw e;
    try{
      const pid=Number(readFileSync(LOCK,'utf8'));
      if(Number.isInteger(pid)&&pid>1){
        try{process.kill(pid,0);return false;}catch(err){if(err.code!=='ESRCH')return false;}
      }
      unlinkSync(LOCK);criar();return true;
    }catch{return false;}
  }
}
async function main(){
  if(!ambientePermitido(process.env))return log('Monitor bloqueado fora da Fuzzy Zebra.');
  if(!lock())return log('Já existe monitor ativo ou lock em uso.');
  process.on('exit',()=>{try{
    if(Number(readFileSync(LOCK,'utf8'))===process.pid)unlinkSync(LOCK);
  }catch{}});
  let ocupado=false;
  async function tick(){
    if(ocupado)return;
    ocupado=true;try{await ciclo();}catch{log('Erro de monitoramento; sem reset ou deploy.');}
    finally{ocupado=false;}
  }
  log('Ativo: conferir branch e CI a cada 3 minutos enquanto Codespaces estiver ligado.');
  await tick();setInterval(tick,180000);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await main();
