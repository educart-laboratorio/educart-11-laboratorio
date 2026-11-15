'use client';

import type { MouseEvent } from 'react';
import { linkWhatsAppContextual, type ContextoWhatsApp } from '@/lib/contato-whatsapp-contextual';

/** Botão persistente em todas as páginas; identifica o contexto apenas ao toque. */
function identificarContexto(): ContextoWhatsApp {
  const caminho = window.location.pathname.replace(/\/$/, '') || '/';

  if (caminho === '/') {
    const etapa = document.querySelector('[data-educart-etapa]')?.getAttribute('data-educart-etapa');
    const etapas: Record<string, ContextoWhatsApp> = {
      abertura: 'inicio',
      interesses: 'escolha-area',
      objetivo: 'objetivo',
      idade: 'faixa-etaria',
      'idade-indisponivel': 'idade-indisponivel',
      experiencia: 'experiencia',
    };
    return (etapa && etapas[etapa]) || 'inicio';
  }

  if (caminho === '/formacao') {
    const aberto = document.querySelector('[data-catalog-detail-open]')?.getAttribute('data-catalog-detail-open');
    return aberto === 'true' ? 'catalogo-detalhes' : 'catalogo';
  }

  if (caminho === '/inscricao') {
    if (document.querySelector('.form-success-card')) return 'inscricao-enviada';
    const etapa = document.querySelector('[data-inscricao-step]')?.getAttribute('data-inscricao-step');
    if (etapa === '1') return 'inscricao-objetivo';
    if (etapa === '2') return 'inscricao-dados';
    if (etapa === '3') return 'inscricao-confirmacao';
    // Tela de bloqueio por idade/carregamento: nao afirmar revisao de ficha inexistente.
    return 'generico';
  }

  if (caminho === '/niveis-demo') return 'perfis';
  // O contexto administrativo, quando presente, nunca expõe dados pessoais ou inscrições.
  return 'generico';
}

export function WhatsAppFlutuante() {
  const prepararConversa = (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.currentTarget.href = linkWhatsAppContextual(identificarContexto());
  };

  return (
    <a
      className="educart-whatsapp-persistente"
      href={linkWhatsAppContextual('generico')}
      onClick={prepararConversa}
      target="_blank"
      rel="noopener noreferrer"
      title="Conversar no WhatsApp com a coordenação da EducART"
      aria-label="Abrir WhatsApp da EducART com mensagem sobre esta página"
    >
      <svg viewBox="0 0 24 24" width="27" height="27" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M20.52 3.48A11.8 11.8 0 0 0 12.07 0C5.5 0 .14 5.35.13 11.92c0 2.1.55 4.15 1.6 5.96L0 24l6.3-1.65A11.9 11.9 0 0 0 12.07 23.8h.01c6.57 0 11.91-5.35 11.92-11.91a11.8 11.8 0 0 0-3.48-8.4ZM12.08 21.78a9.85 9.85 0 0 1-5.02-1.38l-.36-.21-3.74.98.99-3.65-.23-.38a9.88 9.88 0 0 1-1.51-5.22 9.87 9.87 0 0 1 9.88-9.87 9.82 9.82 0 0 1 7 2.9 9.8 9.8 0 0 1 2.89 6.99c-.01 5.45-4.45 9.87-9.9 9.87Zm5.42-7.4c-.3-.15-1.77-.88-2.04-.98-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.23-.65.07-.3-.15-1.26-.47-2.39-1.49-.88-.78-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.08-.8.38s-1.05 1.02-1.05 2.48 1.08 2.88 1.23 3.08c.15.2 2.12 3.23 5.12 4.52.71.31 1.26.49 1.7.63.71.23 1.36.2 1.88.12.57-.08 1.77-.72 2.02-1.41.25-.7.25-1.3.17-1.43-.08-.13-.28-.2-.58-.35Z"/>
      </svg>
    </a>
  );
}
