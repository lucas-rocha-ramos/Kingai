
import React from 'react';
import { AnimatedProtonsLogo } from './Icons';

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 bg-background text-text-primary flex flex-col items-center justify-center p-6 sm:p-8 z-50 animate-fade-in">
      <div className="text-center w-full max-w-md">
        
        <div className="flex flex-col items-center mb-8">
            <div className="w-48 h-48">
              <AnimatedProtonsLogo />
            </div>
            <h1 className="text-5xl sm:text-6xl font-sora font-bold text-highlight tracking-tighter mt-4">
                Protons AI
            </h1>
        </div>
        
        <p className="text-lg sm:text-xl text-text-secondary mb-12 max-w-sm mx-auto">
          Sua suíte criativa com o poder da Inteligência Artificial de ponta.
        </p>

        <button
          onClick={onStart}
          className="px-10 py-4 bg-highlight text-background text-lg font-semibold rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.3)] hover:bg-highlight-hover hover:shadow-[0_0_30px_rgba(0,255,0,0.5)] transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-highlight/50"
          aria-label="Começar a usar Protons AI"
        >
          Começar Agora
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;