
import React, { useRef, useEffect, useState, memo, useCallback, useMemo } from 'react';
import { 
    Bot, Search, MoreVertical, Eraser, Sparkles, 
    Brush, Layout, MessageSquare, User, 
    Image as ImageIcon, Video, Wand2, FlaskConical,
    Scissors, Palette, ChevronDown, ChevronUp,
    Download, Share2, Copy, ThumbsUp, ThumbsDown,
    RotateCcw, Code, ExternalLink, Maximize2,
    Key, Video as VideoIcon, Settings, Trash2, UserCircle, Send, UploadCloud, Download as DownloadIcon, X, Eye, EyeOff, Check, RefreshCw, Layers, User as UserIcon, HelpCircle, Menu, Pencil
} from 'lucide-react';
import { Message, AIMode, ChatSession, Agent, GenerationTools, GeneratedImage, VisagistaResult, HumanKingProfile, ProtonsHQProfile } from '../types'; 
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { 
    AgentModeIcon, ProtonsIcon, AnimatedProtonsLogo, CameoIcon
} from './Icons';
import { SUGGESTION_CHIPS_BY_MODE } from '../constants';
import { analyzeImageForNanoStudio, performImageEdit, searchImageInspiration, extractLayersForExport, replicateStyleAndPersonalize } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { NanoStudioWorkflow } from '../types';
import VisagistaView from './VisagistaView';
import KingLabView from './KingLabView';
import HumanKingView from './HumanKingView';
import ProtonsHQView from './ProtonsHQView';

interface ChatViewProps {
  activeChatSession?: ChatSession; 
  agents: Agent[]; 
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
  onSendPreGenerated: (prompt: string, image: GeneratedImage) => void;
  onFormSubmit: (messageId: string, formData: { [key: string]: string }) => void;
  isLoading: boolean;
  onStartVariation: (message: Message, imageIndex: number) => void;
  onGenerateSvgForImage: (messageId: string, imageIndex: number) => void; 
  onRegenerateImage: (messageId: string, imageIndex: number) => void;
  onOpenImagePreview: (images: GeneratedImage[], startIndex: number) => void;
  onEditMessage: (chatId: string, messageId: string, newText: string) => void;
  onMessageFeedback: (chatId: string, messageId: string, feedback: 'liked' | 'disliked') => void;
  pendingVariationInput?: { 
    enhancedPrompt: string;
    referenceImageBase64?: string; 
    referenceImageMimeType?: string; 
    lineageOriginalUserPrompt?: string;
  } | null;
  superPromptStatus: 'idle' | 'describing' | 'awaiting_user_feedback' | 'unifying';
  onClearChat: (chatId: string) => void;
  onNewChat: (mode: AIMode) => void;
  onOpenCreateAgentModal: () => void;
  onOpenCanvasModal: () => void;
  onChangeMode?: (chatId: string, newMode: AIMode) => void;
  onTogglePhotoShootMode: (chatId: string) => void;
  onOpenCameoModal: () => void;
  apiKeyStatus?: 'unknown' | 'ok' | 'not_set';
  onConfigureApiKey?: () => void;

  // Visagista Props
  onVisagistaAnalysis: (prompt: string, image: { base64: string, mimeType: string }) => void;
  isVisagistaLoading: boolean;
  visagistaLoadingMessage: string;
  isCanvasOpen: boolean;
  setIsCanvasOpen: (isOpen: boolean) => void;

  // Human King Props
  humanKingProfile: HumanKingProfile | null;
  onSaveHuman: (profile: HumanKingProfile) => void;
  onDeleteHuman: () => void;

  // Protons HQ Props
  protonsHQProfile?: ProtonsHQProfile | null;
  onSaveProtonsHQ?: (profile: ProtonsHQProfile) => void;
  onDeleteProtonsHQ?: () => void;
}

const ChatViewHeader: React.FC<{
    activeChat: ChatSession | undefined; 
    agents: Agent[];
    onClearChat: (chatId: string) => void;
    isLoading: boolean;
    onTogglePhotoShootMode: (chatId: string) => void;
    onOpenCameoModal: () => void;
    apiKeyStatus?: 'unknown' | 'ok' | 'not_set';
    onConfigureApiKey?: () => void;
    studioVersion?: '1.0' | '2.0';
    onStudioVersionChange?: (version: '1.0' | '2.0') => void;
}> = memo(({ activeChat, agents, onClearChat, isLoading, onTogglePhotoShootMode, onOpenCameoModal, apiKeyStatus, onConfigureApiKey, studioVersion, onStudioVersionChange }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!activeChat) return null;

    const agent = activeChat.agentId ? agents.find(a => a.id === activeChat.agentId) : null;
    const title = agent ? agent.name : activeChat.title;

    return (
        <header className="hidden md:flex items-center justify-between px-4 md:px-6 py-4 md:py-5 bg-black/20 backdrop-blur-3xl border-b border-white/10 sticky top-0 z-20">
            <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2.5 md:p-3 bg-white/5 rounded-xl md:rounded-2xl border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                    <Bot className="w-5 h-5 md:w-6 md:h-6 text-highlight group-hover:scale-110 transition-transform" />
                </div>
                <div>
                    <h2 className="text-lg md:text-xl font-black text-white leading-tight tracking-tight truncate max-w-[150px] md:max-w-none">{title}</h2>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-highlight rounded-full animate-pulse shadow-[0_0_8px_rgba(0,255,0,0.5)]" />
                        <p className="text-[8px] md:text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">{activeChat.mode}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {apiKeyStatus === 'not_set' && (
                    <button 
                        onClick={onConfigureApiKey}
                        className="p-2.5 text-danger hover:bg-danger/10 rounded-2xl transition-all active:scale-90 animate-pulse"
                        title="Configurar Chave de API"
                    >
                        <Key className="w-6 h-6" />
                    </button>
                )}
                <button className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                    <Search className="w-6 h-6" />
                </button>
                <div className="relative" ref={menuRef}>
                    <button onClick={() => setMenuOpen(!menuOpen)} className="p-2.5 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                        <MoreVertical className="w-6 h-6" />
                    </button>
                    {menuOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl z-30 py-3 overflow-hidden animate-fade-in">
                            <button onClick={() => { onClearChat(activeChat.id); setMenuOpen(false); }} className="w-full text-left px-6 py-4 text-sm font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                                <Eraser className="w-4 h-4 text-highlight" /> Limpar conversa
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
});

const WelcomePlaceholder: React.FC<{
    onNewChat: (mode: AIMode) => void;
    onOpenCreateAgentModal: () => void;
    onOpenCanvasModal: () => void;
}> = ({ onNewChat, onOpenCreateAgentModal, onOpenCanvasModal }) => {
    
    const suggestionCards = [
        {
            title: "Criar uma imagem",
            description: "Modo Ultra para arte avançada",
            icon: <Sparkles className="w-6 h-6 text-highlight" />,
            onClick: () => onNewChat(AIMode.Ultra),
        },
        {
            title: "Projetar um Agente",
            description: "Personalize sua própria IA",
            icon: <Bot className="w-6 h-6 text-highlight" />,
            onClick: onOpenCreateAgentModal,
        },
        {
            title: "Protons HQ",
            description: "Crie histórias em quadrinhos",
            icon: <Sparkles className="w-6 h-6 text-highlight" />,
            onClick: () => onNewChat(AIMode.ProtonsHQ),
        },
        {
            title: "Estúdio Mágico",
            description: "Transforme esboços em arte",
            icon: <Brush className="w-6 h-6 text-highlight" />,
            onClick: onOpenCanvasModal,
        },
        {
            title: "NanoStudio",
            description: "Edição de imagem profissional",
            icon: <Layout className="w-6 h-6 text-highlight" />,
            onClick: () => onNewChat(AIMode.KingStudio),
        },
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-12 max-w-7xl mx-auto w-full animate-fade-in overflow-y-auto custom-scrollbar pt-24 md:pt-12">
            <div className="w-full mb-12 md:mb-20 text-left px-2 md:px-4">
                <h1 className="text-6xl md:text-9xl font-black mb-4 md:mb-8 tracking-tighter">
                    <span className="bg-gradient-to-br from-white via-white/90 to-white/40 bg-clip-text text-transparent">Olá!</span>
                </h1>
                <h2 className="text-3xl md:text-6xl font-black text-white/10 tracking-tight leading-tight max-w-4xl uppercase">Como posso ajudar você hoje?</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 w-full px-2 md:px-4">
                {suggestionCards.map((card, index) => (
                    <button
                        key={index}
                        onClick={card.onClick}
                        className="bg-white/5 backdrop-blur-3xl p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-all duration-500 text-left group h-56 md:h-72 flex flex-col justify-between shadow-2xl relative overflow-hidden no-tap-highlight"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-highlight/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-highlight/10 transition-colors" />
                        
                        <div>
                            <p className="text-lg md:text-xl font-black text-white group-hover:text-highlight transition-colors line-clamp-2 mb-2 md:mb-4 tracking-tight leading-tight uppercase">{card.title}</p>
                            <p className="text-[10px] md:text-xs font-bold text-white/30 leading-relaxed uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">{card.description}</p>
                        </div>
                        
                        <div className="mt-auto flex justify-end">
                            <div className="p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-[1.5rem] group-hover:bg-highlight/10 group-hover:scale-110 transition-all duration-500 shadow-xl border border-white/5">
                                {React.cloneElement(card.icon as React.ReactElement, { className: 'w-5 h-5 md:w-6 md:h-6 text-highlight' })}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const SuggestionChips: React.FC<{
    mode: AIMode;
    onSendMessage: (text: string) => void;
}> = ({ mode, onSendMessage }) => {
    const suggestions = SUGGESTION_CHIPS_BY_MODE[mode] || [];
    if (suggestions.length === 0) return null;

    return (
        <div className="px-4 md:px-10 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
            {suggestions.map((suggestion, index) => (
                <button
                    key={index}
                    onClick={() => onSendMessage(suggestion)}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white/50 text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white/10 hover:text-white transition-all active:scale-95 backdrop-blur-md whitespace-nowrap"
                >
                    {suggestion}
                </button>
            ))}
        </div>
    );
};

const NanoStudioView: React.FC<ChatViewProps> = (props) => {
    const { activeChatSession, onSendMessage, onClearChat, onOpenCameoModal, apiKeyStatus, onConfigureApiKey } = props;
    const [referenceImage, setReferenceImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [currentImage, setCurrentImage] = useState<{ base64: string, mimeType: string } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [stagedUserTexts, setStagedUserTexts] = useState<{ [id: string]: string }>({});
    const [appliedUserTexts, setAppliedUserTexts] = useState<{ [id: string]: string }>({});
    
    const [stagedGeneralPrompt, setStagedGeneralPrompt] = useState('');
    
    const [stagedPeopleReplacements, setStagedPeopleReplacements] = useState<{ [personId: string]: { base64: string, mimeType: string } }>({});
    const [appliedPeopleReplacements, setAppliedPeopleReplacements] = useState<{ [personId: string]: { base64: string, mimeType: string } }>({});

    const [inspirationQuery, setInspirationQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [inspirationResults, setInspirationResults] = useState<GeneratedImage[]>([]);
    const [inspirationError, setInspirationError] = useState<string | null>(null);

    const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

    // --- King Studio 2.0 STATE ---
    const [studioVersion, setStudioVersion] = useState<'1.0' | '2.0'>('2.0');
    const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
    
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [editableElements, setEditableElements] = useState<any[]>([]);
    const [activeDrag, setActiveDrag] = useState<{ id: string; type: 'move' | 'resize'; startX: number; startY: number; startBox: { x: number; y: number; width: number; height: number; } } | null>(null);

    // --- NanoStudio Workflow (Style Replication) ---
    const [workflow, setWorkflow] = useState<NanoStudioWorkflow>({ status: 'idle' });

    // Effect to analyze the initial image when it's uploaded
    useEffect(() => {
        const latestUserMessageWithImage = [...(activeChatSession?.messages ?? [])].reverse().find(m => m.sender === 'user' && m.userImages && m.userImages.length > 0);

        if (latestUserMessageWithImage?.userImages && !referenceImage) {
            const img = latestUserMessageWithImage.userImages[0];
            setReferenceImage(img);
            setCurrentImage(img);
            setIsAnalyzing(true);
            setError(null);
            setAnalysis(null);
            setEditableElements([]);

            analyzeImageForNanoStudio(img.base64, img.mimeType).then(result => {
                if ('error' in result) {
                    setError(`Análise da IA falhou: ${result.error}`);
                    setAnalysis(null);
                } else {
                    setAnalysis(result);
                    const initialTexts = result.texts.reduce((acc: any, t: any) => {
                        acc[t.id] = t.content;
                        return acc;
                    }, {});
                    setStagedUserTexts(initialTexts);
                    setAppliedUserTexts(initialTexts);
                    const allElements = [...(result.people || []), ...(result.texts || []), ...(result.objects || [])];
                    setEditableElements(allElements);
                }
            }).catch(err => {
                console.error("Erro na análise da imagem:", err);
                setError("Ocorreu um erro inesperado ao analisar a imagem.");
            }).finally(() => {
                setIsAnalyzing(false);
            });
        }
    }, [activeChatSession?.messages, referenceImage]);

    // Check if there are any un-applied changes
    const hasChanges = useMemo(() => {
        if (!analysis) return false;
        if (stagedGeneralPrompt.trim() !== '') return true;
        if (Object.keys(stagedPeopleReplacements).length > 0) return true;
        
        for (const textId in stagedUserTexts) {
            if (stagedUserTexts[textId] !== appliedUserTexts[textId]) {
                return true;
            }
        }

        const originalElements = [...(analysis.people || []), ...(analysis.texts || []), ...(analysis.objects || [])];
        if (editableElements.length !== originalElements.length) return true;

        for (const editedEl of editableElements) {
            const originalEl = originalElements.find(o => o.id === editedEl.id);
            if (!originalEl) return true;
            const ob = originalEl.boundingBox;
            const eb = editedEl.boundingBox;
            if (!ob || !eb) continue;
            if (Math.abs(ob.x - eb.x) > 0.001 || Math.abs(ob.y - eb.y) > 0.001 || Math.abs(ob.width - eb.width) > 0.001 || Math.abs(ob.height - eb.height) > 0.001) {
                return true;
            }
        }

        return false;
    }, [stagedUserTexts, appliedUserTexts, stagedPeopleReplacements, stagedGeneralPrompt, analysis, editableElements]);
    
    const selectedLayerIdData = useMemo(() => {
        if (!selectedLayerId) return null;
        return editableElements.find(layer => layer.id === selectedLayerId);
    }, [selectedLayerId, editableElements]);


    const handleApplyAllChanges = async () => {
        if (!currentImage || !hasChanges || !analysis) return;
        setIsEditing(true);
        setError(null);
    
        const editInstructions: string[] = [];
        const originalElements = [...(analysis.people || []), ...(analysis.texts || []), ...(analysis.objects || [])];
        const additionalImagesForInsertion: { base64: string; mimeType: string; }[] = [];
    
        // Check for deleted layers
        for (const originalEl of originalElements) {
            const stillExists = editableElements.some(el => el.id === originalEl.id);
            if (!stillExists) {
                editInstructions.push(`REMOVA completamente o elemento "${originalEl.content || originalEl.description}" da imagem. Preencha o espaço vazio de forma realista com o fundo.`);
            }
        }

        for (const editedEl of editableElements) {
            const originalEl = originalElements.find(o => o.id === editedEl.id);
            
            const eb = editedEl.boundingBox;
            const newBoxString = `na bounding box {x: ${eb.x.toFixed(4)}, y: ${eb.y.toFixed(4)}, width: ${eb.width.toFixed(4)}, height: ${eb.height.toFixed(4)}}`;

            if (!originalEl) {
                // It's a new layer
                if (editedEl.content !== undefined) {
                    const content = stagedUserTexts[editedEl.id] || 'Novo Texto';
                    editInstructions.push(`ADICIONE um novo elemento de texto com o conteúdo "${content}" ${newBoxString}. Use um estilo que combine com o design geral.`);
                }
                continue;
            }
    
            const ob = originalEl.boundingBox;
            const boxChanged = Math.abs(ob.x - eb.x) > 0.001 || Math.abs(ob.y - eb.y) > 0.001 || Math.abs(ob.width - eb.width) > 0.001 || Math.abs(ob.height - eb.height) > 0.001;
    
            if (editedEl.content !== undefined) { // It's a text element
                const textChanged = stagedUserTexts[editedEl.id] !== appliedUserTexts[editedEl.id];
                if (textChanged || boxChanged) {
                    let instruction = `Para o texto original "${originalEl.content}", `;
                    if (textChanged) instruction += `altere o conteúdo para "${stagedUserTexts[editedEl.id]}"`;
                    if (textChanged && boxChanged) instruction += " e ";
                    if (boxChanged) instruction += `mova e redimensione-o para se ajustar perfeitamente ${newBoxString}`;
                    instruction += `. Replique sua aparência original: ${originalEl.fontDescription}, incluindo efeitos como '${originalEl.effects}'.`;
                    editInstructions.push(instruction);
                }
            } else if (editedEl.clothingAndPoseDescription !== undefined) { // It's a person element
                const personReplaced = !!stagedPeopleReplacements[editedEl.id];
                if (personReplaced) {
                    const replacementImage = stagedPeopleReplacements[editedEl.id];
                    additionalImagesForInsertion.push(replacementImage);
                    let instruction = `Substitua a pessoa '${originalEl.description}' pela pessoa da ${additionalImagesForInsertion.length}ª imagem adicional.`;
                    instruction += ` A nova pessoa DEVE ser cortada, dimensionada e enquadrada para ocupar exatamente o espaço e proporção ${newBoxString}.`;
                    instruction += ` **Instrução crítica: A nova pessoa deve adotar a mesma pose da pessoa original. Copie a pose da pessoa que está sendo substituída e aplique-a de forma realista na pessoa da nova foto.**`;
                    instruction += ` Mantenha a composição visual idêntica (mesmo zoom, mesmo corte). Replique o estilo de mesclagem original precisamente: **${originalEl.blendingDescription}**. Garanta que a iluminação na nova pessoa corresponda perfeitamente à cena.`;
                    editInstructions.push(instruction);
                } else if (boxChanged) {
                    let instruction = `Mova e redimensione a pessoa '${originalEl.description}' para que ela se ajuste perfeitamente ${newBoxString}. Mantenha a pessoa e o fundo intactos, apenas alterando sua posição e tamanho.`;
                    editInstructions.push(instruction);
                }
            } else { // It's an object element
                 if (boxChanged) {
                    let instruction = `Mova e redimensione o objeto '${originalEl.description}' para que ele se ajuste perfeitamente ${newBoxString}. Mantenha o objeto e o fundo intactos, apenas alterando sua posição e tamanho.`;
                    editInstructions.push(instruction);
                }
            }
        }
        
        if (stagedGeneralPrompt.trim()) {
            editInstructions.push(stagedGeneralPrompt.trim());
        }
    
        if (editInstructions.length === 0) {
            setIsEditing(false);
            return;
        }
        
        const finalPrompt = editInstructions.join('\n- ');
    
        // FIX: Cast finalResult as any to solve 'unknown' property access errors
        const finalResult = (await performImageEdit({
            baseImage: currentImage,
            prompt: finalPrompt,
            additionalImages: additionalImagesForInsertion.length > 0 ? additionalImagesForInsertion : undefined,
            analysis: analysis
        })) as any;
    
        // FIX: Handle narrowed properties using casted finalResult
        if (finalResult.error) {
            setError(finalResult.error || "A IA não pôde gerar a imagem final.");
        } else if (finalResult.image) {
            const resultImg = finalResult.image;
            setCurrentImage({ base64: resultImg.base64, mimeType: resultImg.mimeType });
            setAppliedUserTexts(stagedUserTexts);
            setAppliedPeopleReplacements(prev => ({...prev, ...stagedPeopleReplacements}));
            setStagedPeopleReplacements({});
            setStagedGeneralPrompt('');
            setSelectedLayerId(null);
            
            analyzeImageForNanoStudio(resultImg.base64, resultImg.mimeType).then((newAnalysis: any) => {
                if (!('error' in newAnalysis)) {
                    setAnalysis(newAnalysis);
                    const allElements = [...(newAnalysis.people || []), ...(newAnalysis.texts || []), ...(newAnalysis.objects || [])];
                    setEditableElements(allElements);
                }
            });
        }
        setIsEditing(false);
    };

    const handlePersonImageUpload = (event: React.ChangeEvent<HTMLInputElement>, personId: string) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            const replacementImage = { base64, mimeType: file.type };
            setStagedPeopleReplacements(prev => ({ ...prev, [personId]: replacementImage }));
            setEditableElements(prev => prev.map(el => 
                el.id === personId 
                    ? { ...el, replacementPreview: replacementImage }
                    : el
            ));
        };
        reader.readAsDataURL(file);
    };
    
    const handleResetChanges = () => {
        setStagedUserTexts(appliedUserTexts);
        setStagedPeopleReplacements({});
        setStagedGeneralPrompt('');
        
        const originalElements = [...(analysis.people || []), ...(analysis.texts || []), ...(analysis.objects || [])];
        const elementsWithPersistedReplacements = originalElements.map(el => {
            const appliedReplacement = appliedPeopleReplacements[el.id];
            if (appliedReplacement) {
                return { ...el, replacementPreview: appliedReplacement };
            }
            return el;
        });

        setEditableElements(elementsWithPersistedReplacements);
    };

    const handleStartOver = () => {
        setReferenceImage(null);
        setCurrentImage(null);
        setAnalysis(null);
        setAppliedPeopleReplacements({});
        setStagedPeopleReplacements({});
        setAppliedUserTexts({});
        setStagedUserTexts({});
        setStagedGeneralPrompt('');
        setError(null);
        setIsAnalyzing(false);
        setIsEditing(false);
        setInspirationQuery('');
        setIsSearching(false);
        setInspirationResults([]);
        setInspirationError(null);
        setStudioVersion('2.0');
        setSelectedLayerId(null);
        setEditableElements([]);
        setActiveDrag(null);
        if (activeChatSession) {
            onClearChat(activeChatSession.id);
        }
    };
    
    const handleVersionChange = (version: '1.0' | '2.0') => {
        setStudioVersion(version);
        setSelectedLayerId(null);
    };
    
    // --- Drag and Resize Handlers ---
    const handleDragStart = (e: React.MouseEvent, id: string, type: 'move' | 'resize') => {
        e.preventDefault();
        e.stopPropagation();
        if (!imageContainerRef.current) return;

        const element = editableElements.find(el => el.id === id);
        if (!element) return;
        
        setActiveDrag({
            id,
            type,
            startX: e.clientX,
            startY: e.clientY,
            startBox: { ...element.boundingBox }
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!activeDrag || !imageContainerRef.current) return;
        e.preventDefault();

        const containerRect = imageContainerRef.current.getBoundingClientRect();
        const deltaX = (e.clientX - activeDrag.startX) / containerRect.width;
        const deltaY = (e.clientY - activeDrag.startY) / containerRect.height;
        
        setEditableElements(prev => prev.map(el => {
            if (el.id === activeDrag.id) {
                const newBox = { ...activeDrag.startBox };
                if (activeDrag.type === 'move') {
                    newBox.x = activeDrag.startBox.x + deltaX;
                    newBox.y = activeDrag.startBox.y + deltaY;
                } else { // resize
                    newBox.width = Math.max(0.01, activeDrag.startBox.width + deltaX);
                    newBox.height = Math.max(0.01, activeDrag.startBox.height + deltaY);
                }
                return { ...el, boundingBox: newBox };
            }
            return el;
        }));
    }, [activeDrag]);

    const handleMouseUp = useCallback(() => {
        setActiveDrag(null);
    }, []);

    useEffect(() => {
        if (activeDrag) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [activeDrag, handleMouseMove, handleMouseUp]);

    const handleInspirationSearch = async () => {
        if (!inspirationQuery.trim() || isSearching) return;
        setIsSearching(true);
        setInspirationError(null);
        setInspirationResults([]);

        const result: any = await searchImageInspiration(inspirationQuery);

        if (result.error) {
            setInspirationError(result.error || "Falha ao buscar inspirações.");
        } else if (result.images) {
            setInspirationResults(result.images);
        }
        setIsSearching(false);
    };

    const handleInspirationImageSelect = (image: GeneratedImage) => {
        const selectedImage = { base64: image.base64, mimeType: image.mimeType };
        
        setReferenceImage(selectedImage);
        setCurrentImage(selectedImage);
        setIsAnalyzing(true);
        setError(null);
        setAnalysis(null);
        
        setInspirationResults([]);
        setInspirationQuery('');
        setInspirationError(null);

        analyzeImageForNanoStudio(selectedImage.base64, selectedImage.mimeType).then(result => {
            if ('error' in result) {
                setError(`Análise da IA falhou: ${result.error}`);
                setAnalysis(null);
            } else {
                setAnalysis(result);
                const initialTexts = result.texts.reduce((acc: any, t: any) => {
                    acc[t.id] = t.content;
                    return acc;
                }, {});
                setStagedUserTexts(initialTexts);
                setAppliedUserTexts(initialTexts);
                const allElements = [...(result.people || []), ...(result.texts || []), ...(result.objects || [])];
                setEditableElements(allElements);
            }
        }).finally(() => {
            setIsAnalyzing(false);
        });
    };

    const handleDownloadFinalImage = () => {
        if (!currentImage) return;
        const link = document.createElement('a');
        link.href = `data:${currentImage.mimeType};base64,${currentImage.base64}`;
        link.download = `king_studio_edit.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportLayers = async () => {
        if (!currentImage || !analysis) return;
        setIsExporting(true);
        setError(null);
        try {
            const result: any = await extractLayersForExport(currentImage, analysis);
            if (result.error) {
                throw new Error(result.error || "A exportação falhou.");
            }

            for (const layer of result.layers) {
                const link = document.createElement('a');
                link.href = `data:${layer.mimeType};base64,${layer.base64}`;
                link.download = layer.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // A small delay might help browser stability with multiple downloads
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (e: any) {
            setError(e.message || "Ocorreu um erro ao exportar as camadas.");
        } finally {
            setIsExporting(false);
        }
    };


    const handleAddTextLayer = () => {
        const newId = `text_new_${Date.now()}`;
        const newLayer = {
            id: newId,
            content: 'Novo Texto',
            boundingBox: { x: 0.4, y: 0.4, width: 0.2, height: 0.05 },
            fontDescription: 'Fonte padrão, cor branca',
            effects: 'Nenhum'
        };
        setEditableElements(prev => [...prev, newLayer]);
        setStagedUserTexts(prev => ({ ...prev, [newId]: 'Novo Texto' }));
        setSelectedLayerId(newId);
    };

    const handleStartReplication = () => {
        if (!referenceImage || !analysis) return;
        setWorkflow({
            status: 'questionnaire',
            referenceImage,
            analysis,
            responses: {
                nicho: '',
                titulo: '',
                data: '',
                horario: '',
                local: '',
                outros: ''
            }
        });
    };

    const handleConfirmReplication = async () => {
        if (workflow.status !== 'questionnaire' || !workflow.referenceImage || !workflow.analysis || !workflow.responses) return;
        
        setWorkflow(prev => ({ ...prev, status: 'generating' }));
        setIsEditing(true);
        setError(null);

        try {
            const userImages = Object.values(stagedPeopleReplacements) as { base64: string, mimeType: string }[];

            const result: any = await replicateStyleAndPersonalize({
                referenceImage: workflow.referenceImage,
                analysis: workflow.analysis,
                responses: workflow.responses,
                userImages
            });

            if (result.error) {
                setError(result.error);
                setWorkflow(prev => ({ ...prev, status: 'questionnaire' }));
            } else if (result.images && result.images.length > 0) {
                const newImg = result.images[0];
                setCurrentImage({ base64: newImg.base64, mimeType: newImg.mimeType });
                setReferenceImage({ base64: newImg.base64, mimeType: newImg.mimeType });
                setWorkflow({ status: 'idle' });
                
                // Clear staged changes as they belonged to the previous image
                setStagedUserTexts({});
                setAppliedUserTexts({});
                setStagedPeopleReplacements({});
                setAppliedPeopleReplacements({});
                setStagedGeneralPrompt('');
                
                // Re-analyze the new image
                setIsAnalyzing(true);
                const newAnalysis: any = await analyzeImageForNanoStudio(newImg.base64, newImg.mimeType);
                if (!('error' in newAnalysis)) {
                    setAnalysis(newAnalysis);
                    const allElements = [...(newAnalysis.people || []), ...(newAnalysis.texts || []), ...(newAnalysis.objects || [])];
                    setEditableElements(allElements);
                }
                setIsAnalyzing(false);
            }
        } catch (e) {
            setError("Erro ao gerar arte personalizada.");
            setWorkflow(prev => ({ ...prev, status: 'questionnaire' }));
        } finally {
            setIsEditing(false);
        }
    };

    if (!activeChatSession) return null;

    if (!referenceImage) {
        return (
            <div className="flex-1 flex flex-col bg-background min-h-0 relative">
                <ChatViewHeader 
                    activeChat={activeChatSession} 
                    agents={[]} 
                    onClearChat={handleStartOver} 
                    isLoading={false} 
                    onTogglePhotoShootMode={()=>{}}
                    onOpenCameoModal={onOpenCameoModal}
                    apiKeyStatus={apiKeyStatus}
                    onConfigureApiKey={onConfigureApiKey}
                    studioVersion={studioVersion}
                    onStudioVersionChange={handleVersionChange}
                />
                <div className="flex-1 flex flex-col items-center justify-start text-center text-text-secondary p-4 overflow-y-auto custom-scrollbar">
                    {isSearching ? (
                        <div className="w-full max-w-4xl mx-auto pt-8">
                            <h3 className="text-lg font-semibold text-text-primary mb-4">Buscando inspirações para "{inspirationQuery}"...</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="aspect-square bg-panel rounded-lg animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    ) : inspirationError ? (
                        <div className="mt-8 text-danger p-4 bg-danger/10 rounded-lg">
                            <p className="font-semibold">Erro na Busca</p>
                            <p>{inspirationError}</p>
                        </div>
                    ) : inspirationResults.length > 0 ? (
                        <div className="w-full max-w-4xl mx-auto animate-fade-in pt-8">
                            <h3 className="text-lg font-semibold text-text-primary mb-2">Resultados para "{inspirationQuery}"</h3>
                            <p className="text-sm mb-4">Clique em uma imagem para começar a editar.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {inspirationResults.map(image => (
                                    <button key={image.id} onClick={() => handleInspirationImageSelect(image)} className="block w-full aspect-square rounded-lg overflow-hidden group border-2 border-transparent hover:border-highlight transition-all duration-200 shadow-lg">
                                        <img src={`data:image/png;base64,${image.base64}`} alt={image.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8">
                            <Layout className="w-16 h-16 mx-auto mb-4 text-highlight"/>
                            <h2 className="text-xl font-semibold text-text-primary">Bem-vindo ao King Studio</h2>
                            <p className="mt-2 mb-8 max-w-lg mx-auto">Envie uma imagem pelo campo abaixo para uma edição avançada, ou encontre inspiração para começar.</p>
                            
                            <div className="w-full max-w-lg mx-auto p-4 bg-panel border border-border rounded-lg">
                                <h3 className="text-lg font-semibold text-text-primary">Buscar Inspiração na Internet</h3>
                                <p className="mt-1 text-sm mb-4">Encontre um ponto de partida para sua arte.</p>
                        <div className="flex gap-2">
                            <input 
                                type="text"
                                value={inspirationQuery}
                                onChange={e => setInspirationQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleInspirationSearch()}
                                placeholder="Ex: Cartaz de show, flyer de hamburgueria..."
                                className="w-full p-2.5 bg-surface border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-highlight text-text-primary font-mono text-sm"
                            />
                            <button 
                                onClick={handleInspirationSearch} 
                                disabled={isSearching || !inspirationQuery.trim()}
                                className="p-3 bg-highlight text-black rounded-none hover:bg-highlight-hover disabled:opacity-50 transition-colors"
                                aria-label="Buscar inspiração"
                            >
                                <Search className="w-5 h-5"/>
                            </button>
                        </div>
                            </div>
                        </div>
                    )}
                </div>
                <ChatInput {...props} currentMode={AIMode.KingStudio} />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-background min-h-0">
            <ChatViewHeader 
                activeChat={activeChatSession} 
                agents={[]} 
                onClearChat={handleStartOver} 
                isLoading={isAnalyzing || isEditing} 
                onTogglePhotoShootMode={()=>{}}
                onOpenCameoModal={onOpenCameoModal}
                apiKeyStatus={apiKeyStatus}
                onConfigureApiKey={onConfigureApiKey}
                studioVersion={studioVersion}
                onStudioVersionChange={handleVersionChange}
            />
            <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
                <div ref={imageContainerRef} className="w-full lg:flex-1 flex flex-col items-center justify-center bg-panel border border-border rounded-lg p-1 relative select-none">
                    {(isAnalyzing || isEditing || isExporting || workflow.status === 'generating') && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-30 rounded-lg">
                            <div className="w-8 h-8 mx-auto border-4 border-highlight border-t-transparent rounded-full animate-spin mb-3"></div>
                            <p className="font-semibold text-sm">
                                {isAnalyzing ? 'Analisando imagem...' : 
                                 (workflow.status === 'generating' ? 'Criando sua arte personalizada...' :
                                 (isEditing ? 'Aplicando edições...' : 'Exportando camadas...'))}
                            </p>
                        </div>
                    )}
                    {currentImage && <img src={`data:${currentImage.mimeType};base64,${currentImage.base64}`} className="max-w-full max-h-full object-contain rounded-md pointer-events-none" alt="Pré-visualização da Edição" />}
                    
                    {workflow.status === 'questionnaire' && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-40 p-6 overflow-y-auto custom-scrollbar">
                            <div className="w-full max-w-md bg-panel border border-border p-6 rounded-none shadow-2xl animate-scale-in">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-highlight uppercase tracking-tighter">Personalizar Arte</h3>
                                    <button onClick={() => setWorkflow({ status: 'idle' })} className="text-text-secondary hover:text-white"><X className="w-6 h-6"/></button>
                                </div>
                                <p className="text-xs text-text-secondary mb-6 uppercase tracking-widest font-bold">Preencha os dados para sua nova arte baseada nesta referência.</p>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Nicho / Tema</label>
                                        <input 
                                            type="text" 
                                            placeholder="Ex: Hamburgueria, Show de Rock..."
                                            value={workflow.responses?.nicho || ''}
                                            onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, nicho: e.target.value } }))}
                                            className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Título Principal</label>
                                        <input 
                                            type="text" 
                                            placeholder="O nome do evento ou produto"
                                            value={workflow.responses?.titulo || ''}
                                            onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, titulo: e.target.value } }))}
                                            className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Data</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: 20 de Outubro"
                                                value={workflow.responses?.data || ''}
                                                onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, data: e.target.value } }))}
                                                className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Horário</label>
                                            <input 
                                                type="text" 
                                                placeholder="Ex: 19:00h"
                                                value={workflow.responses?.horario || ''}
                                                onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, horario: e.target.value } }))}
                                                className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Local / Endereço</label>
                                        <input 
                                            type="text" 
                                            placeholder="Onde será?"
                                            value={workflow.responses?.local || ''}
                                            onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, local: e.target.value } }))}
                                            className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-widest text-text-secondary mb-1 font-bold">Outras Informações</label>
                                        <textarea 
                                            placeholder="Preços, redes sociais, etc..."
                                            value={workflow.responses?.outros || ''}
                                            onChange={e => setWorkflow(prev => ({ ...prev, responses: { ...prev.responses!, outros: e.target.value } }))}
                                            className="w-full bg-surface border border-border p-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-highlight custom-scrollbar"
                                            rows={2}
                                        />
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button 
                                        onClick={() => setWorkflow({ status: 'idle' })}
                                        className="flex-1 py-3 border border-border text-text-secondary hover:bg-surface transition-colors uppercase tracking-widest text-[10px] font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={handleConfirmReplication}
                                        className="flex-1 py-3 bg-highlight text-black hover:bg-highlight-hover transition-colors uppercase tracking-widest text-[10px] font-bold"
                                    >
                                        Gerar Arte
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {studioVersion === '2.0' && workflow.status === 'idle' && editableElements.map(el => (
                        <div
                            key={el.id}
                            className={`absolute border-2 border-dashed transition-colors duration-200 ${selectedLayerId === el.id ? 'border-highlight' : 'border-transparent hover:border-highlight/50'} group`}
                            style={{
                                left: `${el.boundingBox.x * 100}%`,
                                top: `${el.boundingBox.y * 100}%`,
                                width: `${el.boundingBox.width * 100}%`,
                                height: `${el.boundingBox.height * 100}%`,
                                cursor: activeDrag ? (activeDrag.type === 'move' ? 'grabbing' : 'se-resize') : 'grab'
                            }}
                            onMouseDown={(e) => { handleDragStart(e, el.id, 'move'); setSelectedLayerId(el.id); }}
                            onClick={() => setSelectedLayerId(el.id)}
                        >
                           {el.replacementPreview ? (
                                <>
                                    <img 
                                        src={`data:${el.replacementPreview.mimeType};base64,${el.replacementPreview.base64}`} 
                                        className="w-full h-full object-contain pointer-events-none"
                                        alt="Pré-visualização da substituição"
                                    />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRefs.current[el.id]?.click();
                                        }}
                                        className="absolute top-1 right-1 p-1.5 bg-black/60 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Trocar imagem"
                                        onMouseDown={e => e.stopPropagation()}
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                </>
                            ) : el.content !== undefined ? ( // Text element
                                <input 
                                    type="text" 
                                    value={stagedUserTexts[el.id] || ''} 
                                    onChange={e => setStagedUserTexts(p => ({...p, [el.id]: e.target.value}))}
                                    className="w-full h-full bg-transparent text-transparent focus:text-white focus:bg-black/50 p-1 text-sm outline-none cursor-text"
                                    onMouseDown={e => e.stopPropagation()}
                                />
                            ) : (el.clothingAndPoseDescription !== undefined) ? ( // Person element
                                <button onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRefs.current[el.id]?.click();
                                }} 
                                className="w-full h-full flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                                onMouseDown={e => e.stopPropagation()}
                                >
                                    <UploadCloud className="w-4 h-4 mr-1"/> Substituir
                                </button>
                            ) : null }
                            
                            {(el.clothingAndPoseDescription !== undefined) && <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                ref={el_ref => {fileInputRefs.current[el.id] = el_ref}} 
                                onChange={(e) => handlePersonImageUpload(e, el.id)} 
                            />}

                            <div
                                className="absolute -bottom-2 -right-2 w-4 h-4 bg-highlight rounded-none cursor-se-resize border-2 border-background shadow-lg z-10"
                                onMouseDown={(e) => handleDragStart(e, el.id, 'resize')}
                            />
                        </div>
                    ))}
                </div>

                <div className="w-full lg:w-[400px] bg-panel border border-border rounded-lg flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-text-primary">Ferramentas de Edição</h3>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleStartReplication}
                                className="p-2 text-highlight hover:bg-highlight/10 rounded-lg transition-colors"
                                title="Replicar Estilo (DNA)"
                            >
                                <Sparkles className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={handleAddTextLayer}
                                className="p-2 text-highlight hover:bg-highlight/10 rounded-lg transition-colors"
                                title="Adicionar Camada de Texto"
                            >
                                <Code className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-sm text-danger p-4 border-b border-border">{error}</p>}
                    {isAnalyzing ? <div className="p-4 text-center text-text-secondary">Analisando...</div> :
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar">
                         <>
                            <h4 className="font-semibold text-text-primary mb-2">Camadas</h4>
                            <div className="space-y-1 bg-surface border border-border rounded-none max-h-48 overflow-y-auto custom-scrollbar p-1">
                                {editableElements.map((layer: any) => (
                                    <div key={layer.id} className="flex items-center gap-1 group/layer">
                                        <button onClick={() => setSelectedLayerId(layer.id)} className={`flex-1 flex items-center p-2 text-left text-sm rounded-none transition-colors ${selectedLayerId === layer.id ? 'bg-highlight/10' : 'hover:bg-highlight/5'}`}>
                                            {layer.content !== undefined ? <Pencil className="w-4 h-4 mr-2 flex-shrink-0 text-text-secondary"/> : (layer.clothingAndPoseDescription !== undefined ? <UserCircle className="w-4 h-4 mr-2 flex-shrink-0 text-text-secondary"/> : <Layers className="w-4 h-4 mr-2 flex-shrink-0 text-text-secondary"/>) }
                                            <span className="truncate">{layer.content || layer.description}</span>
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditableElements(prev => prev.filter(el => el.id !== layer.id));
                                                if (selectedLayerId === layer.id) setSelectedLayerId(null);
                                            }}
                                            className="p-2 text-text-secondary hover:text-danger opacity-0 group-hover/layer:opacity-100 transition-opacity"
                                            title="Excluir Camada"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {selectedLayerIdData && (
                                <div className="mt-4 animate-fade-in">
                                    <h4 className="font-semibold text-text-primary mb-2">Propriedades da Camada</h4>
                                    {selectedLayerIdData.content !== undefined ? ( // Text layer
                                        <textarea value={stagedUserTexts[selectedLayerIdData.id] || ''} onChange={e => setStagedUserTexts(p => ({...p, [selectedLayerIdData.id]: e.target.value}))} className="w-full p-2 bg-surface border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-highlight text-text-primary text-sm custom-scrollbar" rows={2}/>
                                    ) : (selectedLayerIdData.clothingAndPoseDescription !== undefined) ? ( // Person layer
                                        <div className="p-3 bg-surface rounded-none border border-border">
                                            <p className="text-sm font-medium text-text-secondary mb-2">{selectedLayerIdData.description}</p>
                                            <input type="file" accept="image/*" className="hidden" ref={el => {fileInputRefs.current[selectedLayerIdData.id] = el}} onChange={(e) => handlePersonImageUpload(e, selectedLayerIdData.id)} />
                                            {stagedPeopleReplacements[selectedLayerIdData.id] ? (
                                                    <div className="flex items-center gap-2">
                                                    <img src={`data:${stagedPeopleReplacements[selectedLayerIdData.id].mimeType};base64,${stagedPeopleReplacements[selectedLayerIdData.id].base64}`} alt="Nova pessoa" className="w-10 h-10 rounded-none object-cover" />
                                                    <p className="text-xs text-success flex-1">Nova imagem pronta.</p>
                                                    <button onClick={() => fileInputRefs.current[selectedLayerIdData.id]?.click()} className="text-xs text-text-secondary hover:text-text-primary underline">Trocar</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => fileInputRefs.current[selectedLayerIdData.id]?.click()} className="w-full text-sm flex items-center justify-center gap-2 px-3 py-2 bg-panel hover:bg-border rounded-none transition-colors border border-dashed border-border">
                                                    <UploadCloud className="w-4 h-4"/> Substituir Pessoa
                                                </button>
                                            )}
                                        </div>
                                    ) : <p className="text-sm text-text-secondary p-2 bg-surface rounded-none border border-border">Selecione uma camada para editar suas propriedades. Você pode mover ou redimensionar este objeto diretamente na imagem.</p>}
                                </div>
                            )}

                            <div className="mt-4">
                                <h4 className="font-semibold text-text-primary mb-2">Ajustes Gerais</h4>
                                <textarea value={stagedGeneralPrompt} onChange={e => setStagedGeneralPrompt(e.target.value)} placeholder="Ex: Mude o fundo para uma praia ensolarada..." rows={3} className="w-full p-2 bg-surface border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-highlight text-text-primary text-sm custom-scrollbar" />
                            </div>

                            {analysis?.analysis && !isAnalyzing && (
                                <div className="border-t border-border pt-4 mt-4">
                                    <h4 className="font-semibold text-text-primary mb-2">Análise da IA</h4>
                                    <div className="max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                        <div className="space-y-2 text-xs text-text-secondary">
                                            <p><strong className="text-text-primary">Estilo:</strong> {analysis.analysis.overallStyle}</p>
                                            <p><strong className="text-text-primary">Tipografia:</strong> {analysis.analysis.typographyDescription}</p>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <strong className="text-text-primary">Paleta:</strong>
                                                {analysis.analysis.colorPalette?.map((c: string) => (
                                                    <div key={c} className="w-4 h-4 rounded-none border border-border" style={{ backgroundColor: c }} title={c}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                         </>
                    </div>
                    }
                    <div className="p-4 border-t border-border mt-auto flex flex-col gap-3">
                        <div className="flex gap-2">
                            <button onClick={handleResetChanges} disabled={isEditing || isExporting || !hasChanges} className="flex-1 px-4 py-2 text-sm font-semibold bg-surface text-text-secondary rounded-none hover:bg-border disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                                <RotateCcw className="w-4 h-4"/> Descartar
                            </button>
                            <button onClick={handleApplyAllChanges} disabled={isEditing || isExporting || !hasChanges} className="flex-1 px-4 py-2 text-sm font-semibold bg-highlight text-black rounded-none hover:bg-highlight-hover disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                               <Check className="w-4 h-4"/> Aplicar Alterações
                            </button>
                        </div>
                         <button 
                            onClick={handleExportLayers} 
                            disabled={isEditing || isExporting || !currentImage || !analysis}
                            className="w-full px-4 py-2 text-sm font-semibold bg-surface text-text-primary rounded-none hover:bg-border disabled:opacity-50 disabled:bg-border disabled:text-text-secondary transition-colors flex items-center justify-center gap-2"
                        >
                           <DownloadIcon className="w-4 h-4"/> Exportar Camadas (PNG)
                        </button>
                        <button 
                            onClick={handleDownloadFinalImage} 
                            disabled={isEditing || isExporting || !currentImage || (referenceImage && currentImage.base64 === referenceImage.base64)}
                            className="w-full px-4 py-2 text-sm font-semibold bg-success text-white rounded-none hover:bg-opacity-90 disabled:opacity-50 disabled:bg-border disabled:text-text-secondary transition-colors flex items-center justify-center gap-2"
                        >
                           <DownloadIcon className="w-4 h-4"/> Finalizar e Baixar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const ChatView: React.FC<ChatViewProps> = (props) => {
  const { 
    activeChatSession,
    agents,
    onSendMessage, 
    onSendPreGenerated,
    onFormSubmit,
    isLoading, 
    onStartVariation,
    onGenerateSvgForImage,
    onRegenerateImage,
    onOpenImagePreview,
    onEditMessage,
    onMessageFeedback,
    pendingVariationInput,
    superPromptStatus,
    onClearChat,
    onNewChat,
    onOpenCreateAgentModal,
    onOpenCanvasModal,
    onChangeMode,
    onTogglePhotoShootMode,
    onVisagistaAnalysis,
    isVisagistaLoading,
    visagistaLoadingMessage,
    isCanvasOpen,
    setIsCanvasOpen,
    onOpenCameoModal,
    apiKeyStatus,
    onConfigureApiKey,
    humanKingProfile,
    onSaveHuman,
    onDeleteHuman,
    protonsHQProfile,
    onSaveProtonsHQ,
    onDeleteProtonsHQ,
  } = props;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeChatSession?.messages) {
      scrollToBottom();
    }
  }, [activeChatSession?.messages]);

  // If there's no active chat, show the new dynamic welcome screen.
  if (!activeChatSession) {
    return (
        <div className="flex-1 flex flex-col bg-background min-h-0 relative">
            <WelcomePlaceholder 
                onNewChat={onNewChat}
                onOpenCreateAgentModal={onOpenCreateAgentModal}
                onOpenCanvasModal={onOpenCanvasModal}
            />
            <ChatInput 
                onSendMessage={onSendMessage} 
                onSendPreGenerated={onSendPreGenerated}
                isLoading={true} // Disable input if no chat is active
                currentMode={AIMode.Fast} // Default mode
                pendingVariationInput={null} 
                superPromptStatus={'idle'}
                isCanvasOpen={isCanvasOpen}
                setIsCanvasOpen={setIsCanvasOpen}
            />
        </div>
    );
  }
  
    if (activeChatSession.mode === AIMode.HumanKing) {
      return (
          <HumanKingView
              activeChatSession={activeChatSession}
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              onClearChat={onClearChat}
              humanKingProfile={humanKingProfile}
              onSaveHuman={onSaveHuman}
              onDeleteHuman={onDeleteHuman}
              apiKeyStatus={apiKeyStatus}
              onConfigureApiKey={onConfigureApiKey}
          />
      );
    }

    if (activeChatSession.mode === AIMode.KingLab) {
      return (
          <KingLabView
              activeChatSession={activeChatSession}
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              onClearChat={onClearChat}
              apiKeyStatus={apiKeyStatus}
              onConfigureApiKey={onConfigureApiKey}
          />
      );
  }

  if (activeChatSession.mode === AIMode.ProtonsHQ) {
      return (
          <ProtonsHQView
              activeChatSession={activeChatSession}
              onSendMessage={onSendMessage}
              isLoading={isLoading}
              onClearChat={onClearChat}
              protonsHQProfile={protonsHQProfile || null}
              onSaveProtonsHQ={onSaveProtonsHQ || (() => {})}
              onDeleteProtonsHQ={onDeleteProtonsHQ || (() => {})}
              apiKeyStatus={apiKeyStatus}
              onConfigureApiKey={onConfigureApiKey}
          />
      );
  }

  if (activeChatSession.mode === AIMode.Visagista) {
      return (
          <VisagistaView
              activeChatSession={activeChatSession}
              onAnalysis={onVisagistaAnalysis}
              isLoading={isVisagistaLoading}
              loadingMessage={visagistaLoadingMessage}
              onClear={() => onClearChat(activeChatSession.id)}
              agents={agents}
          />
      );
  }

  if (activeChatSession.mode === AIMode.KingStudio) {
      return <NanoStudioView {...props} />;
  }

  const hasBaseImageForPhotoShoot = activeChatSession.messages.some(m => m.sender === 'user' && m.userImages && m.userImages.length > 0);

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0 relative">
      <ChatViewHeader activeChat={activeChatSession} agents={agents} onClearChat={onClearChat} isLoading={isLoading} onTogglePhotoShootMode={onTogglePhotoShootMode} onOpenCameoModal={onOpenCameoModal} apiKeyStatus={apiKeyStatus} onConfigureApiKey={onConfigureApiKey} />
      <div className={`flex-1 overflow-y-auto p-4 md:p-10 space-y-4 pt-28 md:pt-12 pb-4`} aria-live="polite">
          {activeChatSession.messages.length === 0 && !isLoading && activeChatSession.mode === AIMode.EditorKing ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-text-secondary p-4">
                  <div>
                      <Sparkles className="w-16 h-16 mx-auto mb-4 text-highlight"/>
                      <h2 className="text-xl font-semibold text-text-primary">BanaX</h2>
                      {activeChatSession.isPhotoShootActive ? (
                          <p className="mt-2 max-w-md">Modo Ensaio Fotográfico ativado. Envie uma imagem para começar.</p>
                      ) : (
                        <p className="mt-2 max-w-md">
                            Envie uma imagem e peça para adicionar objetos, mudar o fundo ou alterar a proporção.
                            <br/>
                            Use o ícone de engrenagem <Settings className="w-4 h-4 inline-block -mt-1"/> para o modo "Ensaio Fotográfico".
                        </p>
                      )}
                  </div>
              </div>
          ) : (
            activeChatSession.messages.map((msg) => (
            <MessageItem
                key={msg.id}
                message={msg}
                currentMode={activeChatSession.mode}
                onStartVariation={onStartVariation}
                onGenerateSvgForImage={onGenerateSvgForImage} 
                onOpenImagePreview={onOpenImagePreview}
                onRegenerateImage={onRegenerateImage}
                onFormSubmit={onFormSubmit}
                onEdit={(newText) => onEditMessage(activeChatSession.id, msg.id, newText)}
                onFeedback={(feedback) => onMessageFeedback(activeChatSession.id, msg.id, feedback)}
            />
            ))
          )}
          <div ref={messagesEndRef} />
      </div>

       {activeChatSession.messages.length === 0 && !isLoading && !activeChatSession.isPhotoShootActive && (
            <SuggestionChips mode={activeChatSession.mode} onSendMessage={onSendMessage} />
        )}

      <ChatInput 
          onSendMessage={onSendMessage} 
          onSendPreGenerated={onSendPreGenerated}
          isLoading={isLoading} 
          currentMode={activeChatSession.mode}
          isPhotoShootActive={activeChatSession.isPhotoShootActive}
          hasPhotoShootBaseImage={hasBaseImageForPhotoShoot}
          pendingVariationInput={pendingVariationInput} 
          superPromptStatus={superPromptStatus}
          isCanvasOpen={isCanvasOpen}
          setIsCanvasOpen={setIsCanvasOpen}
          apiKeyStatus={apiKeyStatus}
          onConfigureApiKey={onConfigureApiKey}
      />
    </div>
  );
};

export default memo(ChatView);
