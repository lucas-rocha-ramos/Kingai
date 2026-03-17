
import React, { useState, useEffect } from 'react';
import { AnimatedProtonsLogo, XMarkIcon } from './Icons';

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
        <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 mb-2">
                <AnimatedProtonsLogo />
            </div>
            <h2 id="auth-modal-title" className="text-3xl font-sora font-bold text-center text-highlight tracking-tighter">
                Protons AI
            </h2>
            <p className="text-sm text-text-secondary mt-1">{isLoginView ? "Bem-vindo(a) de volta!" : "Crie sua conta"}</p>
        </div>

        <form onSubmit={handlePrimaryAction} className="space-y-5">
          <div>
            <input 
              type="text" 
              id="usernameAuth" 
              value={username}
              placeholder="Nome de Usuário"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary placeholder:text-text-secondary transition-all"
              required 
              aria-required="true"
            />
          </div>
          <div>
            <input 
              type="password" 
              id="passwordAuth" 
              value={password}
              placeholder="Senha"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary placeholder:text-text-secondary transition-all"
              required 
              aria-required="true"
            />
          </div>

          {!isLoginView && (
            <div>
              <input 
                type="password" 
                id="confirmPasswordAuth" 
                value={confirmPassword}
                placeholder="Confirmar Senha"
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary placeholder:text-text-secondary transition-all"
                required={!isLoginView}
                aria-required={!isLoginView}
              />
            </div>
          )}

          {error && <p className="text-danger text-sm text-center !mt-3">{error}</p>}

          <button
            type="submit"
            className="w-full px-4 py-3 text-base font-semibold text-black bg-highlight hover:bg-highlight-hover rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-highlight/50"
          >
            {isLoginView ? "Continuar" : "Criar Conta"}
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-8">
            {isLoginView ? "Não tem uma conta?" : "Já tem uma conta?"}{' '}
            <button 
                type="button" 
                onClick={isLoginView ? switchToSignup : switchToLogin} 
                className="font-semibold text-link hover:underline focus:outline-none"
            >
                {isLoginView ? "Crie uma conta" : "Faça login"}
            </button>
        </p>
        
        <div className="text-center mt-8 text-xs text-text-secondary">
            <a href="./privacy.html" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Política de Privacidade
            </a>
        </div>
      </div>
    </div>
  );
};