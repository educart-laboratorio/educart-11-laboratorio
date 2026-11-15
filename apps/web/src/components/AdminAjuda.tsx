'use client';
import { useEffect, useId, useRef, useState } from 'react';

/** Ajuda contextual de toque e teclado, sem operações no banco. */
type Props = { titulo: string; descricao: string; passos?: string; cuidado?: string };
export function AdminAjuda({ titulo, descricao, passos, cuidado }: Props) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const raiz = useRef<HTMLSpanElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setAberto(false); botao.current?.focus(); }
    };
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fora);
    return () => {
      document.removeEventListener('keydown', tecla);
      document.removeEventListener('pointerdown', fora);
    };
  }, [aberto]);
  return <span className="admin-help" ref={raiz}>
    <button ref={botao} type="button" className="admin-help-trigger"
      aria-label={`Dicas de uso: ${titulo}`} aria-expanded={aberto}
      aria-controls={aberto ? id : undefined}
      onClick={() => setAberto(valor => !valor)}>?</button>
    {aberto && <span className="admin-help-balloon" id={id} role="region" aria-label={`Ajuda para ${titulo}`}>
      <strong className="admin-help-title">{titulo}</strong>
      <span>{descricao}</span>
      {passos && <span><b>Como usar: </b>{passos}</span>}
      {cuidado && <span className="admin-help-warning"><b>Atenção: </b>{cuidado}</span>}
    </span>}
  </span>;
}
