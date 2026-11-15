import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { InscricaoElegibilidade } from '@/components/InscricaoElegibilidade';
import '../entrada.css';

export const metadata = {
  title: 'Inscrição oficial · Formação de Atores | EducART',
  description: 'Inscreva-se na Formação de Atores EducART para teatro, cinema e televisão.',
};

export default function PaginaInscricao() {
  return (
    <div className="eg-enroll">
      <header className="eg-catalog-bar">
        <Link className="eg-brand-link" href="/" aria-label="Voltar ao início"><EducartLogo size="default" /></Link>
        <Link className="eg-return" href="/formacao">← Formação</Link>
      </header>
      <main className="eg-enroll-body" style={{ maxWidth: 900 }}>
        <span className="eg-eyebrow">Oficina de Atores Salvador · EducART</span>
        <h1>Comece sua história com a arte.</h1>
        <p className="eg-description">
          Inscrição oficial para a turma adulta da Formação de Atores, a partir dos 14 anos completos, com experiências em teatro,
          cinema e televisão. Preencha a ficha em três etapas. A equipe entrará em
          contato sobre disponibilidade de turmas e condições de ingresso.
          A inscrição não equivale à matrícula e não gera cobrança.
        </p>
        <section aria-label="Formulário oficial de inscrição">
          <InscricaoElegibilidade />
        </section>
      </main>
    </div>
  );
}
