import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIMode, ChatSession, MessageSender, GeneratedImage } from '../types';
import { PlusIcon, PhotoIcon, TrashIcon, SparklesIcon, KingLabIcon, RefreshIcon, DownloadIcon, VideoProtonsIcon, KeyIcon } from './Icons';

interface KingLabViewProps {
  activeChatSession: ChatSession;
  onSendMessage: (
    inputText: string, 
    imageGenerationPrompt?: string, 
    userImages?: { base64: string; mimeType: string }[]
  ) => void;
  isLoading: boolean;
  onClearChat: (chatId: string) => void;
  apiKeyStatus?: 'unknown' | 'ok' | 'not_set';
  onConfigureApiKey?: () => void;
}

const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            resolve({
                base64: result.split(',')[1],
                mimeType: file.type
            });
        };
        reader.onerror = error => reject(error);
    });
};


const KingLabView: React.FC<KingLabViewProps> = ({ activeChatSession, onSendMessage, isLoading, onClearChat, apiKeyStatus, onConfigureApiKey }) => {
    const [canvases, setCanvases] = useState([
        { id: uuidv4(), image: null as { base64: string, mimeType: string } | null },
        { id: uuidv4(), image: null as { base64: string, mimeType: string } | null }
    ]);
    const [prompt, setPrompt] = useState('');
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    
    useEffect(() => {
        if (activeChatSession.messages.length === 0) {
            setCanvases([
                { id: uuidv4(), image: null },
                { id: uuidv4(), image: null }
            ]);
            setPrompt('');
        }
    }, [activeChatSession.messages.length]);

    useEffect(() => {
        const allFilled = canvases.every(c => c.image !== null);
        if (allFilled && canvases.length < 8) {
            setCanvases(prev => [...prev, { id: uuidv4(), image: null }]);
        }
    }, [canvases]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, canvasId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const image = await fileToBase64(file);
            setCanvases(prev => prev.map(c => c.id === canvasId ? { ...c, image } : c));
        } catch (error) {
            console.error("Error converting file to base64:", error);
            alert("Erro ao carregar a imagem.");
        }
    };
    
    const removeCanvasImage = (canvasId: string) => {
        setCanvases(prev => {
            const newCanvases = prev.map(c => c.id === canvasId ? { ...c, image: null } : c);
            const emptyCanvases = newCanvases.filter(c => !c.image);
            if (emptyCanvases.length > 1 && newCanvases.length > 2) {
                let lastEmptyIndex = -1;
                for (let i = newCanvases.length - 1; i >= 0; i--) {
                    if (!newCanvases[i].image) {
                        lastEmptyIndex = i;
                        break;
                    }
                }
                if (lastEmptyIndex !== -1) {
                    newCanvases.splice(lastEmptyIndex, 1);
                }
            }
            return newCanvases;
        });
    };
    
    const handleGenerateImage = () => {
        const referenceImages = canvases.map(c => c.image).filter((img): img is { base64: string, mimeType: string } => img !== null);
        if (referenceImages.length === 0) {
            alert("Adicione pelo menos uma imagem de referência.");
            return;
        }
        // Identificadores @imagemN são tratados pelo serviço através da ordem do array
        onSendMessage(prompt, undefined, referenceImages);
    };

    const handleGenerateVideo = (aspectRatio: '16:9' | '9:16') => {
        if (apiKeyStatus === 'not_set' && onConfigureApiKey) {
            onConfigureApiKey();
            return;
        }
        const referenceImages = canvases.map(c => c.image).filter((img): img is { base64: string, mimeType: string } => img !== null);
        if (referenceImages.length === 0) {
            alert("Adicione pelo menos uma imagem de referência.");
            return;
        }
        const videoPrompt = `[KING_LAB_VIDEO_${aspectRatio}]${prompt}`;
        onSendMessage(videoPrompt, undefined, referenceImages);
    };
    
    const handleDownload = (image: GeneratedImage) => {
        const link = document.createElement('a');
        link.href = `data:${image.mimeType};base64,${image.base64}`;
        const filename = `kinglab_${(prompt || 'generated').replace(/[^a-z0-9]/gi, '_').substring(0, 30)}.png`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const lastMessage = activeChatSession.messages[activeChatSession.messages.length - 1];
    const resultImage = (lastMessage?.sender === MessageSender.AI && lastMessage.images && lastMessage.images[0]) ? lastMessage.images[0] : null;
    const error = (lastMessage?.sender === MessageSender.AI && lastMessage.error) ? lastMessage.error : null;

    return (
        <div className="flex-1 flex flex-col bg-background min-h-0">
             <header className="p-2.5 bg-panel flex justify-between items-center h-[60px] flex-shrink-0 border-l border-border">
                <div className="flex items-center gap-3">
                    <KingLabIcon className="w-10 h-10 rounded-full bg-border p-1.5 text-text-primary" />
                     <div>
                        <h2 className="text-md font-medium text-text-primary truncate">{AIMode.KingLab}</h2>
                        <p className="text-xs text-text-secondary">Laboratório de Fusão Multimodal</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {activeChatSession.mode === AIMode.KingLab && apiKeyStatus !== 'unknown' && (
                        <div className="flex items-center space-x-1 bg-surface p-1 rounded-lg border border-border mr-2">
                            <button onClick={onConfigureApiKey} className="flex items-center gap-1.5 px-2 py-1 text-text-secondary hover:text-text-primary text-xs rounded-md hover:bg-panel transition-colors" title="Configurar Chave de API para Vídeo">
                                <KeyIcon className="w-4 h-4"/>
                                <span>Chave API</span>
                                {apiKeyStatus === 'ok' && <div className="w-1.5 h-1.5 rounded-full bg-success" title="Chave de API selecionada"></div>}
                                {apiKeyStatus === 'not_set' && <div className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" title="Chave de API necessária"></div>}
                            </button>
                        </div>
                    )}
                    <button onClick={() => onClearChat(activeChatSession.id)} className="flex items-center gap-2 px-3 py-1.5 bg-surface text-text-primary rounded-lg text-sm font-semibold hover:bg-border transition">
                        <RefreshIcon className="w-5 h-5" />
                        <span>Resetar Lab</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto custom-scrollbar">
                {/* Reference Images List */}
                <div>
                    <h3 className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">Imagens de Referência</h3>
                    <div className="flex items-center gap-4 pb-4 overflow-x-auto custom-scrollbar">
                       {canvases.map((canvas, index) => (
                           <React.Fragment key={canvas.id}>
                                <div className="flex-shrink-0 w-36 h-36 relative">
                                    {/* Yellow Identifier Badge matching the print */}
                                    <div className="absolute top-0 left-0 z-10 px-1.5 py-0.5 bg-highlight text-black text-[10px] font-bold rounded-br-md border-r border-b border-background/20">
                                        @imagem{index + 1}
                                    </div>
                                    
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        ref={el => { fileInputRefs.current[canvas.id] = el; }}
                                        onChange={(e) => handleFileChange(e, canvas.id)}
                                    />
                                    {canvas.image ? (
                                        <div className="relative group w-full h-full">
                                            <img src={`data:${canvas.image.mimeType};base64,${canvas.image.base64}`} alt={`Ref ${index + 1}`} className="w-full h-full object-cover rounded-xl border border-border shadow-sm group-hover:border-highlight/40 transition-colors"/>
                                            <button 
                                                onClick={() => removeCanvasImage(canvas.id)}
                                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remover"
                                            >
                                                <TrashIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button onClick={() => fileInputRefs.current[canvas.id]?.click()} className="w-full h-full border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center text-text-secondary hover:bg-panel hover:border-highlight/50 transition-all">
                                            <PhotoIcon className="w-7 h-7 mb-1 opacity-40"/>
                                            <span className="text-[10px] font-bold uppercase">Upload</span>
                                        </button>
                                    )}
                                </div>
                               {index < canvases.length - 1 && <PlusIcon className="w-5 h-5 text-text-secondary/40 flex-shrink-0" />}
                           </React.Fragment>
                       ))}
                    </div>
                </div>

                {/* Instructions Text Area */}
                <div className="flex-1 flex flex-col min-h-[150px]">
                    <h3 className="text-xs font-bold text-text-secondary mb-2 uppercase tracking-wider">Instruções do Laboratório</h3>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Transforme o personagem da @imagem1 usando o cenário da @imagem2 e o estilo artístico da @imagem3..."
                        className="flex-1 w-full p-4 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-highlight/30 text-text-primary custom-scrollbar placeholder:text-text-secondary/40 text-sm"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-highlight"></div>
                        <p className="text-[10px] text-text-secondary">Dica: Use @imagem1, @imagem2 etc. para indicar as referências no seu texto.</p>
                    </div>
                </div>
                
                {/* Action Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <button
                        onClick={handleGenerateImage}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-highlight text-black rounded-xl text-sm font-bold hover:bg-highlight-hover disabled:opacity-50 transition-all shadow-lg active:scale-95"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        <span>Gerar Imagem</span>
                    </button>
                    <button
                        onClick={() => handleGenerateVideo('16:9')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-panel border border-border text-text-primary rounded-xl text-sm font-bold hover:bg-surface disabled:opacity-50 transition-all active:scale-95"
                    >
                        <VideoProtonsIcon className="w-5 h-5" />
                        <span>Vídeo (16:9)</span>
                    </button>
                    <button
                        onClick={() => handleGenerateVideo('9:16')}
                        disabled={isLoading}
                        className="flex items-center justify-center gap-2 px-6 py-3.5 bg-panel border border-border text-text-primary rounded-xl text-sm font-bold hover:bg-surface disabled:opacity-50 transition-all active:scale-95"
                    >
                        <VideoProtonsIcon className="w-5 h-5" />
                        <span>Vídeo (9:16)</span>
                    </button>
                </div>

                {/* Final Result Container */}
                <div>
                     <h3 className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">Resultado do Experimento</h3>
                     <div className="w-full aspect-video md:aspect-square bg-panel rounded-2xl border border-border flex items-center justify-center overflow-hidden relative group shadow-inner">
                        {isLoading ? (
                             <div className="flex flex-col items-center">
                                <div className="w-10 h-10 border-4 border-highlight border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm font-bold text-highlight animate-pulse">Sintetizando Dados...</p>
                            </div>
                        ) : error ? (
                             <div className="p-6 text-center">
                                <p className="text-danger font-bold">Falha na Fusão</p>
                                <p className="text-xs text-text-secondary mt-1">{error}</p>
                            </div>
                        ) : resultImage ? (
                            <>
                                <img src={`data:${resultImage.mimeType};base64,${resultImage.base64}`} alt="Resultado King Lab" className="w-full h-full object-contain"/>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                    <button 
                                        onClick={() => handleDownload(resultImage)}
                                        className="p-3 bg-highlight text-black rounded-full hover:scale-110 transition-transform shadow-xl"
                                        title="Baixar Resultado"
                                    >
                                        <DownloadIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </>
                        ) : lastMessage?.videoUrl ? (
                            <video src={lastMessage.videoUrl} controls autoPlay loop muted className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center opacity-20 group-hover:opacity-30 transition-opacity">
                                <KingLabIcon className="w-20 h-20 mx-auto mb-2"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Aguardando Processamento</p>
                            </div>
                        )}
                     </div>
                </div>

            </div>
        </div>
    );
};

export default KingLabView;