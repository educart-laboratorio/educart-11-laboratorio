import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calcularIdade, idadeMinimaAtendida, FAIXA_ATE_13 } from '../src/lib/idade-formacao.ts';
import ts from 'typescript';
const converter = (source) => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const dataUri = (source) => 'data:text/javascript;base64,' + Buffer.from(converter(source)).toString('base64');
const idadeUrl = dataUri(fs.readFileSync('src/lib/idade-formacao.ts', 'utf8'));
const campanhasUrl = dataUri(fs.readFileSync('src/lib/campanhas.ts', 'utf8'));
const codigo = fs.readFileSync('src/lib/inscricao-validation.ts', 'utf8')
  .replace("from './idade-formacao'", "from '" + idadeUrl + "'")
  .replace("from './campanhas'", "from '" + campanhasUrl + "'");
const { validateStep } = await import(dataUri(codigo));
const hoje='2026-11-02';
for(const birth of ['2013-01-01','2012-11-03','2013-11-02']) {
  assert.equal(idadeMinimaAtendida(birth,hoje),false,birth);
}
for(const birth of ['2012-11-02','2012-11-01','2008-10-11']) {
  assert.equal(idadeMinimaAtendida(birth,hoje),true,birth);
}
assert.equal(calcularIdade('2012-11-02',hoje),14);
assert.equal(calcularIdade('2012-11-03',hoje),13);
assert.equal(calcularIdade('2027-01-01',hoje),-1);
assert.equal(calcularIdade('2012-02-30',hoje),null);
const modelo = {
  objetivo:'Ser Ator/Atriz profissional', objetivoOutro:'',dataNascimento:'',nomeCompleto:'Pessoa de Teste',
  endereco:'Bairro',cidadeEstado:'Salvador/BA',cidadeEstadoOutro:'',telefone:'71988887777',
  email:'teste@example.org',experienciaPrevia:'Não',quaisExperiencias:'',comoConheceu:'Instagram',comoConheceuOutro:''
};
const agora = new Date();
const local = new Intl.DateTimeFormat('en-US',{timeZone:'America/Bahia',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(agora);
const partes = Object.fromEntries(local.map(o=>[o.type,o.value]));
const diaApos14 = new Date(Date.UTC(Number(partes.year)-14,Number(partes.month)-1,Number(partes.day)+1));
const birth13 = diaApos14.toISOString().slice(0,10);
const birth14 = String(Number(partes.year)-14).padStart(4,'0')+'-'+partes.month+'-'+partes.day;
assert.equal(validateStep(2,{...modelo,dataNascimento:birth13}).valid,false,'13-year-old blocked before next step');
assert.equal(validateStep(3,{...modelo,dataNascimento:birth13}).valid,false,'13-year-old blocked before submission');
assert.equal(validateStep(2,{...modelo,dataNascimento:birth14}).valid,true,'14-year-old can proceed');
assert.equal(FAIXA_ATE_13,'Até 13 anos');
const entrada = fs.readFileSync('src/components/EntradaEducart.tsx','utf8');
const vitrine = fs.readFileSync('src/app/formacao/page.tsx','utf8');
const inscricao = fs.readFileSync('src/components/InscricaoElegibilidade.tsx','utf8');
assert(entrada.includes("x === FAIXA_ATE_13 ? 'idade-indisponivel'"),'guided flow blocks minors');
assert(vitrine.includes('faixaSelecionada === FAIXA_ATE_13'),'deep-linked catalog blocks minors');
assert(inscricao.includes('faixa === FAIXA_ATE_13'),'deep-linked signup blocks minors');
console.log('OK: age >=14 permitted, age <=13 blocked in guided path, catalog, form, and final submit.');
