import type {Metadata} from 'next';
import {createClient} from '@supabase/supabase-js';
import {PerfilPublicoDocente} from '@/components/PerfilPublicoDocente';

export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'Perfil profissional · EducART',
 description:'Perfil profissional compartilhado com autorização pela Coordenação EducART.',
 robots:{index:false,follow:false,noarchive:true},
};
type Props={params:Promise<{token:string}>};
type Perfil={
 nome_profissional:string;areas_atuacao:string|null;
 formacao_profissional:string|null;apresentacao_publica:string|null;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export default async function PerfilDocenteCompartilhado({params}:Props){
 const {token}=await params;
 let perfil:Perfil|null=null;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 // Não ler docentes diretamente nem usar service_role. A RPC devolve apenas 4 campos consentidos.
 if(UUID.test(token)&&url&&anon){
  try{
   const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
   const {data,error}=await client.rpc('educart_ler_perfil_docente_compartilhado_dev',{p_token:token});
   if(!error&&Array.isArray(data)&&data.length===1)perfil=data[0] as Perfil;
  }catch{perfil=null;}
 }
 return <div style={{minHeight:'80vh',background:'#0b111d',padding:'clamp(24px,7vw,72px) 16px',display:'flex',alignItems:'flex-start',justifyContent:'center'}}>
   {perfil?<PerfilPublicoDocente nome={perfil.nome_profissional}
      areas={perfil.areas_atuacao} formacao={perfil.formacao_profissional}
      apresentacao={perfil.apresentacao_publica}/>:
    <section style={{maxWidth:560,background:'#16243a',color:'#e8f1fd',padding:30,border:'1px solid #405772',borderRadius:18}} role="status">
      <strong>EducART · Perfil indisponível</strong>
      <p>Este perfil não está disponível para compartilhamento ou o link foi desativado.</p>
    </section>}
  </div>;
}
