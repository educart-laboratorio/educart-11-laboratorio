import assert from 'node:assert/strict';
import {gerarPlano,REQUIRED} from './planejar-rotas-oficiais-triple-core.mjs';
const fixtures=REQUIRED.map((pattern,i)=>({id:'route-fixture-'+i,pattern,script:'educart-11-candidate'}));
const p=gerarPlano(fixtures,'zone-fixture-tc25');
assert.equal(p.routeCount,4);
assert.equal(p.writes,0);
assert.equal(p.authorizedToPublish,false);
assert.equal(p.target,'educart-11-prod-ready');
assert.deepEqual(p.rollbackPlan.map(x=>x.restore),Array(4).fill('educart-11-candidate'));
const bad=[
 [fixtures.slice(1),'ausente'],
 [[...fixtures,{id:'dupe',pattern:REQUIRED[0],script:'educart-11-candidate'}],'duplicada'],
 [fixtures.map((x,i)=>i?x:{...x,script:'educart-production'}),'origem'],
 [[...fixtures,{id:'extra',pattern:'educart.pro/admin/*',script:'outro-worker'}],'outras rotas'],
 [fixtures.map((x,i)=>i?x:{...x,id:''}),'identificador'],
];
for(const [v,reason] of bad)assert.throws(()=>gerarPlano(v,'zone-fixture-tc25'),new RegExp(reason));
console.log('TC25 PASS: quatro rotas exatas, snapshot, rollback e cinco bloqueios de conflito; zero Cloudflare writes.');
