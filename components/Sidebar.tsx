
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, AIMode, Agent, User, MessageSender } from '../types'; 
import { 
    Plus, MessageSquare, Image as ImageIcon, Video, 
    UserCircle, Bot, LogOut, Search, Check, 
    Edit3, Layout, Zap, Sparkles, Camera, 
    FlaskConical, UserPlus, Trash2, Eraser,
    Settings, HelpCircle, History, Menu, X, ChevronLeft, ChevronRight,
    Palette, Scissors, Wand2
} from 'lucide-react';

interface SidebarProps {
  chats: ChatSession[];
  agents: Agent[]; 
  currentChatId: string | null;
  currentUser: User | null;
  onNewChat: (mode: AIMode) => void;
  onSwitchChat: (chatId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onShowGallery: () => void;
  onDeleteChat: (chatId: string) => void;
  onClearChat: (chatId: string) => void;
  onOpenCreateAgentModal: () => void; 
  onOpenEditAgentModal: (agentId: string) => void; 
  onSelectAgent: (agentId: string) => void; 
  onOpenUpgradeModal: () => void;
  onDeleteAgent: (agentId: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats, agents, currentChatId, currentUser, onNewChat, onSwitchChat, isOpen, onToggle,
  onShowGallery, onDeleteChat, onClearChat,
  onOpenCreateAgentModal, onOpenEditAgentModal, onSelectAgent,
  onOpenUpgradeModal, onDeleteAgent, onLogout,
}) => {
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string, type: 'chat' | 'agent' } | null>(null);
  const [newChatMenuOpen, setNewChatMenuOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [currentView, setCurrentView] = useState<'chats' | 'agents'>('chats');

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const newChatMenuRef = useRef<HTMLDivElement>(null);

  const handleRightClick = (event: React.MouseEvent, id: string, type: 'chat' | 'agent') => {
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.pageY, id, type });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null);
      if (newChatMenuRef.current && !newChatMenuRef.current.contains(event.target as Node)) setNewChatMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenuAndToggle = () => {
    if (isOpen && window.innerWidth < 1024) onToggle();
  };

  const handleCreateNewChat = (mode: AIMode) => {
      onNewChat(mode);
      setNewChatMenuOpen(false);
      closeMenuAndToggle();
  }

  const handleSwitchChatAndToggle = (chatId: string) => {
    onSwitchChat(chatId);
    closeMenuAndToggle();
  }

  const handleSelectAgentAndToggle = (agentId: string) => {
    onSelectAgent(agentId);
    closeMenuAndToggle();
  }

  const getLastMessageSnippet = (chat: ChatSession): string => {
    if (chat.messages.length === 0) return "Nova conversa";
    const lastMsg = chat.messages[chat.messages.length - 1];
    if (!lastMsg) return "Nova conversa";
    if (lastMsg.images && lastMsg.images.length > 0) return "Imagem gerada";
    if (lastMsg.svgContent) return "Logo SVG";
    if (lastMsg.videoUrl) return "Vídeo gerado";
    if (lastMsg.userImages && lastMsg.userImages.length > 0) return "Imagem enviada";
    if (lastMsg.text) {
        return lastMsg.text.substring(0, 30) + (lastMsg.text.length > 30 ? '...' : '');
    }
    return '...';
  }

  const filteredAgents = agents.filter(agent => agent.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredChats = chats.filter(chat => chat.mode !== AIMode.AgentChat && chat.title.toLowerCase().includes(filter.toLowerCase()));
  
  const sortedAgents = [...filteredAgents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const sortedChats = [...filteredChats].sort((a,b) => {
    const dateA = b.lastInteractedAt ? new Date(b.lastInteractedAt) : new Date(b.createdAt);
    const dateB = a.lastInteractedAt ? new Date(a.lastInteractedAt) : new Date(a.createdAt);
    return dateA.getTime() - dateB.getTime();
  });

  const menuCategories = [
      {
          title: "Assistentes",
          items: [
              { mode: AIMode.Fast, label: "Fast", icon: <Zap className="w-4 h-4"/> },
              { mode: AIMode.Ultra, label: "Ultra", icon: <Sparkles className="w-4 h-4"/> },
              { mode: AIMode.AgentChat, label: "Agentes", icon: <Bot className="w-4 h-4"/> },
          ]
      },
      {
          title: "Visual",
          items: [
              { mode: AIMode.DesignStudio, label: "Design", icon: <Palette className="w-4 h-4"/> },
              { mode: AIMode.HumanKing, label: "Avatar", icon: <UserCircle className="w-4 h-4"/> },
              { mode: AIMode.ProtonsHQ, label: "Protons HQ", icon: <Sparkles className="w-4 h-4"/> },
              { mode: AIMode.Visagista, label: "Visagismo", icon: <Scissors className="w-4 h-4"/> },
          ]
      },
      {
          title: "Edição",
          items: [
              { mode: AIMode.EditorKing, label: "BanaX", icon: <Wand2 className="w-4 h-4"/> },
              { mode: AIMode.KingStudio, label: "NanoStudio", icon: <Layout className="w-4 h-4"/> },
              { mode: AIMode.KingLab, label: "KingLab", icon: <FlaskConical className="w-4 h-4"/> },
          ]
      },
      {
          title: "Vídeo",
          items: [
              { mode: AIMode.VideoProtons, label: "Vídeo", icon: <Video className="w-4 h-4"/> },
          ]
      }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onToggle}
      />

      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-black/60 backdrop-blur-3xl transition-all duration-500 ease-in-out border-r border-white/10 ${isOpen ? 'w-[85vw] md:w-[280px]' : 'w-0 -translate-x-full md:w-[80px] md:translate-x-0'}`}
      >
        {/* Top Section: Toggle & New Chat */}
        <div className="p-4 md:p-6 flex flex-col gap-6 md:gap-8">
          <div className="flex items-center justify-between">
            {isOpen && (
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-highlight rounded-full shadow-[0_0_10px_rgba(0,255,0,0.5)]" />
                <span className="text-lg md:text-xl font-black tracking-tight text-white uppercase tracking-widest">Protons AI</span>
              </div>
            )}
            <button 
              onClick={onToggle}
              className="p-2.5 hover:bg-white/10 rounded-2xl transition-all w-fit text-white/40 hover:text-white active:scale-90 no-tap-highlight"
              title={isOpen ? "Recolher menu" : "Expandir menu"}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="relative" ref={newChatMenuRef}>
            <button 
              onClick={() => isOpen ? setNewChatMenuOpen(!newChatMenuOpen) : onToggle()}
              className={`flex items-center gap-3 bg-highlight text-black hover:scale-105 transition-all duration-300 rounded-2xl shadow-lg shadow-highlight/20 h-12 ${isOpen ? 'px-5 w-full' : 'w-12 px-0 justify-center mx-auto'}`}
            >
              <Plus className="w-6 h-6" />
              {isOpen && <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">Nova sessão</span>}
            </button>

            {newChatMenuOpen && isOpen && (
              <div className="absolute left-0 top-full mt-3 w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl z-50 py-4 animate-fade-in overflow-hidden">
                {menuCategories.map((cat) => (
                  <div key={cat.title} className="mb-4 last:mb-0">
                    <div className="px-6 py-1.5 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/5 mb-2">{cat.title}</div>
                    {cat.items.map(item => (
                      <button 
                        key={item.mode}
                        onClick={() => handleCreateNewChat(item.mode)}
                        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-white/10 transition-colors text-sm text-white group"
                      >
                        <span className="text-highlight group-hover:scale-110 transition-transform">{item.icon}</span>
                        <span className="font-bold tracking-tight">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Recent Chats */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2">
          {isOpen && (
            <div className="mb-4 px-4 flex items-center justify-between">
              <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Recentes</span>
              <div className="flex gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setCurrentView('chats')}
                  className={`p-2 rounded-xl transition-all ${currentView === 'chats' ? 'bg-white/10 text-highlight shadow-lg' : 'text-white/30 hover:text-white'}`}
                  title="Conversas"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentView('agents')}
                  className={`p-2 rounded-xl transition-all ${currentView === 'agents' ? 'bg-white/10 text-highlight shadow-lg' : 'text-white/30 hover:text-white'}`}
                  title="Agentes"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5 px-1">
            {currentView === 'chats' ? (
              sortedChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleSwitchChatAndToggle(chat.id)}
                  onContextMenu={(e) => handleRightClick(e, chat.id, 'chat')}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left group ${currentChatId === chat.id ? 'bg-highlight/10 text-highlight border border-highlight/20 shadow-lg shadow-highlight/5' : 'text-white/50 hover:bg-white/5 hover:text-white'} ${!isOpen ? 'justify-center px-0' : ''}`}
                  title={chat.title}
                >
                  <MessageSquare className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${currentChatId === chat.id ? 'text-highlight' : 'text-white/30'}`} />
                  {isOpen && <span className="truncate text-sm font-bold tracking-tight">{chat.title}</span>}
                </button>
              ))
            ) : (
              <>
                {isOpen && (
                  <button 
                    onClick={() => { onOpenCreateAgentModal(); closeMenuAndToggle(); }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left mb-4 text-highlight bg-highlight/5 border border-highlight/20 hover:bg-highlight/10 shadow-lg shadow-highlight/5 group"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Criar Agente</span>
                  </button>
                )}
                {sortedAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgentAndToggle(agent.id)}
                    onContextMenu={(e) => handleRightClick(e, agent.id, 'agent')}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left group ${chats.find(c => c.agentId === agent.id)?.id === currentChatId ? 'bg-highlight/10 text-highlight border border-highlight/20 shadow-lg shadow-highlight/5' : 'text-white/50 hover:bg-white/5 hover:text-white'} ${!isOpen ? 'justify-center px-0' : ''}`}
                    title={agent.name}
                  >
                    {agent.profilePictureUrl ? (
                      <img src={agent.profilePictureUrl} className="w-6 h-6 rounded-xl object-cover border border-white/10 group-hover:scale-110 transition-transform" alt="" />
                    ) : (
                      <Bot className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${chats.find(c => c.agentId === agent.id)?.id === currentChatId ? 'text-highlight' : 'text-white/30'}`} />
                    )}
                    {isOpen && <span className="truncate text-sm font-bold tracking-tight">{agent.name}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bottom Section: User & Settings */}
        <div className="p-6 border-t border-white/10 flex flex-col gap-3">
          <button 
            onClick={onShowGallery}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left text-white/50 hover:bg-white/5 hover:text-white group ${!isOpen ? 'justify-center px-0' : ''}`}
            title="Galeria"
          >
            <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
            {isOpen && <span className="text-xs font-black uppercase tracking-widest">Galeria</span>}
          </button>
          
          <button 
            onClick={onLogout}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all w-full text-left text-danger/60 hover:bg-danger/10 hover:text-danger group ${!isOpen ? 'justify-center px-0' : ''}`}
            title="Sair"
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            {isOpen && <span className="text-xs font-black uppercase tracking-widest">Desconectar</span>}
          </button>

          {isOpen && (
            <div className="mt-4 flex items-center gap-3 px-4 py-4 bg-white/5 border border-white/10 rounded-[1.5rem] backdrop-blur-md shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-highlight flex items-center justify-center text-black font-black text-sm shadow-lg shadow-highlight/30">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-white truncate tracking-tight">{currentUser?.username}</p>
                <p className="text-[9px] text-white/30 font-black uppercase tracking-[0.2em]">Acesso Root</p>
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div 
            ref={contextMenuRef} 
            className="fixed bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-2xl z-[100] py-3 min-w-[200px] animate-fade-in overflow-hidden" 
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {contextMenu.type === 'chat' ? (
              <>
                <button onClick={() => { onClearChat(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-6 py-3 text-sm font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <Eraser className="w-4 h-4 text-highlight" /> Limpar
                </button>
                <button onClick={() => { onDeleteChat(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-6 py-3 text-sm font-bold text-danger hover:bg-danger/10 flex items-center gap-3 transition-colors">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { onOpenEditAgentModal(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-6 py-3 text-sm font-bold text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                  <Edit3 className="w-4 h-4 text-highlight" /> Editar
                </button>
                <button onClick={() => { onDeleteAgent(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-6 py-3 text-sm font-bold text-danger hover:bg-danger/10 flex items-center gap-3 transition-colors">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
