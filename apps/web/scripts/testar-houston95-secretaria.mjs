import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const ler = (path) => readFileSync(path, 'utf8');
const pagina = ler('src/app/admin/page.tsx');
const sidebar = ler('src/components/AdminHouston95Navegacao.tsx');
const visao = ler('src/components/AdminHouston95VisaoDev.tsx');
const css = ler('src/app/admin/houston95.css');
const layout = ler('src/app/admin/layout.tsx');

for (const destino of ['visao','inscricoes','estudantes','turmas','docentes','agenda','frequencia','financeiro']) {
  assert(sidebar.includes("id: '"+destino+"'"), 'Destino Houston ausente: '+destino);
}
for (const grupo of ['Painel','Pessoas','Formações','Administração']) {
  assert(sidebar.includes("grupo: '"+grupo+"'"), 'Grupo Houston ausente: '+grupo);
}
assert(sidebar.includes('secretaria'), 'Não perder a entrada da Secretaria existente');
assert(sidebar.includes('habilitarFinanceiro') && sidebar.includes('habilitarGestaoInscricoes'), 'Manter bloqueios do DEV');
assert(sidebar.includes('disabled={indisponivel}'), 'Itens indisponíveis não devem abrir');
assert(pagina.includes('AdminHouston95Navegacao'));
assert(pagina.includes('AdminHouston95VisaoDev'));
assert(pagina.includes('navegar={solicitarDestino}'), 'Navegação deve usar guarda de rascunhos existente');
assert(pagina.includes('if(pendente){setDestinoSolicitado(destino);return;}'), 'Guardas de alterações não salvas preservadas');
assert(pagina.includes('ACOES_ACADEMICAS_EXCLUSIVAS_DEV'), 'Gate DEV preservado');
assert(pagina.includes('AdminRotinaAcademicaLab') && pagina.includes('AdminFinanceiroDev'), 'Módulos existentes preservados');
assert(!pagina.includes('GRUPOS.map'), 'Menu antigo não deve concorrer com Houston');
assert(visao.includes("count: 'exact'") && visao.includes('head: true'), 'Contagens precisam vir do banco e sem puxar fichas');
assert(visao.includes("error ? null : count"), 'Não substituir falha de consulta por zero');
assert(!/\.insert\(|\.update\(|\.delete\(|\.rpc\(/.test(visao), 'Visão Houston não deve alterar dados');
assert(layout.includes("import './houston95.css'"), 'Tema não carregado');
assert(css.includes('.houston95-dashboard') && css.includes('@media(max-width:690px)'), 'Tema e adaptação mobile ausentes');
console.log('PASS: Houston V9.5, 8 destinos, visão consultiva, permissões e navegação protegida.');
