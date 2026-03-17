
import React, { useState, useEffect } from 'react';
import { AnimatedProtonsLogo, XMarkIcon } from './components/Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string, password?: string) => void;
  onSignup: (username: string, password?: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin, onSignup, error, setError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authViewMode, setAuthViewMode] = useState<'login' | 'signup'>('login');

  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen, setError]);

  const resetFields = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handlePrimaryAction = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Nome de usuário e senha são obrigatórios.");
      return;
    }

    if (authViewMode === 'login') {
      onLogin(username, password);
    } else { // signup mode
      if (!confirmPassword.trim()) {
        setError("Por favor, confirme sua senha.");
        return;
      }
      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      onSignup(username, password);
    }
  };

  const switchToSignup = () => {
    resetFields();
    setAuthViewMode('signup');
  };

  const switchToLogin = () => {
    resetFields(); 
    setAuthViewMode('login');
  };

  if (!isOpen) return null;

  const isLoginView = authViewMode === 'login';

  return (
    <div 
      className="fixed inset-0 bg-background/50 backdrop-blur-lg flex items-center justify-center z-[100] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        className="bg-panel border border-border p-6 sm:p-8 rounded-xl shadow-2xl w-full max-w-sm text-text-primary relative"
      >
        <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 mb-4">
                <AnimatedProtonsLogo />
            </div>
            <h2 id="auth-modal-title" className="text-3xl font-sora font-bold text-center text-highlight tracking-tighter">
                Protons AI
            </h2>
            <p className="text-sm text-text-secondary mt-2 text-center">
              Acesse a próxima geração da inteligência artificial.
            </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onLogin('', '')}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 text-base font-semibold text-black bg-highlight hover:bg-highlight-hover rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all transform hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-highlight/50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>

          {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary bg-panel-lighter border border-border hover:bg-panel-light rounded-lg transition-all"
            >
              Abrir em Nova Aba (Recomendado para Celular)
            </button>
          )}

          {error && (
            <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg">
              <p className="text-danger text-xs text-center">{error}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-center text-[10px] text-text-secondary leading-relaxed">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-link hover:underline">Termos de Serviço</a> e{' '}
            <a href="./privacy.html" target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
              Política de Privacidade
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
};