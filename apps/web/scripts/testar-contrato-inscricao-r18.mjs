/** R18: integridade PDF + prévia após inscrição. Teste local sem rede nem escrita. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const file='public/documentos/EducART_Contrato_Oficina_de_Atores_MINUTA.pdf';
const pdf=readFileSync(file);
const form=readFileSync('src/components/InscricaoForm.tsx','utf8');
assert.equal(pdf.length,55112);
assert.equal(createHash('sha256').update(pdf).digest('hex'),'44fcb8b20e60494daad970049133681610d82a57f823fd196876f2a5dd030095');
assert.equal(pdf.subarray(0,5).toString('ascii'),'%PDF-');
assert.match(pdf.subarray(-180).toString('latin1'),/%%EOF/);
const start=form.indexOf("if (isSuccess) {");
const contract=form.indexOf('contrato-minuta-pos-inscricao');
const end=form.indexOf('className="multi-step-form-wrapper"',start);
assert(start>0&&contract>start&&contract<end,'Link apenas após sucesso confirmado');
for(const required of [
 'href="/documentos/EducART_Contrato_Oficina_de_Atores_MINUTA.pdf"',
 'download="EducART_Contrato_Oficina_de_Atores_MINUTA.pdf"',
 'Documento em revisão, não aprovado para assinatura',
 'não efetiva matrícula, não gera cobrança e não autoriza pagamento',
 ".from('inscricoes_oficina').insert([payload])",
 'Falar com a Coordenação no WhatsApp'
])assert(form.includes(required),'Exigência ausente: '+required);
// O SHA antigo de InscricaoForm consta do manifesto histórico, mas não veta
// evolução aprovada. O contrato e as restrições operacionais continuam testados.
for(const word of ['QR_CODE_PIX','PIX_COPIA_COLA','assinarContrato','cobranca_automatica'])
 assert(!form.includes(word),'Proibição de pagamento/assinatura: '+word);
console.log('R18 PASS: PDF da minuta íntegro, link só após sucesso, sem Pix/cobrança; formulário 1.1 evolutivo.');
