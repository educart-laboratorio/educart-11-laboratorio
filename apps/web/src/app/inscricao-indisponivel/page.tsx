import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import '../entrada.css';

// TC23: rota segura e neutra. Nenhum formulário, SDK Supabase ou gravação.
// A decisão de publicação permanece separada e requer aprovação explícita.
export const metadata={
  title:'Inscrições indisponíveis temporariamente | EducART',
  description:'Entre em contato com a equipe da EducART para informações sobre inscrições.',
  robots:{index:false,follow:false},
};
export default function InscricaoTemporariamenteIndisponivel(){
  return <div className="eg-enroll">
    <header className="eg-catalog-bar">
      <Link href="/" className="eg-brand-link"><EducartLogo size="default" />
        <span className="eg-sr-only">Voltar ao início</span></Link>
      <Link className="eg-return" href="/formacao">← Formação</Link>
    </header>
    <main className="eg-enroll-body" style={{maxWidth:760}}>
      <span className="eg-eyebrow">EducART · Atendimento</span>
      <h1>Inscrições temporariamente indisponíveis.</h1>
      <p className="eg-description" role="status">
        O envio de fichas online está temporariamente suspenso. Não informe
        dados pessoais por esta página.
      </p>
      <p className="eg-description">Para orientações sobre vagas, horários e matrículas,
        fale diretamente com a equipe da EducART pelo WhatsApp.</p>
      <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
        <a className="eg-button" href="https://wa.me/5571996824505"
          target="_blank" rel="noopener noreferrer">Falar com a EducART</a>
        <Link className="eg-button eg-secondary" href="/formacao">Voltar à formação</Link>
      </div>
    </main>
  </div>;
}
