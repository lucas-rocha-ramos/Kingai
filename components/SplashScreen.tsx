
import React from 'react';
import { AnimatedProtonsLogo } from './Icons';

interface SplashScreenProps {
  onStart: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-8 z-50 animate-fade-in overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-highlight/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="text-center w-full max-w-lg relative z-10">
        <div className="flex flex-col items-center mb-12">
            <div className="w-56 h-56 drop-shadow-[0_0_40px_rgba(0,255,0,0.2)]">
              <AnimatedProtonsLogo />
            </div>
            <h1 className="text-6xl sm:text-7xl font-black text-white tracking-tight mt-6">
                Protons <span className="text-highlight">AI</span>
            </h1>
        </div>
        
        <p className="text-xl sm:text-2xl text-white/40 mb-16 max-w-md mx-auto font-medium leading-relaxed">
          Sua suíte criativa com o poder da Inteligência Artificial de ponta.
        </p>

        <button
          onClick={onStart}
          className="px-12 py-5 bg-highlight text-black text-xl font-black rounded-3xl shadow-[0_0_50px_rgba(0,255,0,0.3)] hover:scale-110 transition-all active:scale-95 focus:outline-none focus:ring-4 focus:ring-highlight/50 uppercase tracking-widest"
          aria-label="Começar a usar Protons AI"
        >
          Começar Agora
        </button>
      </div>
      
      <div className="absolute bottom-12 text-[10px] font-black text-white/10 uppercase tracking-[0.5em]">
        Apple iOS 26 Concept
      </div>
    </div>
  );
};

export default SplashScreen;