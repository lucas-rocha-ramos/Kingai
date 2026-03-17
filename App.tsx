
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AIMode, MessageSender, AgentProfilePictureSource, ChatSession, Message, GeneratedImage, Agent, User, CameoProfile, HumanKingProfile, ProtonsHQProfile, GenerationTools } from './types';
import { Sidebar } from './components/Sidebar';
import ChatView from './components/ChatView';
import GalleryView from './components/GalleryView';
import SplashScreen from './components/SplashScreen';
import CreateAgentModal from './components/CreateAgentModal';
import { AuthModal } from './AuthModal';
import ImagePreviewModal from './components/ImagePreviewModal';
import CanvasModal from './components/CanvasModal';
import CameoSetupModal from './components/CameoSetupModal';
import { Menu, Plus } from 'lucide-react';
import {
  generateFastTextResponseStream,
  generateResponse,
  generateSvgFromDescription,
  generateVideoFromPromptService,
  generateTtsAudio,
  generateVisagistaResponse,
} from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_CONVERSATION_TTL_MS } from './constants';

const safeNewDate = (dateString: string | Date | undefined): Date => {
  if (!dateString) {
    return new Date();
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    console.warn(`Encontrada data inválida no localStorage: "${dateString}". Usando data atual como fallback.`);
    return new Date();
  }
  return d;
};

export const App = () => {
    const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
    const [activeView, setActiveView] = useState<'chat' | 'gallery'>('chat');
    const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false);
    const [isCanvasOpen, setIsCanvasOpen] = useState(false);
    const [previewedImagesInfo, setPreviewedImagesInfo] = useState<{ images: GeneratedImage[], startIndex: number } | null>(null);
    const [isCameoModalOpen, setIsCameoModalOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isAppStarted, setIsAppStarted] = useState(false);
    const [cameoProfile, setCameoProfile] = useState<CameoProfile | null>(null);
    const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'ok' | 'not_set'>('unknown');
    const [newAgentData, setNewAgentData] = useState<Partial<Agent>>({
        name: '',
        instructions: '',
        profilePictureSource: AgentProfilePictureSource.UPLOAD,
        profilePicturePrompt: '',
        knowledgeDocs: [],
        capabilities: { imageGeneration: false, codeGeneration: false }
    });
    const [agentProfilePicOptions, setAgentProfilePicOptions] = useState<GeneratedImage[]>([]);
    const [isGeneratingAgentProfilePic, setIsGeneratingAgentProfilePic] = useState(false);
    const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
    const [superPromptWorkflowState, setSuperPromptWorkflowState] = useState<{ status: 'idle' | 'describing' | 'awaiting_user_feedback' | 'unifying' }>({ status: 'idle' });
    const [pendingVariationInput, setPendingVariationInput] = useState<{ enhancedPrompt: string; referenceImageBase64?: string; referenceImageMimeType?: string; lineageOriginalUserPrompt?: string; } | null>(null);
    const [isVisagistaLoading, setIsVisagistaLoading] = useState(false);
    const [visagistaLoadingMessage, setVisagistaLoadingMessage] = useState('');
    const [humanKingProfile, setHumanKingProfile] = useState<HumanKingProfile | null>(null);
    const [protonsHQProfile, setProtonsHQProfile] = useState<ProtonsHQProfile | null>(null);

    // Initialize User
    useEffect(() => {
        let loadedUser = null;
        try {
            const savedUserStr = localStorage.getItem('protons-ai-user');
            loadedUser = savedUserStr ? JSON.parse(savedUserStr) : null;
        } catch (e) {
            console.error("Erro ao carregar usuário do localStorage", e);
        }

        if (loadedUser) {
            setCurrentUser(loadedUser);
        }
        
        const started = localStorage.getItem('protons-ai-started');
        if (started === 'true') {
            setIsAppStarted(true);
        }
    }, []);

    const handleStartApp = () => {
        setIsAppStarted(true);
        try {
            localStorage.setItem('protons-ai-started', 'true');
        } catch (e) {
            console.error("Erro ao salvar estado de início", e);
        }
    };

    useEffect(() => {
        if (!currentUser) return;

        let loadedChats: ChatSession[] = [];
        try {
            const savedChats = localStorage.getItem(`protons-ai-chats_${currentUser.username}`);
            if (savedChats) {
                const parsedChats = JSON.parse(savedChats);
                loadedChats = parsedChats
                    .map((chat: any) => {
                        if (!chat || typeof chat !== 'object' || !chat.id || !chat.title || !chat.mode) {
                            console.warn("Descartando sessão de chat malformada:", chat);
                            return null;
                        }
                        const sanitizedMessages = (Array.isArray(chat.messages) ? chat.messages : [])
                            .map((msg: any) => {
                                if (!msg || typeof msg !== 'object' || !msg.id || !msg.sender) {
                                    console.warn("Descartando mensagem malformada:", msg);
                                    return null;
                                }
                                return { ...msg, text: msg.text || '', createdAt: safeNewDate(msg.createdAt) };
                            })
                            .filter((msg: any) => msg !== null);
                        return { ...chat, createdAt: safeNewDate(chat.createdAt), lastInteractedAt: safeNewDate(chat.lastInteractedAt || chat.createdAt), messages: sanitizedMessages, isPhotoShootActive: chat.isPhotoShootActive || false };
                    })
                    .filter((chat: any) => chat !== null);
            }
        } catch (e) {
            console.error("Falha ao carregar ou higienizar os chats. Limpando o cache de chats.", e);
            localStorage.removeItem(`protons-ai-chats_${currentUser.username}`);
        }
        setChatSessions(loadedChats);

        try {
            const savedAgents = localStorage.getItem(`protons-ai-agents_${currentUser.username}`);
            if (savedAgents) {
                const parsedAgents = JSON.parse(savedAgents);
                const sanitizedAgents = parsedAgents
                    .map((agent: any) => {
                        if (!agent || typeof agent !== 'object' || !agent.id || !agent.name || !agent.instructions) {
                            console.warn("Descartando agente malformado:", agent);
                            return null;
                        }
                        const capabilities = agent.capabilities || { imageGeneration: false, codeGeneration: false };
                        return { ...agent, capabilities, createdAt: safeNewDate(agent.createdAt), knowledgeDocs: Array.isArray(agent.knowledgeDocs) ? agent.knowledgeDocs : [], profilePictureSource: agent.profilePictureSource || AgentProfilePictureSource.UPLOAD };
                    })
                    .filter((agent: any) => agent !== null);
                setAgents(sanitizedAgents);
            } else {
                setAgents([]);
            }
        } catch (e) {
            console.error("Falha ao carregar ou higienizar os agentes. Limpando o cache de agentes.", e);
            localStorage.removeItem(`protons-ai-agents_${currentUser.username}`);
            setAgents([]);
        }
    
        try {
            const savedGallery = localStorage.getItem(`protons-ai-gallery_${currentUser.username}`);
            if (savedGallery) {
                const parsedGallery = JSON.parse(savedGallery);
                if(Array.isArray(parsedGallery)) {
                    const sanitizedGallery = parsedGallery.filter(item => item && item.id && item.base64);
                    setGeneratedImages(sanitizedGallery);
                }
            } else {
                setGeneratedImages([]);
            }
        } catch (e) {
            console.error("Falha ao carregar a galeria. Limpando o cache da galeria.", e);
            localStorage.removeItem(`protons-ai-gallery_${currentUser.username}`);
            setGeneratedImages([]);
        }

        try {
            const savedCameo = localStorage.getItem(`protons-ai-cameo_${currentUser.username}`);
            if (savedCameo) {
                setCameoProfile(JSON.parse(savedCameo));
            } else {
                setCameoProfile(null);
            }
        } catch (e) {
            console.error("Falha ao carregar perfil Cameo.", e);
            setCameoProfile(null);
        }

        try {
            const savedHuman = localStorage.getItem(`protons-ai-human_${currentUser.username}`);
            if (savedHuman) {
                setHumanKingProfile(JSON.parse(savedHuman));
            } else {
                setHumanKingProfile(null);
            }
        } catch (e) {
            console.error("Falha ao carregar perfil Human King.", e);
            setHumanKingProfile(null);
        }

        try {
            const savedProtonsHQ = localStorage.getItem(`protons-hq-profile_${currentUser.username}`);
            if (savedProtonsHQ) {
                setProtonsHQProfile(JSON.parse(savedProtonsHQ));
            } else {
                setProtonsHQProfile(null);
            }
        } catch (e) {
            console.error("Falha ao carregar perfil Protons HQ.", e);
            setProtonsHQProfile(null);
        }

        setCurrentChatId(null);

    }, [currentUser]);


    useEffect(() => {
        if (!currentUser) return;
        try {
            const storableChats = chatSessions.map(chat => {
                const { visagistaResults, ...restOfChat } = chat;
                return {
                    ...restOfChat,
                    messages: restOfChat.messages.map(message => {
                        const { images, userImages, svgContent, ...restOfMessage } = message;
                        if (images && images.length > 0 && !restOfMessage.text) {
                            restOfMessage.text = `[${images.length} imagem(ns) gerada(s)]`;
                        }
                        if (userImages && userImages.length > 0 && !restOfMessage.text) {
                            restOfMessage.text = '[Imagem(ns) Enviada(s)]';
                        }
                         if (svgContent && !restOfMessage.text) {
                            restOfMessage.text = '[Logo SVG Gerado]';
                        }
                        return restOfMessage;
                    })
                }
            });
            localStorage.setItem(`protons-ai-chats_${currentUser.username}`, JSON.stringify(storableChats));
        } catch (error) {
            console.error("Error saving chats to localStorage:", error);
        }
    }, [chatSessions, currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        try {
            localStorage.setItem(`protons-ai-agents_${currentUser.username}`, JSON.stringify(agents));
        } catch (error) {
            console.error("Error saving agents to localStorage:", error);
        }
    }, [agents, currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        
        const saveGallerySafe = (images: GeneratedImage[]) => {
             try {
                localStorage.setItem(`protons-ai-gallery_${currentUser.username}`, JSON.stringify(images));
            } catch (error: any) {
                // Check for quota exceeded error (browsers name it differently)
                const isQuotaError = error && (
                    error.name === 'QuotaExceededError' || 
                    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || 
                    error.message?.includes('exceeded the quota')
                );

                if (isQuotaError && images.length > 0) {
                    // Retry with one fewer image (removing the oldest from the list to be saved)
                    // The array is sliced from the end (-LIMIT), so index 0 is the oldest kept image.
                    saveGallerySafe(images.slice(1));
                } else {
                    console.error("Error saving gallery to localStorage:", error);
                }
            }
        };

        const GALLERY_STORAGE_LIMIT = 15;
        const imagesToStore = generatedImages.slice(-GALLERY_STORAGE_LIMIT);
        saveGallerySafe(imagesToStore);
        
    }, [generatedImages, currentUser]);

    useEffect(() => {
        if (!currentUser) return;
        if (humanKingProfile) {
            localStorage.setItem(`protons-ai-human_${currentUser.username}`, JSON.stringify(humanKingProfile));
        } else {
            localStorage.removeItem(`protons-ai-human_${currentUser.username}`);
        }

        if (protonsHQProfile) {
            localStorage.setItem(`protons-hq-profile_${currentUser.username}`, JSON.stringify(protonsHQProfile));
        } else {
            localStorage.removeItem(`protons-hq-profile_${currentUser.username}`);
        }
    }, [humanKingProfile, protonsHQProfile, currentUser]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setIsSidebarOpen(true);
            } else {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activeChatSession = chatSessions.find(c => c.id === currentChatId);
    useEffect(() => {
        if (activeChatSession) {
            const agent = agents.find(a => a.id === activeChatSession.agentId);
            document.title = agent ? `${agent.name} - Protons AI` : `${activeChatSession.title} - Protons AI`;
        } else {
            document.title = 'Protons AI';
        }

        const checkApiKey = async () => {
            if (activeChatSession?.mode === AIMode.VideoProtons) {
                if ((window as any).aistudio?.hasSelectedApiKey) {
                    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
                    setApiKeyStatus(hasKey ? 'ok' : 'not_set');
                } else {
                    setApiKeyStatus('not_set');
                }
            } else {
                setApiKeyStatus('unknown');
            }
        };
        checkApiKey();

    }, [activeChatSession, agents]);

    const addMessageToChat = useCallback((chatId: string, message: Message) => {
        setChatSessions(prev =>
            prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, messages: [...chat.messages, message], lastInteractedAt: new Date() }
                    : chat
            )
        );
    }, []);

    const updateMessageInChat = useCallback((chatId: string, messageId: string, updates: Partial<Message>) => {
        setChatSessions(prev =>
            prev.map(chat =>
                chat.id === chatId
                    ? {
                        ...chat,
                        messages: chat.messages.map(msg =>
                            msg.id === messageId ? { ...msg, ...updates } : msg
                        ),
                        lastInteractedAt: new Date(),
                    }
                    : chat
            )
        );
    }, []);
    
    const resetSuperPromptState = () => {
        setSuperPromptWorkflowState({ status: 'idle' });
        setPendingVariationInput(null);
    };
    
    const handleNewChat = useCallback((mode: AIMode, agentId?: string) => {
        const newChat: ChatSession = {
            id: uuidv4(),
            title: mode === AIMode.AgentChat ? 'Conversa com Agente' : mode,
            messages: [],
            mode: mode,
            agentId: agentId,
            createdAt: new Date(),
            lastInteractedAt: new Date(),
            isPhotoShootActive: false,
        };
        setChatSessions(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        setActiveView('chat');
        resetSuperPromptState();
    }, []);

    const handleSelectAgent = useCallback((agentId: string) => {
        let agentChat = chatSessions.find(c => c.agentId === agentId);
        const now = new Date().getTime();
        const expiredChat = agentChat && agentChat.lastInteractedAt && (now - new Date(agentChat.lastInteractedAt).getTime() > AGENT_CONVERSATION_TTL_MS);
        
        if (agentChat && expiredChat) {
            handleClearChat(agentChat.id);
            agentChat = chatSessions.find(c => c.id === agentChat.id);
        }

        if (!agentChat || expiredChat) {
            if (expiredChat && agentChat) {
                 setCurrentChatId(agentChat.id);
            } else {
                const agent = agents.find(a => a.id === agentId);
                const newChat: ChatSession = {
                    id: uuidv4(),
                    title: agent ? agent.name : 'Conversa com Agente',
                    messages: [],
                    mode: AIMode.AgentChat,
                    agentId: agentId,
                    createdAt: new Date(),
                    lastInteractedAt: new Date(),
                };
                setChatSessions(prev => [newChat, ...prev]);
                setCurrentChatId(newChat.id);
            }
        } else {
            setCurrentChatId(agentChat.id);
        }
        
        setActiveView('chat');
        resetSuperPromptState();
    }, [chatSessions, agents, currentUser]);

    const handleSwitchChat = useCallback((chatId: string) => {
        setCurrentChatId(chatId);
        setActiveView('chat');
        resetSuperPromptState();
    }, []);
    
    const handleDeleteChat = useCallback((chatId: string) => {
        setChatSessions(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            const remainingChats = chatSessions.filter(c => c.id !== chatId);
            const sorted = [...remainingChats].sort((a,b) => (b.lastInteractedAt?.getTime() || 0) - (a.lastInteractedAt?.getTime() || 0));
            setCurrentChatId(sorted.length > 0 ? sorted[0].id : null);
        }
    }, [currentChatId, chatSessions]);

    const handleClearChat = useCallback((chatId: string) => {
        setChatSessions(prev => prev.map(c => c.id === chatId ? {...c, messages: [], visagistaResults: [], lastInteractedAt: new Date()} : c));
        resetSuperPromptState();
    }, []);

    const handleClearGallery = () => {
        if(window.confirm("Tem certeza que deseja limpar a galeria? Esta ação não pode ser desfeita.")) {
            setGeneratedImages([]);
        }
    }

    const handleChangeMode = useCallback((chatId: string, newMode: AIMode) => {
        setChatSessions(prev =>
            prev.map(chat => {
                if (chat.id === chatId) {
                    const newTitle = newMode === AIMode.AgentChat ? 'Conversa com Agente' : newMode;
                    return { ...chat, mode: newMode, title: newTitle, lastInteractedAt: new Date() };
                }
                return chat;
            })
        );
    }, []);

    const handleTogglePhotoShootMode = (chatId: string) => {
        setChatSessions(prev => prev.map(c => 
            c.id === chatId ? { ...c, isPhotoShootActive: !c.isPhotoShootActive, messages: [] } : c
        ));
    };

    const handleSaveCameo = (profile: CameoProfile) => {
        setCameoProfile(profile);
        if (currentUser) {
            localStorage.setItem(`protons-ai-cameo_${currentUser.username}`, JSON.stringify(profile));
        }
        setIsCameoModalOpen(false);
    };

    const handleSaveHuman = (profile: HumanKingProfile) => {
        setHumanKingProfile(profile);
        if (currentUser) {
            localStorage.setItem(`protons-ai-human_${currentUser.username}`, JSON.stringify(profile));
        }
    };

    const handleDeleteHuman = () => {
        if(window.confirm("Tem certeza que deseja excluir seu modelo humano?")) {
            setHumanKingProfile(null);
            if (currentUser) {
                localStorage.removeItem(`protons-ai-human_${currentUser.username}`);
            }
        }
    };

    const handleSaveProtonsHQ = (profile: ProtonsHQProfile) => {
        setProtonsHQProfile(profile);
    };

    const handleDeleteProtonsHQ = () => {
        setProtonsHQProfile(null);
    };

    const handleConfigureApiKey = async () => {
        if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
            setApiKeyStatus('ok');
        } else {
            alert("O seletor de chaves de API não está disponível no momento.");
        }
    };

    const handleSendMessage = async (
        inputText: string,
        imageGenerationPrompt?: string,
        userImages?: { base64: string; mimeType: string }[],
        userAudio?: { base64: string; mimeType: string },
        trueOriginalUserImagePromptForVariation?: string,
        numberOfImages = 1,
        tools: GenerationTools = { thinkLonger: false, webSearch: false, forceImage: false },
        imageSource?: 'upload' | 'canvas',
        isSuperPrompt = false,
        overrideAspectRatio?: string,
        maskImage?: { base64: string; mimeType: string }
    ) => {
        if (apiKeyStatus === 'not_set') {
            await handleConfigureApiKey();
            return;
        }

        if (!currentChatId || (!inputText.trim() && !userImages && !imageGenerationPrompt && !userAudio) || !currentUser) return;

        const currentSession = chatSessions.find(c => c.id === currentChatId);
        if (!currentSession) return;

        if (currentSession.mode === AIMode.EditorKing && currentSession.isPhotoShootActive) {
            if (userImages && userImages.length > 0) {
                 addMessageToChat(currentChatId, { id: uuidv4(), text: inputText.trim(), sender: MessageSender.User, createdAt: new Date(), userImages });
                 addMessageToChat(currentChatId, { id: uuidv4(), text: 'Imagem base definida! Agora, digite seus prompts em uma lista numerada (um por linha) para iniciar o ensaio fotográfico.', sender: MessageSender.AI, createdAt: new Date() });
                 return;
            }

            if (inputText.trim() && !userImages) {
                const baseImageMessage = [...currentSession.messages].reverse().find(m => m.sender === 'user' && m.userImages && m.userImages.length > 0);
                if (!baseImageMessage || !baseImageMessage.userImages) {
                    addMessageToChat(currentChatId, { id: uuidv4(), text: 'Por favor, envie uma imagem primeiro para iniciar o ensaio fotográfico.', sender: MessageSender.AI, createdAt: new Date() });
                    return;
                }
                const baseImage = baseImageMessage.userImages[0];

                const prompts = inputText.split('\n').map(line => line.trim()).filter(line => line && /^\d+[.)]/.test(line));

                if (prompts.length === 0) {
                    addMessageToChat(currentChatId, { id: uuidv4(), text: 'Não encontrei prompts numerados. Por favor, liste suas edições, uma por linha, começando com um número (ex: "1. Mude o fundo para uma praia").', sender: MessageSender.AI, createdAt: new Date() });
                    return;
                }

                addMessageToChat(currentChatId, { id: uuidv4(), text: inputText.trim(), sender: MessageSender.User, createdAt: new Date() });
                setIsLoading(true);
                const aiMessageId = uuidv4();
                addMessageToChat(currentChatId, {
                    id: aiMessageId, text: `Iniciando ensaio fotográfico com ${prompts.length} edições...`, sender: MessageSender.AI,
                    isLoading: true, isGeneratingImage: true, createdAt: new Date()
                });

                const generationPromises = prompts.map(p =>
                    generateResponse({
                        mode: AIMode.EditorKing,
                        prompt: p.replace(/^\d+[.)]\s*/, ''),
                        history: [],
                        userImages: [baseImage],
                    }).then(response => ({ ...response, originalPrompt: p }))
                );

                const results = await Promise.all(generationPromises);
                
                const allGeneratedImages: GeneratedImage[] = [];
                let errorText = '';

                results.forEach((res: any) => {
                    if (res.images && res.images.length > 0) {
                        const imageWithPrompt = { ...res.images[0], originalUserPrompt: res.originalPrompt };
                        allGeneratedImages.push(imageWithPrompt);
                    } else {
                        errorText += `Falha ao gerar para "${res.originalPrompt}": ${res.error || 'Erro desconhecido'}\n`;
                    }
                });

                if (allGeneratedImages.length > 0) {
                    setGeneratedImages(prev => [...prev, ...allGeneratedImages]);
                }

                updateMessageInChat(currentChatId, aiMessageId, {
                    isLoading: false, isGeneratingImage: false,
                    text: errorText ? `Ensaio finalizado com alguns erros:\n${errorText}` : 'Seu ensaio fotográfico está pronto!',
                    images: allGeneratedImages,
                    error: errorText ? errorText : undefined
                });
                
                setIsLoading(false);
                return;
            }
        }

        // Logic for specialized video and image requests embedded in text (like Human King or King Lab)
        // Check for special prefixes first
        if (inputText.startsWith('[KING_LAB_VIDEO_16:9]') || inputText.startsWith('[KING_LAB_VIDEO_9:16]')) {
            const is9by16 = inputText.startsWith('[KING_LAB_VIDEO_9:16]');
            const cleanPrompt = inputText.replace(/\[KING_LAB_VIDEO_.*\]/, '');
            const finalPrompt = cleanPrompt.trim() || "Uma criação de vídeo cinematográfica baseada nestas referências visuais.";
            
            // Check API Key
            const aiStudio = (window as any).aistudio;
            if (aiStudio?.hasSelectedApiKey && !(await aiStudio.hasSelectedApiKey())) {
                setApiKeyStatus('not_set');
                if (aiStudio?.openSelectKey) {
                    await aiStudio.openSelectKey();
                    setApiKeyStatus('ok');
                }
            }

            const aiMessageId = uuidv4();
            addMessageToChat(currentChatId, { id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true, isGeneratingVideo: true, createdAt: new Date() });
            
            // Logic Split:
            // 9:16 -> Start/End Frame (Morphing) using Veo Fast
            // 16:9 -> Cameo (Reference Image) using Veo Generate
            let response;
            if (is9by16) {
                // For 9:16 Morphing, we use start and end frame if available
                // We pass the array as 'referenceImages' but the service knows for 9:16 fast model to treat them as frames.
                response = await generateVideoFromPromptService(finalPrompt, '9:16', undefined, userImages);
            } else {
                // 16:9 Cameo
                response = await generateVideoFromPromptService(finalPrompt, '16:9', undefined, userImages?.slice(0, 3));
            }

            // FIX: Type narrowing for generation result using 'in' operator
            if ('error' in response) {
                updateMessageInChat(currentChatId, aiMessageId, { error: response.error, isLoading: false, isGeneratingVideo: false });
            } else {
                updateMessageInChat(currentChatId, aiMessageId, { videoUrl: response.videoUrl, text: response.text, isLoading: false, isGeneratingVideo: false });
            }
            return;
        }

        if (inputText.startsWith('[HUMAN_KING_VIDEO]')) {
             const cleanPrompt = inputText.replace('[HUMAN_KING_VIDEO]', '');
             // Human King Video Logic (Cameo style)
             const aiStudio = (window as any).aistudio;
             if (aiStudio?.hasSelectedApiKey && !(await aiStudio.hasSelectedApiKey())) {
                setApiKeyStatus('not_set');
                if (aiStudio?.openSelectKey) {
                    await aiStudio.openSelectKey();
                    setApiKeyStatus('ok');
                }
            }
            const aiMessageId = uuidv4();
            addMessageToChat(currentChatId, { id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true, isGeneratingVideo: true, createdAt: new Date() });
            
            // Use 16:9 for Human King Cinematic Scenes
            const response = await generateVideoFromPromptService(cleanPrompt, '16:9', undefined, userImages?.slice(0, 3)); // Limit to 3 refs for Cameo

            // FIX: Type narrowing for generation result using 'in' operator
            if ('error' in response) {
                updateMessageInChat(currentChatId, aiMessageId, { error: response.error, isLoading: false, isGeneratingVideo: false });
            } else {
                updateMessageInChat(currentChatId, aiMessageId, { videoUrl: response.videoUrl, text: response.text, isLoading: false, isGeneratingVideo: false });
            }
            return;
        }

        const isEditorKingEdit = currentSession.mode === AIMode.EditorKing && !userImages && inputText.trim();
        let editorKingBaseImage: { base64: string; mimeType: string }[] | undefined;

        if (isEditorKingEdit) {
            const reversedMessages = [...currentSession.messages].reverse();
            const lastImageMessage = reversedMessages.find(m => (m.images && m.images.length > 0) || (m.userImages && m.userImages.length > 0));

            if (lastImageMessage) {
                if (lastImageMessage.images && lastImageMessage.images.length > 0) {
                    const lastImage = lastImageMessage.images[lastImageMessage.images.length - 1];
                    editorKingBaseImage = [{ base64: lastImage.base64, mimeType: lastImage.mimeType }];
                } else if (lastImageMessage.userImages && lastImageMessage.userImages.length > 0) {
                    const lastUserImage = lastImageMessage.userImages[lastImageMessage.userImages.length - 1];
                    editorKingBaseImage = [{ base64: lastUserImage.base64, mimeType: lastUserImage.mimeType }];
                }
            } else {
                 addMessageToChat(currentChatId, { id: uuidv4(), text: inputText.trim(), sender: MessageSender.User, createdAt: new Date() });
                 addMessageToChat(currentChatId, { id: uuidv4(), text: 'Por favor, envie uma imagem para que eu possa editar.', sender: MessageSender.AI, createdAt: new Date() });
                 return;
            }
        }

        if (userImages && userImages.length > 0 && !inputText.trim() && !imageGenerationPrompt && ![AIMode.KingStudio, AIMode.EditorKing, AIMode.KingLab, AIMode.HumanKing].includes(currentSession.mode)) {
            addMessageToChat(currentChatId, { id: uuidv4(), text: '', sender: MessageSender.User, createdAt: new Date(), userImages });
            addMessageToChat(currentChatId, { id: uuidv4(), text: 'Você enviou uma imagem. O que gostaria de fazer com ela?', sender: MessageSender.AI, createdAt: new Date() });
            return;
        }

        if (!isSuperPrompt) {
            const userMessageText = userAudio ? "[Mensagem de voz]" : inputText.trim().replace(/\[.*?\]/g, ''); // Hide prefixes in UI
            if (userMessageText || userImages || userAudio) {
                addMessageToChat(currentChatId, { id: uuidv4(), text: userMessageText, sender: MessageSender.User, createdAt: new Date(), userImages, userAudio });
            }
        }
        
        if (userImages && userImages.length > 0 && !inputText.trim() && !maskImage) {
            if (currentSession.mode === AIMode.EditorKing) {
                addMessageToChat(currentChatId, {
                    id: uuidv4(),
                    text: 'Imagem recebida! Agora, digite o que você quer mudar (ex: "mude o fundo para uma praia").',
                    sender: MessageSender.AI,
                    createdAt: new Date(),
                });
                return;
            }
            if (currentSession.mode === AIMode.KingStudio) {
                return;
            }
        }

        setIsLoading(true);
        let lastError: any = null;
        let aiMessageId: string | null = null;

        try {
            const history = currentSession.messages;
            const agentForChat = agents.find(a => a.id === currentSession.agentId);

            if (currentSession.mode === AIMode.Fast && !userImages && !userAudio) {
                aiMessageId = uuidv4();
                addMessageToChat(currentChatId, { id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true, isStreaming: true, createdAt: new Date() });

                let accumulatedText = "";
                const stream = generateFastTextResponseStream(inputText, history);
                for await (const chunk of stream) {
                    accumulatedText += chunk;
                    updateMessageInChat(currentChatId, aiMessageId, { text: accumulatedText });
                }
                updateMessageInChat(currentChatId, aiMessageId, { isLoading: false, isStreaming: false });

            } else if (currentSession.mode === AIMode.VideoProtons) {
                if ((window as any).aistudio?.hasSelectedApiKey && !(await (window as any).aistudio.hasSelectedApiKey())) {
                    setApiKeyStatus('not_set');
                    if ((window as any).aistudio?.openSelectKey) {
                        await (window as any).aistudio.openSelectKey();
                        setApiKeyStatus('ok');
                    }
                }

                // In VideoProtons, we pass ALL images to support start/end frames
                const videoImagesPayload = userImages;
                aiMessageId = uuidv4();
                
                const hasCameo = cameoProfile && cameoProfile.appearanceImages.length > 0;
                const finalPrompt = hasCameo ? `Um vídeo do personagem das imagens de referência: ${inputText}` : inputText;
                const referenceImagesForVideo = hasCameo ? cameoProfile.appearanceImages : undefined;
                
                const finalAspectRatio = hasCameo ? '16:9' : (overrideAspectRatio || '16:9');
                
                addMessageToChat(currentChatId, { id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true, isGeneratingVideo: true, createdAt: new Date(), generationAspectRatio: finalAspectRatio });
                
                // If regular VideoProtons, we pass `videoImagesPayload` as `referenceImages` argument to our service wrapper,
                // but inside the service we map it correctly to `image` (start) and `lastFrame` (end) for the Veo model.
                // If Cameo is active, `referenceImagesForVideo` takes precedence.
                const response = await generateVideoFromPromptService(finalPrompt, finalAspectRatio, undefined, referenceImagesForVideo || videoImagesPayload);

                // FIX: Narrow result type before access
                if ('error' in response && response.error?.includes("Requested entity was not found.")) {
                    setApiKeyStatus('not_set');
                    updateMessageInChat(currentChatId, aiMessageId, { 
                        error: "A chave de API selecionada é inválida ou não tem faturamento ativado. Por favor, tente gerar novamente para selecionar uma chave válida.", 
                        isLoading: false, 
                        isGeneratingVideo: false 
                    });
                    return;
                }

                // FIX: Type narrowing for generation result using 'in' operator
                if ('error' in response) {
                    updateMessageInChat(currentChatId, aiMessageId, { error: response.error, isLoading: false, isGeneratingVideo: false });
                } else {
                    setApiKeyStatus('ok');
                    updateMessageInChat(currentChatId, aiMessageId, { videoUrl: response.videoUrl, text: response.text, isLoading: false, isGeneratingVideo: false });
                }
            
            } else {
                aiMessageId = uuidv4();
                
                const imageKeywords = ["imagem", "desenhe", "crie", "gere", "logo", "ilustração", "foto", "pôster", "render", "image", "draw", "create", "generate", "picture", "photo", "poster", "render"];
                const isLikelyImageRequest = imageKeywords.some(k => inputText.toLowerCase().includes(k)) || tools.forceImage;
                
                const shouldShowImageLoader = currentSession.mode === AIMode.DesignStudio || currentSession.mode === AIMode.KingStudio || currentSession.mode === AIMode.EditorKing || (currentSession.mode === AIMode.Ultra && isLikelyImageRequest) || currentSession.mode === AIMode.HumanKing;

                const aspectRatioForAnimation = overrideAspectRatio || (inputText.match(/\b(16:9|9:16|1:1|4:3|3:4)\b/)?.[0] || '1:1');
                
                addMessageToChat(currentChatId, {
                    id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true,
                    isGeneratingImage: shouldShowImageLoader,
                    generationAspectRatio: shouldShowImageLoader ? aspectRatioForAnimation : undefined,
                    createdAt: new Date()
                });

                const response: any = await generateResponse({
                    mode: currentSession.mode,
                    prompt: inputText,
                    imageGenerationPrompt: imageGenerationPrompt,
                    history: history,
                    agent: agentForChat,
                    userImages: userImages || editorKingBaseImage,
                    userAudio: userAudio,
                    originalUserImagePromptForVariation: trueOriginalUserImagePromptForVariation,
                    numberOfImages: numberOfImages,
                    tools: { ...tools, forceImage: tools.forceImage || isLikelyImageRequest },
                    isSuperPrompt: isSuperPrompt,
                    maskImage: maskImage
                });

                if (response.error && (!response.images || response.images.length === 0)) {
                    updateMessageInChat(currentChatId, aiMessageId, { error: response.error, isLoading: false, isGeneratingImage: false, text: response.text || "Ocorreu um erro." });
                } else if (response.images && response.images.length > 0) {
                    setGeneratedImages(prev => [...prev, ...response.images!]);
                    updateMessageInChat(currentChatId, aiMessageId, {
                        isLoading: false, isGeneratingImage: false, text: response.text || '', images: response.images,
                        source: response.source, createdAt: new Date()
                    });
                } else if (response.svgContent) {
                    updateMessageInChat(currentChatId, aiMessageId, { isLoading: false, isGeneratingImage: false, text: `Aqui está o logo SVG que você pediu.`, svgContent: response.svgContent, svgFilename: response.svgFilename });
                } else {
                    const finalUpdate: Partial<Message> = { isLoading: false, isGeneratingImage: false };
                    if (response.text) finalUpdate.text = response.text;
                    if (response.groundingChunks) finalUpdate.groundingChunks = response.groundingChunks;
                    if (response.formRequest) finalUpdate.formRequest = response.formRequest;
                    updateMessageInChat(currentChatId, aiMessageId, finalUpdate);
                }

                if (response.text && (currentSession.mode === AIMode.Ultra || currentSession.mode === AIMode.AgentChat)) {
                     try {
                        const ttsResponse = await generateTtsAudio(response.text);
                        if (ttsResponse.audioBase64) {
                            const audioUrl = `data:audio/mp3;base64,${ttsResponse.audioBase64}`;
                            updateMessageInChat(currentChatId, aiMessageId, { generatedAudioUrl: audioUrl });
                        }
                    } catch (ttsError) {
                        console.error("Erro na geração de TTS:", ttsError);
                    }
                }
            }
        } catch (error) {
            console.error("Error sending message:", error);
            lastError = error;
        } finally {
            if (lastError && aiMessageId) {
                updateMessageInChat(currentChatId, aiMessageId, { 
                    error: lastError instanceof Error ? lastError.message : String(lastError), 
                    isLoading: false, isGeneratingImage: false, isGeneratingVideo: false, isStreaming: false
                });
            }
            setIsLoading(false);
            if(isSuperPrompt){
              resetSuperPromptState();
            }
        }
    };

    const handleFormSubmit = async (messageId: string, formData: any) => {
        if (!currentChatId) return;
        updateMessageInChat(currentChatId, messageId, { formResponse: formData });
        const summaryLines = Object.entries(formData).map(([key, value]) => `- ${key}: ${value}`);
        const summaryText = `O usuário preencheu o formulário com os seguintes dados:\n${summaryLines.join('\n')}\n\nContinue a partir daqui.`;
        await handleSendMessage(summaryText);
    };
    
    const handleStartVariation = (message: Message, imageIndex = 0) => {
        const targetImage = message.images?.[imageIndex];
        if (!targetImage?.prompt) return;
        setPendingVariationInput({
            enhancedPrompt: targetImage.prompt,
            lineageOriginalUserPrompt: targetImage.originalUserPrompt,
        });
        setActiveView('chat');
    };

    const handleGenerateSvgForImage = async (messageId: string, imageIndex = 0) => {
        if (!currentChatId) return;
        const message = chatSessions.find(c => c.id === currentChatId)?.messages.find(m => m.id === messageId);
        const targetImage = message?.images?.[imageIndex];
        if (!targetImage?.prompt) return;
        
        setIsLoading(true);
        const aiMessageId = uuidv4();
        addMessageToChat(currentChatId, { id: aiMessageId, text: '', sender: MessageSender.AI, isLoading: true, createdAt: new Date() });

        const { svgContent, svgFilename, error } = await generateSvgFromDescription(targetImage.prompt);
        
        if (error) {
            updateMessageInChat(currentChatId, aiMessageId, { text: "Não foi possível gerar o SVG.", error: error, isLoading: false });
        } else if (svgContent && svgFilename) {
            updateMessageInChat(currentChatId, aiMessageId, {
                text: "Aqui está o logo em formato SVG vetorial.",
                svgContent: svgContent,
                svgFilename: svgFilename,
                isLoading: false,
            });
        }
        setIsLoading(false);
    };
    
    const handleRegenerateImage = async (messageId: string, imageIndex = 0) => {
        if (!currentChatId) return;
        const message = chatSessions.find(c => c.id === currentChatId)?.messages.find(m => m.id === messageId);
        const targetImage = message?.images?.[imageIndex];
        if (!targetImage?.prompt) {
            alert("Não há prompt suficiente para regenerar esta imagem.");
            return;
        }
        
        handleSendMessage(
            targetImage.originalUserPrompt || targetImage.prompt, 
            targetImage.prompt, 
            undefined, 
            undefined,
            targetImage.originalUserPrompt,
            1,
            { thinkLonger: false, webSearch: false, forceImage: true },
            undefined,
            false,
            targetImage.aspectRatio
        );
    };

    const handleSendPreGenerated = useCallback((prompt: string, image: GeneratedImage) => {
        if (!currentChatId) return;
        setGeneratedImages(prev => [...prev, image]);
        const userMessage = { id: uuidv4(), text: prompt, sender: MessageSender.User, createdAt: new Date() };
        addMessageToChat(currentChatId, userMessage);
        const aiMessage = { id: image.id, text: '', sender: MessageSender.AI, createdAt: image.createdAt, images: [image] };
        addMessageToChat(currentChatId, aiMessage);
    }, [currentChatId, addMessageToChat]);

    const handleCanvasAccept = (image: GeneratedImage) => {
        handleSendPreGenerated("Imagem criada a partir do seu esboço no Estúdio Mágico.", image);
    };

    const handleEditMessage = (chatId: string, messageId: string, newText: string) => {
        const chat = chatSessions.find(c => c.id === chatId);
        if (!chat) return;

        const messageIndex = chat.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const forkedMessages = chat.messages.slice(0, messageIndex);
        
        setChatSessions(prev =>
            prev.map(c =>
                c.id === chatId
                    ? { ...c, messages: forkedMessages, lastInteractedAt: new Date() }
                    : c
            )
        );

        handleSendMessage(newText);
    };

    const handleMessageFeedback = (chatId: string, messageId: string, feedback: 'liked' | 'disliked') => {
        updateMessageInChat(chatId, messageId, { feedback });
    };

    const handleOpenImagePreview = (images: GeneratedImage[], startIndex: number) => {
        setPreviewedImagesInfo({ images, startIndex });
    };

    const handleVisagistaAnalysis = async (prompt: string, image: { base64: string, mimeType: string }) => {
        if (!currentChatId) return;

        setIsVisagistaLoading(true);
        setVisagistaLoadingMessage('Analisando suas características...');

        const updateCallback = (message: string) => setVisagistaLoadingMessage(message);

        const result = await generateVisagistaResponse(prompt, image, updateCallback);

        // FIX: Narrow result type before accessing 'results' or 'error'
        if ('results' in result && result.results) {
            setChatSessions(prev => prev.map(chat => 
                chat.id === currentChatId ? { ...chat, visagistaResults: result.results || [], lastInteractedAt: new Date() } : chat
            ));
        }

        if ('error' in result) {
            console.error("Visagista Error:", result.error);
        }

        setIsVisagistaLoading(false);
        setVisagistaLoadingMessage('');
    };

    const handleLogin = (username: string, password?: string) => {
        let savedUsers: any = {};
        try {
            const savedUsersRaw = localStorage.getItem('protons-ai-all-users');
            savedUsers = savedUsersRaw ? JSON.parse(savedUsersRaw) : {};
        } catch (e) {
            console.error("Erro ao carregar todos os usuários", e);
        }
        
        if (savedUsers[username] && savedUsers[username].passwordHash === password) { 
          const user = { 
              username, 
              passwordHash: savedUsers[username].passwordHash,
          };
          setCurrentUser(user);
          try {
            localStorage.setItem('protons-ai-user', JSON.stringify(user));
          } catch (e) {
            console.error("Erro ao salvar usuário logado", e);
          }
          setAuthError(null);
        } else {
          setAuthError('Nome de usuário ou senha inválidos.');
        }
    };

    const handleSignup = (username: string, password?: string) => {
        if (!password) {
            setAuthError("Senha é obrigatória.");
            return;
        }
        let savedUsers: any = {};
        try {
            const savedUsersRaw = localStorage.getItem('protons-ai-all-users');
            savedUsers = savedUsersRaw ? JSON.parse(savedUsersRaw) : {};
        } catch (e) {
            console.error("Erro ao carregar todos os usuários para cadastro", e);
        }

        if (savedUsers[username]) {
            setAuthError('Este nome de usuário já está em uso.');
        } else {
            const newUser: User = { 
                username, 
                passwordHash: password,
            }; 
            savedUsers[username] = newUser;
            try {
                localStorage.setItem('protons-ai-all-users', JSON.stringify(savedUsers));
                setCurrentUser(newUser);
                localStorage.setItem('protons-ai-user', JSON.stringify(newUser));
                setAuthError(null);
            } catch (e) {
                console.error("Erro ao salvar novo usuário (Quota excedida?)", e);
                setAuthError("Erro ao criar conta. Armazenamento local cheio.");
            }
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('protons-ai-user');
        setChatSessions([]);
        setAgents([]);
        setCurrentChatId(null);
        setGeneratedImages([]);
        setCameoProfile(null);
    };

    if (!isAppStarted) {
        return <SplashScreen onStart={handleStartApp} />;
    }

    if (!currentUser) {
        return (
             <div className="h-screen w-screen bg-[#050505] flex text-sm overflow-hidden relative">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-highlight/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-highlight/5 blur-[120px] rounded-full animate-pulse" />
                <AuthModal
                    isOpen={true}
                    onClose={() => {}}
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                    error={authError}
                    setError={setAuthError}
                />
            </div>
        );
    }
    
    // Placeholder functions for agent modal actions if not fully implemented in prompt context
    const openCreateAgentModal = () => setIsCreateAgentModalOpen(true);
    const openEditAgentModal = (agentId: string) => {};
    const handleUpdateNewAgentData = (field: any, value: any) => {};
    const handleAgentProfilePicUpload = (event: any) => {};
    const handleGenerateAgentProfilePic = async () => {};
    const handleSelectAgentProfilePic = (image: any) => {};
    const handleAddAgentPdfs = (files: FileList) => {};
    const handleRemoveAgentPdf = (docId: string) => {};
    const handleSaveAgent = () => {};
    const handleDeleteAgent = (agentId: string) => {};


    const activeChat = chatSessions.find(c => c.id === currentChatId);
    const agent = activeChat?.agentId ? agents.find(a => a.id === activeChat.agentId) : null;
    const mobileTitle = agent ? agent.name : (activeChat?.title || "Protons AI");

    return (
        <div className="h-[100dvh] w-screen bg-[#000000] flex text-sm overflow-hidden relative">
            {/* Background Accents */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-highlight/5 blur-[180px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-highlight/5 blur-[180px] rounded-full pointer-events-none" />
            
            <Sidebar
                chats={chatSessions}
                agents={agents}
                currentChatId={currentChatId}
                currentUser={currentUser}
                onNewChat={handleNewChat}
                onSwitchChat={handleSwitchChat}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
                onShowGallery={() => setActiveView('gallery')}
                onDeleteChat={handleDeleteChat}
                onClearChat={handleClearChat}
                onOpenCreateAgentModal={openCreateAgentModal}
                onOpenEditAgentModal={openEditAgentModal}
                onSelectAgent={handleSelectAgent}
                onOpenUpgradeModal={() => {}}
                onDeleteAgent={handleDeleteAgent}
                onLogout={handleLogout}
            />
            
            <main className={`flex-1 flex flex-col min-w-0 relative transition-all duration-700 ease-in-out ${isSidebarOpen ? 'md:ml-[280px]' : 'md:ml-[80px]'}`}>
                {/* Dynamic Island / Mobile Header */}
                <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-[450px]">
                    <div className="bg-black/90 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-4 py-2 flex items-center justify-between shadow-2xl">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-3 text-white/60 hover:text-white transition-colors no-tap-highlight"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        
                        <div className="flex flex-col items-center justify-center min-w-0 px-2">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-highlight rounded-full animate-pulse flex-shrink-0" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 truncate max-w-[120px]">{mobileTitle}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleNewChat(AIMode.Ultra)}
                                className="p-3 text-highlight hover:bg-highlight/10 rounded-full transition-all active:scale-90"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                            <div className="w-10 h-10 rounded-full bg-highlight/10 border border-highlight/20 flex items-center justify-center text-[10px] font-black text-highlight">
                                {currentUser.username[0].toUpperCase()}
                            </div>
                        </div>
                    </div>
                </div>

                {activeView === 'chat' ? (
                    <ChatView
                        activeChatSession={activeChatSession}
                        agents={agents}
                        onSendMessage={handleSendMessage}
                        onFormSubmit={handleFormSubmit}
                        isLoading={isLoading}
                        onStartVariation={handleStartVariation}
                        onGenerateSvgForImage={handleGenerateSvgForImage}
                        onRegenerateImage={handleRegenerateImage}
                        onOpenImagePreview={handleOpenImagePreview}
                        onEditMessage={handleEditMessage}
                        onMessageFeedback={handleMessageFeedback}
                        pendingVariationInput={pendingVariationInput}
                        superPromptStatus={superPromptWorkflowState.status}
                        onClearChat={handleClearChat}
                        onSendPreGenerated={handleSendPreGenerated}
                        onNewChat={handleNewChat}
                        onOpenCreateAgentModal={openCreateAgentModal}
                        onOpenCanvasModal={() => setIsCanvasOpen(true)}
                        onChangeMode={handleChangeMode}
                        onTogglePhotoShootMode={handleTogglePhotoShootMode}
                        onVisagistaAnalysis={handleVisagistaAnalysis}
                        isVisagistaLoading={isVisagistaLoading}
                        visagistaLoadingMessage={visagistaLoadingMessage}
                        isCanvasOpen={isCanvasOpen}
                        setIsCanvasOpen={setIsCanvasOpen}
                        onOpenCameoModal={() => setIsCameoModalOpen(true)}
                        apiKeyStatus={apiKeyStatus}
                        onConfigureApiKey={handleConfigureApiKey}
                        humanKingProfile={humanKingProfile}
                        onSaveHuman={handleSaveHuman}
                        onDeleteHuman={handleDeleteHuman}
                        protonsHQProfile={protonsHQProfile}
                        onSaveProtonsHQ={handleSaveProtonsHQ}
                        onDeleteProtonsHQ={handleDeleteProtonsHQ}
                    />
                ) : (
                    <GalleryView 
                        images={generatedImages} 
                        onClose={() => setActiveView('chat')} 
                        onClearGallery={handleClearGallery}
                    />
                )}
            </main>

            <CreateAgentModal
                isOpen={isCreateAgentModalOpen}
                onClose={() => setIsCreateAgentModalOpen(false)}
                onSaveAgent={handleSaveAgent}
                newAgentData={newAgentData}
                onUpdateNewAgentData={handleUpdateNewAgentData}
                onProfilePicUpload={handleAgentProfilePicUpload}
                onGenerateProfilePic={handleGenerateAgentProfilePic}
                agentProfilePicOptions={agentProfilePicOptions}
                isGeneratingAgentProfilePic={isGeneratingAgentProfilePic}
                onSelectProfilePic={handleSelectAgentProfilePic}
                onAddPdfs={handleAddAgentPdfs}
                onRemovePdf={handleRemoveAgentPdf}
                editingAgentId={editingAgentId}
                onDeleteAgent={handleDeleteAgent}
            />

            {previewedImagesInfo && (
                <ImagePreviewModal
                    isOpen={!!previewedImagesInfo}
                    images={previewedImagesInfo.images}
                    startIndex={previewedImagesInfo.startIndex}
                    onClose={() => setPreviewedImagesInfo(null)}
                />
            )}
             <CanvasModal 
                isOpen={isCanvasOpen} 
                onClose={() => setIsCanvasOpen(false)} 
                onAccept={handleCanvasAccept} 
                currentMode={activeChatSession?.mode || AIMode.Ultra}
            />
            <CameoSetupModal
                isOpen={isCameoModalOpen}
                onClose={() => setIsCameoModalOpen(false)}
                onSave={handleSaveCameo}
                currentProfile={cameoProfile}
            />
        </div>
    );
};
