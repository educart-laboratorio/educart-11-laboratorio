import Link from 'next/link';
import {EducartLogo} from '@/components/EducartLogo';
import {FormularioPropostaDocente} from './FormularioPropostaDocente';
import '../entrada.css';

export const metadata={
 title:'Propor aula, curso ou solução | EducART',
 description:'Envie sua proposta pedagógica à Coordenação EducART para análise.',
 robots:{index:false,follow:false},
};
export default function CriarSolucaoDocente(){
 return <div className="eg-enroll">
  <header className="eg-catalog-bar">
   <Link className="eg-brand-link" href="/" aria-label="EducART — página inicial"><EducartLogo size="default"/></Link>
   <Link className="eg-return" href="/">Página inicial</Link>
  </header>
  <main className="eg-enroll-body criar-pagina" style={{maxWidth:900}}>
   <span className="eg-eyebrow">EducART · Proposta docente</span>
   <h1>Vamos criar uma solução de formação?</h1>
   <p className="eg-description">Professor(a), preencha sua proposta de aula, oficina ou curso usando os mesmos campos de planejamento da EducART. Sua proposta será analisada pela Coordenação antes de qualquer publicação.</p>
   <FormularioPropostaDocente/>
  </main>
 </div>;
}
