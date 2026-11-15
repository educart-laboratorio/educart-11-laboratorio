/** ABRACADABRA R17: testes sem rede, sem banco, sem deploy. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BRANCH,CODESPACE,ambientePermitido,ciAprovado} from '../../../.devcontainer/auto-sync-fuzzy.mjs';
const e={CODESPACES:'true',CODESPACE_NAME:CODESPACE,CI:'false',
  NEXT_PUBLIC_SUPABASE_URL:'https://esjrjzyvyhtzwgihcbsc.supabase.co',
  GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:'app.github.dev'};
assert(ambientePermitido(e));
for(const bad of [{CODESPACE_NAME:'organic-palm-tree'},{CI:'true'},{CODESPACES:'false'},
  {NEXT_PUBLIC_SUPABASE_URL:'https://wrong.supabase.co'},
  {GITHUB_REPOSITORY:'outro/repo'}])
  assert(!ambientePermitido({...e,...bad}));
assert.equal(BRANCH,'autodev-r07-estudantes-codespaces-private-20261106');
const sha='a'.repeat(40),other='b'.repeat(40);
const r=(id,head_sha,conclusion,status='completed',event='push')=>
  ({id,head_sha,conclusion,status,event});
assert(ciAprovado([r(1,sha,'success')],sha));
for(const rs of [[],[r(1,other,'success')],[r(1,sha,'failure')],
  [r(1,sha,'success','completed','pull_request')],
  [r(1,sha,'success'),r(2,sha,null,'in_progress')]])
  assert(!ciAprovado(rs,sha));
const script=readFileSync('../../.devcontainer/auto-sync-fuzzy.mjs','utf8');
const start=readFileSync('../../.devcontainer/start-r074.mjs','utf8');
const dev=JSON.parse(readFileSync('../../.devcontainer/devcontainer.json','utf8'));
assert.equal(dev.postStartCommand,'node .devcontainer/start-r074.mjs');
assert(start.includes("'.devcontainer/auto-sync-fuzzy.mjs'"));
for(const part of ["'merge','--ff-only'","'merge-base','--is-ancestor'",
 "'status','--porcelain=v1'","await githubCI(sha)","setInterval(tick,180000)"])
  assert(script.includes(part),'Proteção ausente: '+part);
assert(!script.includes('reset --hard')&&!script.includes('force-push'));
console.log('ABRACADABRA R17 PASS: CI SHA, Fuzzy Zebra, DEV, árvore limpa, fast-forward; sem deploy.');
