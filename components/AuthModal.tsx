
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
      className="fixed inset-0 bg-black/60 backdrop-blur-3xl flex items-center justify-center z-[100] p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div 
        className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 sm:p-12 rounded-[3rem] shadow-2xl w-full max-w-md text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-highlight/5 blur-3xl rounded-full -mr-20 -mt-20" />
        
        <div className="flex flex-col items-center mb-10 relative z-10">
            <div className="w-28 h-28 mb-4">
                <AnimatedProtonsLogo />
            </div>
            <h2 id="auth-modal-title" className="text-4xl font-black text-center text-white tracking-tighter uppercase">
                Protons AI
            </h2>
            <p className="text-xs font-black text-white/30 mt-2 uppercase tracking-[0.2em]">{isLoginView ? "Bem-vindo de volta" : "Crie sua conta"}</p>
        </div>

        <form onSubmit={handlePrimaryAction} className="space-y-6 relative z-10">
          <div className="space-y-4">
            <input 
              type="text" 
              id="usernameAuth" 
              value={username}
              placeholder="Nome de Usuário"
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight/50 text-white placeholder:text-white/20 transition-all font-medium text-lg"
              required 
              aria-required="true"
            />
            <input 
              type="password" 
              id="passwordAuth" 
              value={password}
              placeholder="Senha"
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight/50 text-white placeholder:text-white/20 transition-all font-medium text-lg"
              required 
              aria-required="true"
            />

            {!isLoginView && (
              <input 
                type="password" 
                id="confirmPasswordAuth" 
                value={confirmPassword}
                placeholder="Confirmar Senha"
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-highlight/50 text-white placeholder:text-white/20 transition-all font-medium text-lg"
                required={!isLoginView}
                aria-required={!isLoginView}
              />
            )}
          </div>

          {error && <p className="text-red-400 text-xs font-bold text-center !mt-4 uppercase tracking-wider">{error}</p>}

          <button
            type="submit"
            className="w-full px-6 py-5 text-lg font-black text-black bg-highlight hover:scale-105 rounded-2xl shadow-2xl shadow-highlight/20 transition-all active:scale-95 uppercase tracking-widest"
          >
            {isLoginView ? "Entrar" : "Registrar"}
          </button>
        </form>

        <p className="text-center text-xs font-bold text-white/30 mt-10 relative z-10 uppercase tracking-widest">
            {isLoginView ? "Novo por aqui?" : "Já tem conta?"}{' '}
            <button 
                type="button" 
                onClick={isLoginView ? switchToSignup : switchToLogin} 
                className="text-highlight hover:underline focus:outline-none ml-1"
            >
                {isLoginView ? "Criar conta" : "Fazer login"}
            </button>
        </p>
        
        <div className="text-center mt-10 text-[10px] font-black text-white/10 relative z-10 uppercase tracking-[0.2em]">
            <a href="./privacy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                Termos & Privacidade
            </a>
        </div>
      </div>
    </div>
  );
};