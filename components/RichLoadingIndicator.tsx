import React, { useState, useEffect } from 'react';
import { ImageIcon, Clapperboard, Sparkles } from 'lucide-react';
import { ParticleAnimation } from './ParticleAnimation';

interface RichLoadingIndicatorProps {
    type: 'image' | 'video';
    aspectRatio?: string;
}

const imageMessages = [
    "Analisando o prompt...",
    "Ajustando parâmetros criativos...",
    "Conectando com o núcleo de IA...",
    "Renderizando pixels...",
    "Aplicando filtros de alta definição...",
    "Quase pronto!",
];

const videoMessages = [
    "Analisando seu prompt para criar o roteiro...",
    "Definindo a cena e os personagens...",
    "A mágica está acontecendo... Renderizando os primeiros quadros.",
    "Adicionando efeitos especiais e polimento visual.",
    "A geração de vídeo pode demorar um pouco. Estamos quase lá!",
    "Finalizando e compactando seu vídeo. Agradecemos a paciência.",
];

const VideoAnimation: React.FC = () => {
    return (
        <div className="film-strip-container">
            <div className="film-strip">
                {[...Array(20)].map((_, i) => (
                    <div key={`a-${i}`} className="frame">
                        <ImageIcon className="frame-icon" style={{ animationDelay: `${Math.random() * 1.5}s` }} />
                    </div>
                ))}
                {[...Array(20)].map((_, i) => (
                    <div key={`b-${i}`} className="frame">
                        <ImageIcon className="frame-icon" style={{ animationDelay: `${Math.random() * 1.5}s` }} />
                    </div>
                ))}
            </div>
        </div>
    );
};


export const RichLoadingIndicator: React.FC<RichLoadingIndicatorProps> = ({ type, aspectRatio = '1:1' }) => {
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = type === 'image' ? imageMessages : videoMessages;

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % messages.length);
        }, 3000);

        return () => clearInterval(interval);
    }, [messages.length]);

    // Parse aspect ratio for CSS
    const cssAspectRatio = aspectRatio.includes(':') ? aspectRatio.replace(':', ' / ') : '1 / 1';

    return (
        <div
            className="w-full bg-white/5 backdrop-blur-3xl rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center text-white relative overflow-hidden border border-white/10 shadow-2xl"
            style={{
                aspectRatio: cssAspectRatio,
            }}
        >
            {type === 'image' 
                ? <div className="absolute inset-0 pointer-events-none z-0"><ParticleAnimation aspectRatio={aspectRatio} duration={22} /></div> 
                : <VideoAnimation />
            }
            
            <div className="relative z-10 bg-black/40 backdrop-blur-3xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl max-w-[90%] animate-fade-in flex flex-col items-center">
                <div className="relative mb-8">
                    <div className="w-20 h-20 border-[6px] border-highlight/10 border-t-highlight rounded-full animate-spin shadow-[0_0_20px_rgba(0,255,0,0.2)]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        {type === 'image' ? <ImageIcon className="w-8 h-8 text-highlight" /> : <Clapperboard className="w-8 h-8 text-highlight" />}
                    </div>
                </div>
                
                <p className="text-xl font-black text-white tracking-tight animate-pulse mb-8 uppercase tracking-[0.1em]">{messages[messageIndex]}</p>
                
                <div className="flex justify-center gap-2">
                    {messages.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all duration-700 ${i === messageIndex ? 'w-10 bg-highlight shadow-[0_0_10px_rgba(0,255,0,0.5)]' : 'w-2 bg-white/10'}`} />
                    ))}
                </div>
            </div>
            
            <div className="absolute bottom-6 left-6 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-highlight animate-bounce" />
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Processamento Neural Ativo</span>
            </div>
        </div>
    );
};
