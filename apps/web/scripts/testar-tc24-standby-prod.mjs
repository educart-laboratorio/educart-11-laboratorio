import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {classificarRotaOficial11,HOST_PROD_READY} from '../src/lib/security/preview-native-policy.ts';
import {destinoPublicoInscricaoSeguro} from '../src/lib/security/destino-inscricao-publica.ts';
const prod='https://doygnsubiitencoyzjzk.supabase.co';
const dev='https://esjrjzyvyhtzwgihcbsc.supabase.co';
for(const route of ['/','/formacao','/inscricao','/admin/login']){
 assert.equal(classificarRotaOficial11(HOST_PROD_READY,route,HOST_PROD_READY,'GET','required'),'publico');
}
for(const route of ['/admin','/admin/financeiro','/api/admin/exportar']){
 assert.equal(classificarRotaOficial11(HOST_PROD_READY,route,HOST_PROD_READY,'GET','required'),'avaliar');
 assert.equal(classificarRotaOficial11(HOST_PROD_READY,route,HOST_PROD_READY,'GET',undefined),'negado');
 assert.equal(classificarRotaOficial11(HOST_PROD_READY,route,'attacker.example','GET','required'),'negado');
}
assert.equal(destinoPublicoInscricaoSeguro(HOST_PROD_READY,dev),false);
assert.equal(destinoPublicoInscricaoSeguro(HOST_PROD_READY,prod),false,'Standby nao coleta nem com banco PROD');
assert.equal(destinoPublicoInscricaoSeguro(HOST_PROD_READY,prod,'approved'),false,'Standby nao coleta nem com flag');
const p=readFileSync('src/proxy.ts','utf8');
assert(p.includes('const avisoStandby = standby && rotaInscricao'));
assert(p.includes("request.method !== 'GET' && request.method !== 'HEAD'"));
assert(p.includes("NextResponse.json({erro:'Inscricoes indisponiveis na homologacao'}, {status:405})"));
assert(p.includes("NextResponse.rewrite(new URL('/inscricao-indisponivel', request.url))"));
const s=readFileSync('scripts/preparar-worker-oficial-prod-triple-core.mjs','utf8');
assert(s.includes("args[0]!=='--dry-run'"));
assert(s.includes("name:target,account_id:account"));
assert(s.includes("const target='educart-11-prod-ready'"));
assert(s.includes("'--dry-run'"));
assert(!s.includes("'--routes'"));
assert(s.includes("for(const forbidden of ['routes','route','custom_domains','zone_id','triggers'])"));
const env={...process.env,
 NEXT_PUBLIC_SUPABASE_URL:prod,
 NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_publishable_test_synthetic_tc24',
 EDUCART_OFFICIAL_11_MODE:'required',
 EDUCART_PRIVATE_PREVIEW_MODE:'off',
 NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'off',
};
function deny(name,extra,pattern,argv=[]){
 const r=spawnSync(process.execPath,['scripts/preparar-worker-oficial-prod-triple-core.mjs',...argv],
 {cwd:process.cwd(),env:{...env,...extra},encoding:'utf8',timeout:8000});
 assert.notEqual(r.status,0,name+' deve negar');
 assert(((r.stderr||'')+(r.stdout||'')).includes(pattern),name+' deve falhar por contrato previsto');
 console.log('TC24 NEGATIVE PASS '+name);
}
deny('sem --dry-run',{},'somente --dry-run');
deny('banco DEV',{NEXT_PUBLIC_SUPABASE_URL:dev},'URL Supabase nao PROD',['--dry-run']);
deny('chave service role',{NEXT_PUBLIC_SUPABASE_ANON_KEY:'sb_secret_fake_tc24'},'chave publishable',['--dry-run']);
deny('sem modo oficial',{EDUCART_OFFICIAL_11_MODE:'off'},'portaria oficial',['--dry-run']);
deny('portaria DEV herdada',{EDUCART_PRIVATE_PREVIEW_MODE:'required'},'portaria DEV',['--dry-run']);
deny('captacao ligada no standby',{NEXT_PUBLIC_EDUCART_INSCRICOES_ATIVAS:'approved'},'captacao deve estar desabilitada',['--dry-run']);
console.log('TC24 PREPARACAO PASS: allowlist, 6 negativas, standby sem coleta, 0 deploy.');
