import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AIMode, ChatSession, ProtonsHQProfile, MessageSender, Message, GenerationTools } from '../types';
import { SparklesIcon, TrashIcon, RefreshIcon, PhotoIcon, XMarkIcon, PlusIcon, PencilIcon } from './Icons';
import { MessageItem } from './MessageItem';

interface ProtonsHQViewProps {
  activeChatSession: ChatSession;
  isLoading: boolean;
  onClearChat: (chatId: string) => void;
  protonsHQProfile: ProtonsHQProfile | null;
  onSaveProtonsHQ: (profile: ProtonsHQProfile) => void;
  onDeleteProtonsHQ: () => void;
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

const ProtonsHQSetupView: React.FC<{
    onSaveProtonsHQ: (profile: ProtonsHQProfile) => void;
    initialProfile?: ProtonsHQProfile | null;
    onCancel?: () => void;
}> = ({ onSaveProtonsHQ, initialProfile, onCancel }) => {
    const [characterImages, setCharacterImages] = useState<{ base64: string, mimeType: string }[]>(initialProfile?.characterImages || []);
    const [instructions, setInstructions] = useState(initialProfile?.instructions || '');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newImages = await Promise.all(Array.from(files).map(fileToBase64));
        setCharacterImages(prev => [...prev, ...newImages]);
    };

    const removeImage = (index: number) => {
        setCharacterImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (characterImages.length === 0) {
            alert('Adicione pelo menos uma imagem do personagem.');
            return;
        }
        const newProfile: ProtonsHQProfile = {
            id: initialProfile?.id || uuidv4(),
            characterImages,
            instructions: instructions || 'Personagem Chiquinho Guarnieri, estilo cartoon brasileiro.',
            createdAt: initialProfile?.createdAt || new Date(),
        };
        onSaveProtonsHQ(newProfile);
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fade-in overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-3xl bg-panel p-8 rounded-2xl border border-border shadow-xl my-8">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-highlight/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <SparklesIcon className="w-10 h-10 text-highlight" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">{initialProfile ? 'Editar Agente HQ' : 'Configuração Protons HQ'}</h2>
                    <p className="text-text-secondary mt-2">Defina o visual do Chiquinho Guarnieri e as regras do seu universo.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">Imagens de Referência (Banco de Conhecimento)</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                            {characterImages.map((img, idx) => (
                                <div key={idx} className="relative aspect-square group">
                                    <img src={`data:${img.mimeType};base64,${img.base64}`} alt="Ref" className="w-full h-full object-cover rounded-lg border border-border" />
                                    <button onClick={() => removeImage(idx)} className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-text-secondary hover:bg-surface hover:border-highlight transition-all group"
                            >
                                <PlusIcon className="w-8 h-8 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] mt-1 font-bold">ADICIONAR</span>
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">Instruções Adicionais (Opcional)</label>
                        <textarea 
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            placeholder="Ex: Ele sempre usa um boné azul e está sempre sorrindo..."
                            className="w-full p-4 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar min-h-[100px]"
                        />
                    </div>

                    <div className="flex gap-3">
                        {onCancel && (
                            <button 
                                onClick={onCancel}
                                className="flex-1 py-4 bg-surface text-text-primary font-bold rounded-xl hover:bg-border transition-all border border-border"
                            >
                                CANCELAR
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            disabled={characterImages.length === 0}
                            className="flex-[2] py-4 bg-highlight text-black font-bold rounded-xl hover:bg-highlight-hover transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[0.98]"
                        >
                            {initialProfile ? 'SALVAR ALTERAÇÕES' : 'INICIALIZAR AGENTE HQ'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProtonsHQSceneView: React.FC<ProtonsHQViewProps> = (props) => {
    const { activeChatSession, protonsHQProfile, onSendMessage, isLoading } = props;
    const [prompt, setPrompt] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeChatSession.messages]);

    if (!protonsHQProfile) return null;

    const handleGenerate = () => {
        if (!prompt.trim()) return;

        // Construct the system rules prompt
        const systemRules = `Você é uma GEMS especializada na criação de histórias em quadrinhos no estilo cartoon brasileiro.

FUNÇÃO
Criar HQs completas exclusivamente com base no contexto enviado na mensagem atual do usuário.

REGRA DE CONTEXTO
Utilizar apenas as informações presentes na solicitação atual.
Não acessar nem considerar histórias anteriores, salvo se o usuário escrever explicitamente: continuação, parte 2, continuar a história.

PERSONAGEM PRINCIPAL
Chiquinho Guarnieri é o personagem central.
A aparência do personagem deve ser baseada exclusivamente nas imagens de referência já armazenadas no conhecimento do agente.
Aparência deve manter obrigatoriamente: Consistência de cabelo, roupas, traços estilizados e cores em todos os quadros.

FORMATO E DIAGRAMAÇÃO OBRIGATÓRIA (GRID 3x2)
A página da HQ deve conter exatamente 6 quadros (panels).
Organização obrigatória: 3 linhas horizontais, 2 colunas verticais.
Todos os quadros devem obrigatoriamente:
1. Ser retangulares verticais (Portrait).
2. Ter proporção exata 1:2 (Altura = 2x Largura).
3. Ter exatamente o mesmo tamanho entre si.
4. Estar perfeitamente alinhados em um grid limpo.
5. Ter espaçamento uniforme (gutter) entre eles.
6. Ter bordas pretas retas e paralelas.

ESTILO VISUAL
Cartoon brasileiro clássico, cores vibrantes, traços limpos e expressivos.

RESPOSTA FINAL
Entregar somente a imagem final da HQ (a página completa). Não incluir texto explicativo fora da imagem.`;

        const fullPrompt = `[PROTONS_HQ]${prompt}\n\nREGRAS ADICIONAIS:\n${systemRules}\n\nINSTRUÇÕES DO PERSONAGEM:\n${protonsHQProfile.instructions}`;
        
        onSendMessage(fullPrompt, undefined, protonsHQProfile.characterImages);
        setPrompt('');
    };

    return (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 overflow-hidden">
            {/* Left: Controls */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6 flex-shrink-0">
                <div className="bg-panel p-6 rounded-2xl border border-border shadow-lg space-y-6">
                    <div>
                        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-4">Conhecimento do Agente</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {protonsHQProfile.characterImages.map((img, idx) => (
                                <img key={idx} src={`data:${img.mimeType};base64,${img.base64}`} alt="Ref" className="w-16 h-16 object-cover rounded-lg border border-border flex-shrink-0" />
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Roteiro da HQ</label>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder="Descreva a história que Chiquinho Guarnieri vai viver hoje..."
                            className="w-full p-4 bg-surface border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-highlight text-text-primary custom-scrollbar min-h-[150px]"
                        />
                    </div>

                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full py-4 bg-highlight text-black font-bold rounded-xl hover:bg-highlight-hover transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transform active:scale-[0.98]"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        GERAR HQ COMPLETA
                    </button>
                </div>

                <div className="bg-panel/50 p-4 rounded-xl border border-border/50">
                    <h4 className="text-[10px] font-bold text-text-secondary uppercase mb-2">Dica de Formato</h4>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                        O modelo gerará uma página com 6 quadros (3x2) em proporção vertical 1:2 para cada quadro, seguindo o estilo cartoon brasileiro.
                    </p>
                </div>
            </div>

            {/* Right: Gallery */}
            <div className="flex-1 bg-panel rounded-2xl border border-border overflow-hidden flex flex-col shadow-inner">
                <div className="p-4 border-b border-border flex justify-between items-center bg-surface/30">
                    <h3 className="font-bold text-text-primary flex items-center gap-2">
                        <PhotoIcon className="w-5 h-5 text-highlight" />
                        Galeria de HQs
                    </h3>
                    {activeChatSession.messages.length > 0 && (
                        <span className="text-[10px] bg-highlight/20 text-highlight px-2 py-1 rounded-full font-bold">
                            {activeChatSession.messages.filter(m => m.sender === 'ai').length} PÁGINAS GERADAS
                        </span>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/5">
                    {activeChatSession.messages.length > 0 ? (
                        <>
                            {activeChatSession.messages.map(msg => (
                                <div key={msg.id} className="max-w-2xl mx-auto">
                                    <MessageItem 
                                        message={msg} 
                                        currentMode={AIMode.ProtonsHQ} 
                                        onStartVariation={()=>{}} 
                                        onGenerateSvgForImage={()=>{}} 
                                        onOpenImagePreview={()=>{}} 
                                        onRegenerateImage={()=>{}} 
                                        onFormSubmit={()=>{}} 
                                        onEdit={()=>{}} 
                                        onFeedback={()=>{}}
                                    />
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary opacity-50">
                            <SparklesIcon className="w-16 h-16 mb-4" />
                            <p className="max-w-xs">Suas histórias em quadrinhos aparecerão aqui após a geração.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProtonsHQView: React.FC<ProtonsHQViewProps> = (props) => {
    const { protonsHQProfile, onSaveProtonsHQ, onClearChat, onDeleteProtonsHQ, activeChatSession } = props;
    const [isEditing, setIsEditing] = useState(false);
    
    const handleSaveAndClose = (profile: ProtonsHQProfile) => {
        onSaveProtonsHQ(profile);
        setIsEditing(false);
    };

    return (
        <div className="flex-1 flex flex-col bg-background min-h-0">
             <header className="px-6 bg-panel flex justify-between items-center h-[70px] flex-shrink-0 border-b border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-highlight flex items-center justify-center text-black">
                        <SparklesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary leading-tight">Protons HQ</h2>
                        <p className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">Agente Especializado em Cartoon Brasileiro</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {protonsHQProfile && (
                        <>
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-xl text-xs font-bold hover:bg-border transition-all border border-border"
                            >
                                <PencilIcon className="w-4 h-4" />
                                <span>EDITAR AGENTE</span>
                            </button>
                            <button 
                                onClick={() => {
                                    if (confirm('Deseja realmente resetar o Agente HQ? Isso apagará o banco de conhecimento.')) {
                                        onDeleteProtonsHQ();
                                    }
                                }} 
                                className="flex items-center gap-2 px-4 py-2 bg-danger/10 text-danger rounded-xl text-xs font-bold hover:bg-danger/20 transition-all"
                            >
                                <TrashIcon className="w-4 h-4" />
                                <span>RESETAR</span>
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => onClearChat(activeChatSession.id)} 
                        className="flex items-center gap-2 px-4 py-2 bg-surface text-text-primary rounded-xl text-xs font-bold hover:bg-border transition-all border border-border"
                    >
                        <RefreshIcon className="w-4 h-4" />
                        <span>NOVA HISTÓRIA</span>
                    </button>
                </div>
            </header>
            
            {protonsHQProfile && !isEditing ? (
                <ProtonsHQSceneView {...props} />
            ) : (
                <ProtonsHQSetupView 
                    onSaveProtonsHQ={handleSaveAndClose} 
                    initialProfile={protonsHQProfile}
                    onCancel={protonsHQProfile ? () => setIsEditing(false) : undefined}
                />
            )}
        </div>
    );
};

export default ProtonsHQView;
