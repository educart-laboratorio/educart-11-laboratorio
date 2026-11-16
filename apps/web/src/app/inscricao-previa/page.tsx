import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import '../entrada.css';

/**
 * R41: aviso de homologação. Sem formulário, cliente Supabase ou coleta.
 * Só a candidata pública usa este conteúdo nas rotas de inscrição/proposta.
 */
export const metadata = {
  title: 'Prévia de testes | EducART 1.1',
  description: 'Prévia pública sem coleta de inscrições, cadastros ou propostas docentes.',
  robots: { index: false, follow: false },
};

export default function AvisoCandidata() {
  return (
    <div className="eg-enroll">
      <header className="eg-catalog-bar">
        <Link className="eg-brand-link" href="/" aria-label="Voltar ao início">
          <EducartLogo size="default" />
        </Link>
        <Link className="eg-return" href="/formacao">← Formação</Link>
      </header>
      <main className="eg-enroll-body" style={{ maxWidth: 760 }}>
        <span className="eg-eyebrow">EducART 1.1 · ambiente público de testes</span>
        <h1>Esta é uma prévia de homologação.</h1>
        <p className="eg-description" role="status">
          As inscrições de alunos, os cadastros e as propostas docentes
          estão desativados nesta prévia. Não informe dados pessoais aqui.
          Nenhuma solicitação real será recebida por esta interface.
        </p>
        <p className="eg-description">
          Para saber sobre inscrições e disponibilidade de vagas,
          converse com a equipe da EducART pelo WhatsApp. Não preencha fichas nesta prévia.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="eg-button" href="https://wa.me/5571996824505"
            target="_blank" rel="noopener noreferrer">Falar com a EducART</a>
          <Link className="eg-button eg-secondary" href="/formacao">
            Voltar à formação
          </Link>
        </div>
      </main>
    </div>
  );
}
