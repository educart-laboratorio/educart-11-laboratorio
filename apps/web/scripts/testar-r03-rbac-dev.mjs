/**
 * EducART R03 — testes de fail-closed e do Painel Administrativo.
 * Complementa o teste RLS real executado no database-dev em BEGIN/ROLLBACK,
 * sem conexão com a produção ou uso de contas reais.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { obterPapeisGestao } from '../src/lib/admin/autorizar-gestao.ts';

const file=p=>readFileSync(p,'utf8');
const owner='01234567-89ab-4cde-8f01-234567890abc';
let calls=[];
function fake({admin=true,roles=[],rolesError=null,throwRoles=false,roleSourceError=false}={}){
  calls=[];
  return {
    from(table){
      calls.push(['from',table]);
      assert(['portal_admins','equipe_papeis'].includes(table),'Tabela inesperada '+table);
      return {
        select(fields){
          calls.push(['select',table,fields]);
          return {
            eq(column,id){
              calls.push(['eq',table,column,id]);
              assert.equal(column,'user_id');
              if(table==='portal_admins'){
                return {async maybeSingle(){return {data:admin?{user_id:owner}:null,error:null}}};
              }
              return Promise.resolve(throwRoles?Promise.reject(new Error('rede falhou')):{
                data:roleSourceError?null:roles.map(papel=>({papel})),error:rolesError
              });
            }
          };
        }
      };
    }
  };
}
const scenarios=[
  ['sem membership',{admin:false,roles:['coordenacao']},[]],
  ['Secretaria',{roles:['secretaria']},['secretaria']],
  ['Coordenação',{roles:['coordenacao']},['coordenacao']],
  ['ambos',{roles:['secretaria','coordenacao']},['secretaria','coordenacao']],
  ['duplicidade',{roles:['secretaria','secretaria']},['secretaria']],
  ['papel forjado',{roles:['superadmin']},[]],
  ['erro no SELECT RLS',{rolesError:{code:'42501'},roles:['coordenacao']},[]],
  ['resposta inválida',{roleSourceError:true},[]],
  ['falha de rede',{throwRoles:true},[]],
];
for(const [name,params,expected] of scenarios){
  const result=await obterPapeisGestao(fake(params),owner);
  assert.deepEqual(result,expected,name);
  assert(calls.some(c=>c[1]==='portal_admins'));
  if(name==='sem membership')assert(!calls.some(c=>c[1]==='equipe_papeis'),'Nunca buscar roles sem membership');
  console.log('R03 RBAC:',name,result.length?'→ '+result.join(','):'→ negado');
}
const bad=await obterPapeisGestao(fake({roles:['coordenacao']}),'');
assert.deepEqual(bad,[]);
assert.equal(calls.length,0);

const login=file('src/app/admin/login/page.tsx');
const dashboard=file('src/app/admin/page.tsx');
const roles=file('src/lib/admin/autorizar-gestao.ts');
const sql=file('../../supabase/security-review/R03_RBAC_DEV_MIGRACAO_CONTROLADA_20261104.sql');
const academic=file('src/components/AdminRotinaAcademicaLab.tsx');
const layout=file('src/app/layout.tsx');
const a11y=file('src/components/AccessibilityWidget.tsx');
assert(login.includes('obterPapeisGestao(supabase, user.id)'));
assert(login.includes('obterPapeisGestao(supabase, data.user.id)'));
assert(dashboard.includes("const papeis = await obterPapeisGestao(supabase, user.id)"));
assert(dashboard.includes("if (papeis.length === 0)"),'Membership sem papel deve negar acesso');
assert(dashboard.includes("const podeAlterarStatus = papeisGestao.includes('coordenacao')"));
assert(dashboard.includes("disabled={!podeAlterarStatus || isUpdatingStatus === item.id}"));
assert(dashboard.includes("if (!acessoAutorizado || !podeAlterarStatus) return;"));
assert(dashboard.includes("if (!acessoAutorizado || !podeAlterarStatus || filteredInscricoes.length === 0) return;"));
assert(dashboard.includes(".select('id,status')"),'Confirmar update real, não sucesso enganoso com 0 linhas por RLS');
assert(dashboard.includes('papeisAtuais.includes'), 'Revalidar cargos antes de escrever/exportar');
assert(dashboard.includes('csvCellSeguro'),'Segurança CSV preservada');
assert(dashboard.includes('<AdminRotinaAcademicaLab />'),'Painel Administrativo incluído');
assert(academic.includes('Nenhum acesso a Supabase, pagamentos ou inscrições reais é efetuado aqui.'),'Acadêmico ainda deve ser sintético');
assert(layout.includes('<AccessibilityWidget />')&&layout.includes('<WhatsAppFlutuante />'),'A11Y e WhatsApp preservados');
assert(a11y.includes('aria-modal="true"')&&a11y.includes('ref={closeRef}'),'Correções de teclado preservadas');
assert(!roles.includes('user_metadata')||roles.includes('sem confiar em user_metadata')); // nunca usar user_metadata para autorização
assert(sql.includes('CREATE TABLE public.equipe_papeis'));
assert(sql.includes('REFERENCES auth.users(id) ON DELETE CASCADE'));
assert(sql.includes('ALTER TABLE public.equipe_papeis ENABLE ROW LEVEL SECURITY'));
assert(sql.includes('REVOKE ALL ON TABLE public.equipe_papeis FROM PUBLIC, anon, authenticated'));
assert(sql.includes('GRANT SELECT ON TABLE public.equipe_papeis TO authenticated'));
assert(!/GRANT\s+(INSERT|UPDATE|DELETE|ALL)\s+ON TABLE public\.equipe_papeis TO (anon|authenticated)/i.test(sql));
assert(sql.includes("AND e.papel='coordenacao'"));
assert(sql.includes("e.papel IN ('secretaria','coordenacao')"));
assert(sql.includes('WITH CHECK ('));
assert(!/SECURITY\s+DEFINER/.test(sql));
console.log('\nR03 RBAC + Painel Administrativo: 10 cenários sintéticos, controles de UI, menor privilégio e LIPE PASS. Não substitui login HTTP real.');
