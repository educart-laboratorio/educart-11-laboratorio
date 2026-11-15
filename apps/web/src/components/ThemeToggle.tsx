'use client';

import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDarkActive = document.documentElement.classList.contains('dark');
    setIsDark(isDarkActive);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('educart_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('educart_theme', 'light');
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Noturno'}
      title={
        isDark
          ? 'Modo Noturno ativo (clique para alternar para modo claro)'
          : 'Modo Claro ativo (clique para alternar para modo noturno)'
      }
    >
      <span className="theme-toggle-circle" aria-hidden="true">
        {mounted && isDark ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className="theme-icon-svg">
            <path
              d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
              fill="#38bdf8"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" className="theme-icon-svg">
            <circle cx="12" cy="12" r="5" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
            <path
              d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span className="theme-toggle-text">
        {mounted ? (isDark ? 'Noite' : 'Dia') : 'Tema'}
      </span>
    </button>
  );
}
