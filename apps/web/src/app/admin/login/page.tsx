'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EducartLogo } from '@/components/EducartLogo';
import { createClient } from '@/lib/supabase/client';
import { obterPapeisGestao } from '@/lib/admin/autorizar-gestao';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Verifica se o usuário já está autenticado
  useEffect(() => {
    async function checkCurrentSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.is_anonymous) {
        const papeis = await obterPapeisGestao(supabase, user.id);
        const autorizado = papeis.length > 0;
        if (autorizado) {
          router.replace('/admin');
        } else {
          setErrorMessage('Conta autenticada, mas sem permissão de gestão da EducART.');
        }
      }
    }
    checkCurrentSession();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('E-mail ou senha incorretos. Verifique suas credenciais.');
        } else if (error.message.includes('Email not confirmed')) {
          setErrorMessage('Este e-mail ainda não foi confirmado no Supabase.');
        } else {
          setErrorMessage(error.message || 'Falha ao autenticar. Tente novamente.');
        }
        setIsLoading(false);
        return;
      }

      if (data?.user && !data.user.is_anonymous) {
        const papeis = await obterPapeisGestao(supabase, data.user.id);
        const autorizado = papeis.length > 0;
        if (autorizado) {
          router.replace('/admin');
        } else {
          setErrorMessage('Esta conta não está autorizada a acessar o Painel Administrativo.');
          setIsLoading(false);
        }
      } else {
        setErrorMessage('Acesso institucional requer uma conta de equipe autorizada.');
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Erro de conexão ao tentar fazer login. Tente novamente.');
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="login-header">
          <EducartLogo size="large" />
          <span className="admin-kicker">ACESSO INSTITUCIONAL</span>
          <h1 className="login-title">Gestão institucional<span className="admin-title-accent">.</span></h1>
          <p className="login-desc">Gestão de inscrições da Formação de Atores EducART</p>
        </div>

        {errorMessage && (
          <div className="login-error-banner" role="alert" style={{ marginBottom: '20px' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="admin-email" className="login-label">
              E-mail de Acesso
            </label>
            <input
              id="admin-email"
              type="email"
              className="login-input"
              placeholder="ex: contato@educart.pro"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="admin-pass" className="login-label">
              Senha
            </label>
            <input
              id="admin-pass"
              type="password"
              className="login-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '8px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Autenticando...' : 'Entrar na gestão →'}
          </button>
        </form>

        <div className="login-footer-hint">
          <p>Acesso exclusivo à equipe autorizada. Autenticação não substitui permissão administrativa.</p>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '8px' }}>
            ← Voltar ao portal
          </Link>
        </div>
      </div>
    </div>
  );
}
