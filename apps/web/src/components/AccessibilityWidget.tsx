'use client';

import { useState, useEffect, useRef } from 'react';

export function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState(1);
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Carregar preferências salvas do usuário
    const savedContrast = localStorage.getItem('educart_high_contrast') === 'true';
    const savedFontSize = parseFloat(localStorage.getItem('educart_font_size') || '1');

    if (savedContrast) {
      setHighContrast(true);
      document.documentElement.classList.add('high-contrast');
    }
    if (savedFontSize && savedFontSize !== 1) {
      setFontSizeLevel(savedFontSize);
      document.documentElement.style.setProperty('--font-scale', savedFontSize.toString());
    }
  }, []);

  // Dialog modal: foco inicial, ciclo por Tab/Shift+Tab e retorno ao botão de origem.
  // A ferramenta é global: este cuidado também protege /admin e /admin/login.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focaveis = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (!primeiro || !ultimo) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      if (e.shiftKey && (document.activeElement === primeiro || !dialogRef.current.contains(document.activeElement))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || !dialogRef.current.contains(document.activeElement))) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Fechar ao clicar fora do card
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleHighContrast = () => {
    const nextState = !highContrast;
    setHighContrast(nextState);
    if (nextState) {
      document.documentElement.classList.add('high-contrast');
      localStorage.setItem('educart_high_contrast', 'true');
    } else {
      document.documentElement.classList.remove('high-contrast');
      localStorage.setItem('educart_high_contrast', 'false');
    }
  };

  const changeFontSize = (delta: number) => {
    let newLevel = Math.round((fontSizeLevel + delta) * 100) / 100;
    if (newLevel < 0.9) newLevel = 0.9;
    if (newLevel > 1.35) newLevel = 1.35;
    setFontSizeLevel(newLevel);
    document.documentElement.style.setProperty('--font-scale', newLevel.toString());
    localStorage.setItem('educart_font_size', newLevel.toString());
  };

  const resetFontSize = () => {
    setFontSizeLevel(1);
    document.documentElement.style.setProperty('--font-scale', '1');
    localStorage.setItem('educart_font_size', '1');
  };

  return (
    <>
      {/* Link de salto acessível para leitores de tela e navegação por teclado */}
      <a href="#main-content" className="skip-to-content">
        Pular para o conteúdo principal
      </a>

      {/* Widget Flutuante no Canto Inferior Esquerdo */}
      <div className="a11y-floating-widget" ref={modalRef}>
        {/* Painel / Card de Opções que abre ao clicar */}
        {isOpen && (
          <div
            ref={dialogRef}
            id="educart-a11y-dialog"
            className="a11y-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-dialog-title"
            tabIndex={-1}
          >
            <div className="a11y-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="a11y-header-icon" aria-hidden="true">♿</span>
                <h2 id="a11y-dialog-title" className="a11y-modal-title">
                  Acessibilidade
                </h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="a11y-close-btn"
                onClick={() => {
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                aria-label="Fechar painel de acessibilidade"
              >
                ✕
              </button>
            </div>

            {/* Aviso Institucional Obrigatório WCAG 2.1 AA / Section 508 */}
            <p className="a11y-declaration-text">
              Este painel oferece opções de contraste e tamanho do texto. A acessibilidade de cada página é verificada continuamente pela EducART.
            </p>

            <div className="a11y-options-list">
              {/* Opção de Alto Contraste */}
              <div className="a11y-option-item">
                <span className="a11y-option-label">Contraste de Cores:</span>
                <button
                  type="button"
                  onClick={toggleHighContrast}
                  className={`a11y-control-btn ${highContrast ? 'active' : ''}`}
                  aria-pressed={highContrast}
                >
                  <span aria-hidden="true">{highContrast ? '✓' : '◐'}</span>
                  <span>{highContrast ? 'Alto Contraste Ativado' : 'Ativar Alto Contraste'}</span>
                </button>
              </div>

              {/* Opção de Ajuste de Tamanho da Fonte */}
              <div className="a11y-option-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="a11y-option-label">Tamanho do Texto:</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {Math.round(fontSizeLevel * 100)}%
                  </span>
                </div>
                <div className="a11y-font-controls" role="group" aria-label="Ajuste do tamanho de fonte">
                  <button
                    type="button"
                    onClick={() => changeFontSize(-0.1)}
                    className="a11y-control-btn a11y-sm"
                    aria-label="Diminuir texto"
                    title="Diminuir fonte (A-)"
                    disabled={fontSizeLevel <= 0.9}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={resetFontSize}
                    className="a11y-control-btn a11y-sm"
                    aria-label="Tamanho original de texto"
                    title="Redefinir tamanho para 100%"
                  >
                    100%
                  </button>
                  <button
                    type="button"
                    onClick={() => changeFontSize(0.1)}
                    className="a11y-control-btn a11y-sm"
                    aria-label="Aumentar texto"
                    title="Aumentar fonte (A+)"
                    disabled={fontSizeLevel >= 1.35}
                  >
                    A+
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão Flutuante (Acessibilidade) */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`a11y-floating-trigger ${isOpen ? 'open' : ''}`}
          aria-haspopup="dialog"
          aria-controls="educart-a11y-dialog"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Fechar menu de acessibilidade' : 'Abrir menu de acessibilidade (Alto contraste e tamanho de fonte)'}
          title="Opções de Acessibilidade (WCAG 2.1 AA)"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
          </svg>
        </button>
      </div>
    </>
  );
}
