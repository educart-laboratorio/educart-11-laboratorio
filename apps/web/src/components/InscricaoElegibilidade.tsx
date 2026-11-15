'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InscricaoForm } from '@/components/InscricaoForm';
import { FAIXA_ATE_13 } from '@/lib/idade-formacao';

/** Bloqueia o caminho de inscrição quando a triagem informou até 13 anos.
 *  O formulário também valida a data de nascimento, inclusive sem parâmetros.
 */
export function InscricaoElegibilidade() {
  const [bloqueio, setBloqueio] = useState<boolean | null>(null);
  useEffect(() => {
    const faixa = new URLSearchParams(window.location.search).get('faixa');
    setBloqueio(faixa === FAIXA_ATE_13);
  }, []);

  if (bloqueio === null) return <p className="eg-description">Verificando os requisitos da turma…</p>;
  if (bloqueio) return <section role="status" aria-live="polite" className="eg-description">
    <h2>Turma adulta · idade mínima de 14 anos</h2>
    <p>A turma disponível exige 14 anos completos. Para participantes com até 13 anos, a inscrição nesta formação não está disponível.</p>
    <p>Esta informação não significa que exista uma turma infantil aberta.</p>
    <Link className="eg-button eg-secondary" href="/">← Voltar ao início</Link>
  </section>;
  return <InscricaoForm />;
}
