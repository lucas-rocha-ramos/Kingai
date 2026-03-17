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

    return (
        <div
            className="w-full bg-panel rounded-2xl flex flex-col items-center justify-center p-6 text-center text-text-primary relative overflow-hidden border border-border"
            style={{
                aspectRatio: aspectRatio.replace(':', ' / '),
            }}
        >
            {type === 'image' 
                ? <div className="absolute inset-0"><ParticleAnimation aspectRatio={aspectRatio} duration={22} /></div> 
                : <VideoAnimation />
            }
            
            <div className="relative z-10 bg-black/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl max-w-[80%]">
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <div className="w-12 h-12 border-2 border-highlight/20 border-t-highlight rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            {type === 'image' ? <ImageIcon className="w-5 h-5 text-highlight" /> : <Clapperboard className="w-5 h-5 text-highlight" />}
                        </div>
                    </div>
                </div>
                <p className="font-medium text-sm text-white/90 animate-pulse">{messages[messageIndex]}</p>
                <div className="mt-4 flex justify-center gap-1">
                    {messages.map((_, i) => (
                        <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i === messageIndex ? 'w-4 bg-highlight' : 'w-1 bg-white/20'}`} />
                    ))}
                </div>
            </div>
        </div>
    );
};
