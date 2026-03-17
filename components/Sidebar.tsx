
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-black/80 backdrop-blur-[40px] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] border-r border-white/5 ${isOpen ? 'w-[85vw] md:w-[320px]' : 'w-0 -translate-x-full md:w-[88px] md:translate-x-0'}`}
      >
        {/* Top Section: Toggle & New Chat */}
        <div className="p-5 md:p-8 flex flex-col gap-8 md:gap-10">
          <div className="flex items-center justify-between">
            {isOpen && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-highlight rounded-full shadow-[0_0_20px_rgba(0,255,0,0.6)] animate-pulse" />
                <span className="text-xl md:text-2xl font-black tracking-tighter text-white uppercase tracking-[0.1em]">Protons</span>
              </div>
            )}
            <button 
              onClick={onToggle}
              className="p-3 hover:bg-white/5 rounded-[1.25rem] transition-all w-fit text-white/20 hover:text-white active:scale-90 no-tap-highlight border border-transparent hover:border-white/10"
              title={isOpen ? "Recolher menu" : "Expandir menu"}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="relative" ref={newChatMenuRef}>
            <button 
              onClick={() => isOpen ? setNewChatMenuOpen(!newChatMenuOpen) : onToggle()}
              className={`flex items-center gap-4 bg-white text-black hover:scale-[1.02] active:scale-95 transition-all duration-500 rounded-[1.5rem] shadow-[0_10px_30px_rgba(255,255,255,0.1)] h-14 ${isOpen ? 'px-6 w-full' : 'w-14 px-0 justify-center mx-auto'}`}
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              {isOpen && <span className="text-xs font-black uppercase tracking-[0.2em] whitespace-nowrap">Nova Sessão</span>}
            </button>

            {newChatMenuOpen && isOpen && (
              <div className="absolute left-0 top-full mt-4 w-full bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-50 py-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-y-auto max-h-[60vh] custom-scrollbar">
                {menuCategories.map((cat) => (
                  <div key={cat.title} className="mb-6 last:mb-0">
                    <div className="px-8 py-2 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">{cat.title}</div>
                    {cat.items.map(item => (
                      <button 
                        key={item.mode}
                        onClick={() => handleCreateNewChat(item.mode)}
                        className="w-full flex items-center gap-4 px-8 py-4 hover:bg-white/5 transition-all text-sm text-white group relative overflow-hidden"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-highlight translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500" />
                        <span className="text-highlight group-hover:scale-125 transition-transform duration-500">{item.icon}</span>
                        <span className="font-bold tracking-tight group-hover:translate-x-1 transition-transform duration-500">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Recent Chats */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-2">
          {isOpen && (
            <div className="mb-6 px-4 flex items-center justify-between">
              <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">Histórico</span>
              <div className="flex gap-1.5 bg-white/5 p-1.5 rounded-[1.25rem] border border-white/5">
                <button 
                  onClick={() => setCurrentView('chats')}
                  className={`p-2.5 rounded-xl transition-all duration-500 ${currentView === 'chats' ? 'bg-white text-black shadow-xl' : 'text-white/20 hover:text-white'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentView('agents')}
                  className={`p-2.5 rounded-xl transition-all duration-500 ${currentView === 'agents' ? 'bg-white text-black shadow-xl' : 'text-white/20 hover:text-white'}`}
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 px-1">
            {currentView === 'chats' ? (
              sortedChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleSwitchChatAndToggle(chat.id)}
                  onContextMenu={(e) => handleRightClick(e, chat.id, 'chat')}
                  className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 w-full text-left group relative overflow-hidden ${currentChatId === chat.id ? 'bg-white/10 text-white border border-white/10 shadow-2xl' : 'text-white/30 hover:bg-white/5 hover:text-white'} ${!isOpen ? 'justify-center px-0' : ''}`}
                >
                  <MessageSquare className={`w-5 h-5 flex-shrink-0 transition-all duration-500 group-hover:scale-110 ${currentChatId === chat.id ? 'text-highlight' : 'text-white/20'}`} />
                  {isOpen && <span className="truncate text-sm font-bold tracking-tight leading-none">{chat.title}</span>}
                  {currentChatId === chat.id && isOpen && <div className="absolute right-4 w-1.5 h-1.5 bg-highlight rounded-full shadow-[0_0_10px_rgba(0,255,0,0.5)]" />}
                </button>
              ))
            ) : (
              <>
                {isOpen && (
                  <button 
                    onClick={() => { onOpenCreateAgentModal(); closeMenuAndToggle(); }}
                    className="flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 w-full text-left mb-6 text-black bg-white hover:scale-[1.02] active:scale-95 shadow-xl group"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500 stroke-[3]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Criar Agente</span>
                  </button>
                )}
                {sortedAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgentAndToggle(agent.id)}
                    onContextMenu={(e) => handleRightClick(e, agent.id, 'agent')}
                    className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 w-full text-left group relative overflow-hidden ${chats.find(c => c.agentId === agent.id)?.id === currentChatId ? 'bg-white/10 text-white border border-white/10 shadow-2xl' : 'text-white/30 hover:bg-white/5 hover:text-white'} ${!isOpen ? 'justify-center px-0' : ''}`}
                  >
                    {agent.profilePictureUrl ? (
                      <img src={agent.profilePictureUrl} className="w-6 h-6 rounded-xl object-cover border border-white/10 group-hover:scale-110 transition-transform duration-500" alt="" />
                    ) : (
                      <Bot className={`w-5 h-5 flex-shrink-0 transition-all duration-500 group-hover:scale-110 ${chats.find(c => c.agentId === agent.id)?.id === currentChatId ? 'text-highlight' : 'text-white/20'}`} />
                    )}
                    {isOpen && <span className="truncate text-sm font-bold tracking-tight leading-none">{agent.name}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bottom Section: User & Settings */}
        <div className="p-6 md:p-8 border-t border-white/5 flex flex-col gap-4">
          <button 
            onClick={onShowGallery}
            className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 w-full text-left text-white/20 hover:bg-white/5 hover:text-white group ${!isOpen ? 'justify-center px-0' : ''}`}
          >
            <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
            {isOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Galeria</span>}
          </button>
          
          <button 
            onClick={onLogout}
            className={`flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-500 w-full text-left text-danger/40 hover:bg-danger/10 hover:text-danger group ${!isOpen ? 'justify-center px-0' : ''}`}
          >
            <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-500" />
            {isOpen && <span className="text-[10px] font-black uppercase tracking-[0.2em]">Sair</span>}
          </button>

          {isOpen && (
            <div className="mt-4 flex items-center gap-4 px-5 py-5 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-black font-black text-base shadow-[0_10px_20px_rgba(255,255,255,0.1)] relative z-10">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0 relative z-10">
                <p className="text-sm font-black text-white truncate tracking-tight">{currentUser?.username}</p>
                <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">Root Access</p>
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
