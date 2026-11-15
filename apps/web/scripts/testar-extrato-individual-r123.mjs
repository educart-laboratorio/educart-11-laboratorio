import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { conferirExtratoR11Individual } from '../src/lib/financeiro/extrato-individual-r11.ts';
import { somarMeses } from '../src/lib/financeiro/progresso-24.ts';
const construir=(id,inicio)=>Array.from({length:24},(_,i)=>{
 const mes=somarMeses(inicio,i);
 return {matricula_id:id,numero:i+1,competencia:mes+'-01',vencimento_em:mes+'-10',
 valor_centavos:32000,situacao:i===0||i===4?'paga':'pendente',
 confirmado_em:i===0||i===4?'2026-11-01T13:00:00Z':null};
});
const a=construir('mat-A','2026-01');
const b=construir('mat-B','2026-04');
const hoje='2026-11-06';
assert.equal(conferirExtratoR11Individual('mat-A',a,hoje)?.pagas,2);
assert.equal(conferirExtratoR11Individual('mat-B',b,hoje)?.pagas,2);
assert.equal(conferirExtratoR11Individual('mat-A',b,hoje),null,'Não misturar matrícula de outra pessoa');
assert.equal(conferirExtratoR11Individual('mat-A',a.slice(1),hoje),null,'23 parcelas não são um histórico completo');
assert.equal(conferirExtratoR11Individual('mat-A',[...a,a[23]],hoje),null,'25 parcelas não são um histórico completo');
assert.equal(conferirExtratoR11Individual('mat-A',[...a.slice(0,2),{...a[2],numero:2},...a.slice(3)],hoje),null,'Número repetido bloqueado');
assert.equal(conferirExtratoR11Individual('mat-A',[...a.slice(0,4),{...a[4],competencia:a[3].competencia},...a.slice(5)],hoje),null,'Competência repetida bloqueada');
assert.equal(conferirExtratoR11Individual('mat-A',[{...a[0],confirmado_em:null},...a.slice(1)],hoje),null,'Quitação sem confirmação não é comprovada');
assert.equal(conferirExtratoR11Individual('mat-A',[{...a[0],vencimento_em:'2026-02-30'},...a.slice(1)],hoje),null,'Data impossível bloqueada');
assert.equal(conferirExtratoR11Individual('mat-A',a, 'data-inválida'),null,'Data de referência inválida bloqueada');
assert.equal(conferirExtratoR11Individual('mat-A',a.slice().reverse(),hoje)?.pagas,2,'Ordem de resposta não altera resultado');
const ui=readFileSync('src/app/minha-educart/page.tsx','utf8');
assert.match(ui,/conferirExtratoR11Individual\(m\.id,linhas,hojeBahia\)/);
assert.match(ui,/planoAtivo\?conferirExtratoR11Individual/);
assert.match(ui,/planosAtivos\.error/);
assert.match(ui,/histórico de 24 parcelas em conferência/);
assert.match(ui,/if\(t\.error\|\|me\.error\|\|r11\.error\|\|planosAtivos\.error\|\|aulasAgendadas\.error\)\s*\{[\s\S]*?return;/);
assert.match(ui,/if\(ch\.error\)\{setErroConsulta[\s\S]*?return;/);
assert.match(ui,/:erroConsulta\?<section className="me-card"/);
assert.match(ui,/Tentar novamente/);
console.log('Q9/Q14 R12.3 PASS: extrato individual completo, sem falsos zeros, com tratamento de consultas parciais.');
