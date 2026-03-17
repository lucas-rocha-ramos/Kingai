
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-surface transition-all duration-500 ease-in-out border-r border-border ${isOpen ? 'w-[260px]' : 'w-0 -translate-x-full md:w-[68px] md:translate-x-0'}`}
      >
        {/* Top Section: Toggle & New Chat */}
        <div className="p-4 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            {isOpen && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-highlight rounded-full animate-pulse" />
                <span className="text-lg font-bold tracking-tighter text-highlight">PROTONS AI</span>
              </div>
            )}
            <button 
              onClick={onToggle}
              className="p-2 hover:bg-panel border border-transparent hover:border-border rounded-none transition-colors w-fit text-text-secondary hover:text-text-primary"
              title={isOpen ? "Recolher menu" : "Expandir menu"}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="relative" ref={newChatMenuRef}>
            <button 
              onClick={() => isOpen ? setNewChatMenuOpen(!newChatMenuOpen) : onToggle()}
              className={`flex items-center gap-3 bg-panel hover:bg-border transition-all duration-300 rounded-none border border-highlight/20 h-11 ${isOpen ? 'px-4 w-full' : 'w-10 px-2 justify-center mx-auto'}`}
            >
              <Plus className="w-5 h-5 text-highlight" />
              {isOpen && <span className="text-sm font-medium text-text-primary whitespace-nowrap uppercase tracking-widest">Nova sessão</span>}
            </button>

            {newChatMenuOpen && isOpen && (
              <div className="absolute left-0 top-full mt-2 w-full bg-panel border border-border rounded-none shadow-2xl z-50 py-2 animate-fade-in overflow-hidden">
                {menuCategories.map((cat) => (
                  <div key={cat.title} className="mb-2 last:mb-0">
                    <div className="px-4 py-1 text-[10px] font-bold text-text-secondary uppercase tracking-widest border-b border-border/30 mb-1">{cat.title}</div>
                    {cat.items.map(item => (
                      <button 
                        key={item.mode}
                        onClick={() => handleCreateNewChat(item.mode)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-border transition-colors text-sm text-text-primary"
                      >
                        {item.icon}
                        <span className="uppercase tracking-tighter">{item.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle Section: Recent Chats */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-4">
          {isOpen && (
            <div className="mb-4 px-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Recentes</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => setCurrentView('chats')}
                  className={`p-1 rounded-none transition-colors ${currentView === 'chats' ? 'bg-panel text-highlight border border-highlight/30' : 'text-text-secondary hover:text-text-primary'}`}
                  title="Conversas"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setCurrentView('agents')}
                  className={`p-1 rounded-none transition-colors ${currentView === 'agents' ? 'bg-panel text-highlight border border-highlight/30' : 'text-text-secondary hover:text-text-primary'}`}
                  title="Agentes"
                >
                  <Bot className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {currentView === 'chats' ? (
              sortedChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => handleSwitchChatAndToggle(chat.id)}
                  onContextMenu={(e) => handleRightClick(e, chat.id, 'chat')}
                  className={`sidebar-item w-full ${currentChatId === chat.id ? 'sidebar-item-active' : ''} ${!isOpen ? 'justify-center px-0' : ''}`}
                  title={chat.title}
                >
                  <MessageSquare className="w-5 h-5 flex-shrink-0" />
                  {isOpen && <span className="truncate text-sm">{chat.title}</span>}
                </button>
              ))
            ) : (
              <>
                {isOpen && (
                  <button 
                    onClick={() => { onOpenCreateAgentModal(); closeMenuAndToggle(); }}
                    className="sidebar-item w-full mb-2 text-highlight"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Criar Agente</span>
                  </button>
                )}
                {sortedAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgentAndToggle(agent.id)}
                    onContextMenu={(e) => handleRightClick(e, agent.id, 'agent')}
                    className={`sidebar-item w-full ${chats.find(c => c.agentId === agent.id)?.id === currentChatId ? 'sidebar-item-active' : ''} ${!isOpen ? 'justify-center px-0' : ''}`}
                    title={agent.name}
                  >
                    {agent.profilePictureUrl ? (
                      <img src={agent.profilePictureUrl} className="w-5 h-5 rounded-none object-cover border border-border" alt="" />
                    ) : (
                      <Bot className="w-5 h-5 flex-shrink-0" />
                    )}
                    {isOpen && <span className="truncate text-sm">{agent.name}</span>}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Bottom Section: User & Settings */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <button 
            onClick={onShowGallery}
            className={`sidebar-item w-full ${!isOpen ? 'justify-center px-0' : ''}`}
            title="Galeria"
          >
            <ImageIcon className="w-5 h-5" />
            {isOpen && <span className="text-sm uppercase tracking-widest">Galeria</span>}
          </button>
          
          <button 
            onClick={onLogout}
            className={`sidebar-item w-full text-danger hover:bg-danger/10 ${!isOpen ? 'justify-center px-0' : ''}`}
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
            {isOpen && <span className="text-sm uppercase tracking-widest">Desconectar</span>}
          </button>

          {isOpen && (
            <div className="mt-2 flex items-center gap-3 px-2 py-2 bg-panel border border-highlight/10 rounded-none">
              <div className="w-8 h-8 rounded-none bg-highlight flex items-center justify-center text-black font-bold text-xs">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-text-primary truncate uppercase tracking-tighter">{currentUser?.username}</p>
                <p className="text-[8px] text-text-secondary uppercase">Acesso: Root</p>
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div 
            ref={contextMenuRef} 
            className="fixed bg-panel border border-border rounded-none shadow-2xl z-[100] py-1 min-w-[160px] animate-fade-in" 
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {contextMenu.type === 'chat' ? (
              <>
                <button onClick={() => { onClearChat(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface flex items-center gap-2">
                  <Eraser className="w-4 h-4" /> Limpar
                </button>
                <button onClick={() => { onDeleteChat(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </>
            ) : (
              <>
                <button onClick={() => { onOpenEditAgentModal(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-text-primary hover:bg-surface flex items-center gap-2">
                  <Edit3 className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => { onDeleteAgent(contextMenu.id); setContextMenu(null); }} className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/10 flex items-center gap-2">
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
