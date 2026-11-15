import assert from 'node:assert/strict';
import { prepararEmailBoasVindasMinhaEducart } from '../src/lib/email-minha-educart.ts';

const url='https://educart.pro/minha-educart/ativar?convite=11111111-1111-4111-8111-111111111111';
const dados={nomeCompleto:'<script>alert("x")</script> Maria & Silva',
  nomeTurma:'Teatro & Cinema <Inicial>',acessoUrl:url,jaPossuiConta:false};
const mensagem=prepararEmailBoasVindasMinhaEducart(dados);
assert.match(mensagem.assunto,/matrícula foi confirmada/);
assert.match(mensagem.preCabecalho,/turma está confirmada/);
assert.match(mensagem.texto,/ATIVAR MINHA EDUCART/);
assert.match(mensagem.texto,/eventos selecionados/);
assert.match(mensagem.texto,/não estão disponíveis nem garantidos/);
assert.match(mensagem.html,/lang="pt-BR"/);
assert.match(mensagem.html,/NÚCLEO DE FORMAÇÃO DE ATORES/);
assert.match(mensagem.html,/background:#081c46/);
assert.match(mensagem.html,/MATRÍCULA CONFIRMADA/);
assert.match(mensagem.html,/Teatro &amp; Cinema &lt;Inicial&gt;/);
assert.doesNotMatch(mensagem.html,/<script>alert/);
assert.match(mensagem.html,/&lt;script&gt;alert/);
assert.match(mensagem.html,/<a href="https:\/\/educart\.pro\/minha-educart\/ativar\?convite=/);

const conta=prepararEmailBoasVindasMinhaEducart({
  nomeCompleto:'Ana Souza',
  nomeTurma:'Formação de Atores',
  acessoUrl:'https://educart.pro/minha-educart',
  jaPossuiConta:true,
});
assert.match(conta.texto,/ACESSAR MINHA EDUCART/);
assert.match(conta.texto,/Sua conta continua a mesma/);
assert.doesNotMatch(conta.texto,/ATIVAR MINHA EDUCART/);
for(const invalido of [
  'http://educart.pro/minha-educart',
  'https://evil.example/minha-educart',
  'https://educart.pro@evil.example/minha-educart',
  'javascript:alert(1)',
  'https://educart.pro/minha-educart/ativar?convite=abc',
  'https://educart.pro/minha-educart/ativar#x',
]){
  assert.throws(()=>prepararEmailBoasVindasMinhaEducart({...dados,acessoUrl:invalido}),
    'URL insegura deveria ser rejeitada: '+invalido);
}
assert.throws(()=>prepararEmailBoasVindasMinhaEducart({...dados,nomeTurma:''}));
console.log('OK: email transacional HTML e texto puro, identidade 1.0, convite seguro e benefícios sem promessas.');
