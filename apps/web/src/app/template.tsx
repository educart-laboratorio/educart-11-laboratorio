'use client';

/**
 * EducART 1.1 — atalhos de acesso somente na home.
 * Extensão ADITIVA: não altera a EntradaEducart nem os 14 arquivos da LIPE 1.0.
 * Em homologação Codespaces, a portaria privada segue exigindo login institucional.
 */
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './acessos-home.css';

export default function RootTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {children}
      {pathname === '/' && (
        <nav className="educart-home-acessos" aria-label="Acessos privativos EducART">
          <Link className="educart-home-acesso" href="/admin/login"
            title="Acesso restrito à gestão institucional">
            <span>Painel Administrativo</span>
            <small>Acesso da gestão</small>
          </Link>
          <Link className="educart-home-acesso educart-home-acesso-cliente"
            href="/minha-educart/login"
            title="Minha EducART: acesso individual mediante convite, em homologação">
            <span>Minha EducART</span>
            <small>Por convite · em testes</small>
          </Link>
        </nav>
      )}
    </>
  );
}
