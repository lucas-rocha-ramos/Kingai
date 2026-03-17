import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIMode, ChatSession, GeneratedImage, HumanKingProfile, MessageSender, Message, GenerationTools } from '../types';
import { HumanKingIcon, SparklesIcon, TrashIcon, RefreshIcon, PhotoIcon, VideoProtonsIcon, XMarkIcon, PlusIcon } from './Icons';
import { generateHumanFromDescription } from '../services/geminiService';
import { MessageItem } from './MessageItem';

interface HumanKingViewProps {
  activeChatSession: ChatSession;
  isLoading: boolean;
  onClearChat: (chatId: string) => void;
  humanKingProfile: HumanKingProfile | null;
  onSaveHuman: (profile: HumanKingProfile) => void;
  onDeleteHuman: () => void;
  apiKeyStatus?: 'unknown' | 'ok' | 'not_set';
  onConfigureApiKey?: () => void;
  onSendMessage: (
    inputText: string, 
    imageGenerationPrompt?: string, 
    userImages?: { base64: string; mimeType: string }[],
    userAudio?: { base64: string; mimeType: string },
    trueOriginalUserImagePromptForVariation?: string, 
    numberOfImages?: number,
    tools?: GenerationTools,
    imageSource?: 'upload' | 'canvas',
    isSuperPrompt?: boolean,
    overrideAspectRatio?: string,
    maskImage?: { base64: string; mimeType: string; }
  ) => void;
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

const HumanCreationView: React.FC<{
    onSaveHuman: (profile: HumanKingProfile) => void;
}> = ({ onSaveHuman }) => {
    const [step, setStep] = useState<'form' | 'generating' | 'selection'>('form');
    const [description, setDescription] = useState({ appearance: '', personality: '', style: '' });
    const [generatedOptions, setGeneratedOptions] = useState<GeneratedImage[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!description.appearance.trim()) {
            alert('A descrição da aparência é obrigatória.');
            return;
        }
        setStep('generating');
        setError(null);
        setSelectedIndex(null);
        
        const result = await generateHumanFromDescription(description);

        if (result.error || !result.images || result.images.length === 0) {
            setError(result.error || "A IA não conseguiu gerar as opções de modelo. Tente novamente.");
            setStep('form');
        } else {
            setGeneratedOptions(result.images);
            setStep('selection');
        }
    };

    const handleSave = () => {
        if (selectedIndex === null) return;
        const selectedImage = generatedOptions[selectedIndex];
        const newProfile: HumanKingProfile = {
            id: uuidv4(),
            characterSheet: selectedImage.originalUserPrompt || 'N/A',
            imagePrompt: selectedImage.prompt,
            baseImage: {
                base64: selectedImage.base64,
                mimeType: selectedImage.mimeType,
            },
            createdAt: new Date(),
        };
        onSaveHuman(newProfile);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-3xl">
                {error && <div className="p-3 bg-danger/20 text-danger text-center rounded-lg mb-4">{error}</div>}
                {step === 'form' && (
                    <>
                        <HumanKingIcon className="w-16 h-16 mx-auto text-highlight mb-4"/>
                        <h2 className="text-xl font-semibold text-text-primary text-center">Crie seu Humano Hiper-realista</h2>
                        <p className="text-center text-text-secondary mb-6">Descreva a pessoa para a IA dar vida a ela com o máximo de realismo.</p>
                        <div className="space-y-4">
                            <textarea value={description.appearance} onChange={e => setDescription(d => ({...d, appearance: e.target.value}))} placeholder="Aparência física (rosto, cabelo, corpo, etnia, etc.) *" className="w-full p-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar" rows={3}/>
                            <textarea value={description.personality} onChange={e => setDescription(d => ({...d, personality: e.target.value}))} placeholder="Personalidade e humor (sério, alegre, misterioso...)" className="w-full p-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar" rows={2}/>
                            <textarea value={description.style} onChange={e => setDescription(d => ({...d, style: e.target.value}))} placeholder="Estilo de roupa e acessórios (moderno, fantasia, casual...)" className="w-full p-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar" rows={2}/>
                        </div>
                        <button onClick={handleGenerate} className="w-full mt-6 py-3 bg-highlight text-black font-semibold rounded-lg hover:bg-highlight-hover transition-colors">Gerar Opções</button>
                    </>
                )}
                {step === 'generating' && (
                     <div className="text-center text-text-secondary">
                        <div className="w-12 h-12 mx-auto border-4 border-highlight border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="font-semibold text-text-primary">Criando seu modelo humano...</p>
                        <p className="text-sm">Isso pode levar um momento.</p>
                    </div>
                )}
                 {step === 'selection' && (
                    <>
                        <h2 className="text-xl font-semibold text-text-primary text-center">Selecione seu Modelo</h2>
                        <p className="text-center text-text-secondary mb-6">Clique na imagem que mais gostou para salvar.</p>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {generatedOptions.map((img, index) => (
                                <button key={img.id} onClick={() => setSelectedIndex(index)} className={`block w-full rounded-lg overflow-hidden border-4 transition-all duration-200 ${selectedIndex === index ? 'border-highlight shadow-2xl' : 'border-transparent hover:border-highlight/50'}`}>
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Opção de Modelo ${index + 1}`} className="w-full h-full object-cover"/>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-4">
                             <button onClick={handleGenerate} className="flex-1 py-3 bg-surface text-text-primary font-semibold rounded-lg hover:bg-border transition-colors">Gerar Novamente</button>
                             <button onClick={handleSave} disabled={selectedIndex === null} className="flex-1 py-3 bg-highlight text-black font-semibold rounded-lg hover:bg-highlight-hover transition-colors disabled:opacity-50">Salvar Modelo</button>
                        </div>
                    </>
                 )}
            </div>
        </div>
    )
};

const ModelDetailsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    profile: HumanKingProfile;
    onDeleteHuman: () => void;
}> = ({ isOpen, onClose, profile, onDeleteHuman }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-surface rounded-lg shadow-xl w-full max-w-md text-text-primary relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 pb-4 flex justify-between items-center flex-shrink-0 border-b border-border">
                    <h2 className="text-xl font-semibold text-text-primary">Meu Modelo Humano</h2>
                    <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded-full"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                    <img src={`data:${profile.baseImage.mimeType};base64,${profile.baseImage.base64}`} alt="Modelo Salvo" className="w-full rounded-md object-contain" />
                    <div>
                        <h3 className="font-semibold text-text-primary mb-2">Ficha do Personagem</h3>
                        <pre className="text-sm text-text-secondary bg-panel p-3 rounded-md max-h-60 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-sans">{profile.characterSheet}</pre>
                    </div>
                </div>
                <div className="p-6 pt-4 border-t border-border flex-shrink-0">
                     <button onClick={onDeleteHuman} className="w-full py-2 bg-danger/10 text-danger font-semibold rounded-lg hover:bg-danger/20 transition-colors flex items-center justify-center gap-2">
                        <TrashIcon className="w-5 h-5"/> Excluir Modelo
                    </button>
                </div>
            </div>
        </div>
    );
};

const HumanSceneView: React.FC<HumanKingViewProps> = (props) => {
    const { activeChatSession, humanKingProfile, onSendMessage, isLoading } = props;
    const [scenePrompt, setScenePrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
    const [canvases, setCanvases] = useState([{ id: uuidv4(), image: null }]);

    useEffect(() => {
        if (activeChatSession.messages.length === 0) {
             setCanvases([{ id: uuidv4(), image: null }]);
        }
    }, [activeChatSession.messages]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatSession.messages]);

    useEffect(() => {
        const allFilled = canvases.every(c => c.image !== null);
        if (allFilled && canvases.length < 3) {
            setCanvases(prev => [...prev, { id: uuidv4(), image: null }]);
        }
    }, [canvases]);

    if (!humanKingProfile) return null;
    
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
            if (emptyCanvases.length > 1 && newCanvases.length > 1) {
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

    const handleGenerate = async (type: 'image' | 'video') => {
        if (!scenePrompt.trim()) {
            alert("Por favor, descreva a cena.");
            return;
        }
        const referenceImages = canvases.map(c => c.image).filter((img): img is { base64: string, mimeType: string } => img !== null);
        const userImages = [
            { base64: humanKingProfile.baseImage.base64, mimeType: humanKingProfile.baseImage.mimeType },
            ...referenceImages
        ];
        const promptWithPrefix = `[HUMAN_KING_${type.toUpperCase()}]${scenePrompt}`;
        onSendMessage(promptWithPrefix, undefined, userImages);
        setScenePrompt('');
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto custom-scrollbar">
            {/* Left Column - Studio */}
            <div className="w-full lg:w-[450px] flex-shrink-0 space-y-4">
                {/* Model */}
                <div>
                    <h3 className="text-sm font-semibold text-text-secondary mb-2">MODELO HUMANO + REFERÊNCIAS</h3>
                    <div className="flex items-start gap-4 pb-2 overflow-x-auto custom-scrollbar">
                        <div className="flex-shrink-0 w-32 h-32 relative">
                            <img src={`data:${humanKingProfile.baseImage.mimeType};base64,${humanKingProfile.baseImage.base64}`} alt="Modelo Humano" className="w-full h-full object-cover rounded-lg border-2 border-highlight"/>
                            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-highlight text-black text-xs font-bold rounded">MODELO</div>
                        </div>
                        <PlusIcon className="w-6 h-6 text-text-secondary flex-shrink-0 mt-12" />
                        {canvases.map((canvas) => (
                            <div key={canvas.id} className="flex-shrink-0 w-32 h-32">
                                <input
                                    type="file" accept="image/*" className="hidden"
                                    ref={el => { if(el) fileInputRefs.current[canvas.id] = el; }}
                                    onChange={(e) => handleFileChange(e, canvas.id)}
                                />
                                {canvas.image ? (
                                    <div className="relative group w-full h-full">
                                        <img src={`data:${canvas.image.mimeType};base64,${canvas.image.base64}`} alt="Referência" className="w-full h-full object-cover rounded-lg border-2 border-border"/>
                                        <button onClick={() => removeCanvasImage(canvas.id)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Remover Imagem">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRefs.current[canvas.id]?.click()} className="w-full h-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-panel hover:border-highlight transition-colors">
                                        <PhotoIcon className="w-8 h-8"/>
                                        <span className="text-xs mt-2 text-center">Adicionar<br/>Referência</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Prompt */}
                <div className="flex-1 flex flex-col">
                    <label htmlFor="scene-prompt" className="text-sm font-semibold text-text-secondary mb-2">DESCRIÇÃO DA CENA</label>
                    <textarea 
                        id="scene-prompt"
                        value={scenePrompt} 
                        onChange={e => setScenePrompt(e.target.value)} 
                        placeholder="Ex: o modelo na praia da segunda imagem, com o chapéu da terceira" 
                        className="w-full flex-grow p-3 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar" 
                        rows={5}
                    />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                    <button onClick={() => handleGenerate('image')} disabled={isLoading || !scenePrompt.trim()} className="w-full py-3 bg-highlight text-black font-semibold rounded-lg hover:bg-highlight-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        <PhotoIcon className="w-5 h-5"/>Gerar Imagem
                    </button>
                    <button onClick={() => handleGenerate('video')} disabled={isLoading || !scenePrompt.trim()} className="w-full py-3 bg-highlight/70 text-black font-semibold rounded-lg hover:bg-highlight-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        <VideoProtonsIcon className="w-5 h-5"/>Gerar Vídeo
                    </button>
                </div>
            </div>

            {/* Right Column - Gallery */}
            <div className="flex-1 bg-panel rounded-lg border border-border overflow-hidden flex flex-col">
                <div className="p-3 border-b border-border flex-shrink-0">
                    <h3 className="text-md font-semibold text-text-primary">Galeria de Cenas</h3>
                </div>
                {activeChatSession.messages.length > 0 ? (
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                        {activeChatSession.messages.map(msg => (
                            <div key={msg.id} className="w-full">
                                <MessageItem message={msg} currentMode={AIMode.HumanKing} onStartVariation={()=>{}} onGenerateSvgForImage={()=>{}} onOpenImagePreview={()=>{}} onRegenerateImage={()=>{}} onFormSubmit={()=>{}} onEdit={()=>{}} onFeedback={()=>{}}/>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-center text-text-secondary p-4">
                        <div>
                            <HumanKingIcon className="w-16 h-16 mx-auto mb-2"/>
                            <p>Os resultados de suas cenas aparecerão aqui.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};

const HumanKingView: React.FC<HumanKingViewProps> = (props) => {
    const { humanKingProfile, onSaveHuman, onClearChat, onDeleteHuman, activeChatSession } = props;
    const [isModelDetailsOpen, setIsModelDetailsOpen] = useState(false);
    
    return (
        <div className="flex-1 flex flex-col bg-background min-h-0">
             <header className="p-2.5 bg-panel flex justify-between items-center h-[60px] flex-shrink-0 border-l border-border">
                <div className="flex items-center gap-3">
                    <HumanKingIcon className="w-10 h-10 rounded-full bg-border p-1.5 text-text-primary" />
                     <div>
                        <h2 className="text-md font-medium text-text-primary truncate">{AIMode.HumanKing}</h2>
                        <p className="text-xs text-text-secondary">Seu modelo humano, suas cenas</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {humanKingProfile && (
                         <button onClick={() => setIsModelDetailsOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-surface text-text-primary rounded-lg text-sm font-semibold hover:bg-border transition">
                            <HumanKingIcon className="w-5 h-5" />
                            <span>Meu Modelo</span>
                        </button>
                    )}
                    <button onClick={() => {
                        onClearChat(activeChatSession.id);
                        if (humanKingProfile) onDeleteHuman();
                    }} className="flex items-center gap-2 px-3 py-1.5 bg-surface text-text-primary rounded-lg text-sm font-semibold hover:bg-border transition">
                        <RefreshIcon className="w-5 h-5" />
                        <span>Começar do Zero</span>
                    </button>
                </div>
            </header>
            {humanKingProfile ? <HumanSceneView {...props} /> : <HumanCreationView onSaveHuman={onSaveHuman} />}
            {humanKingProfile && (
                <ModelDetailsModal
                    isOpen={isModelDetailsOpen}
                    onClose={() => setIsModelDetailsOpen(false)}
                    profile={humanKingProfile}
                    onDeleteHuman={onDeleteHuman}
                />
            )}
        </div>
    );
};

export default HumanKingView;