"use client"

import { useState } from "react"
import { MessageSquare, Radio, BarChart3, Zap, Plus, FolderOpen, MoreHorizontal, Edit2, Trash2, Check, X, Layers } from "lucide-react"
import type { ActiveView } from "@/app/page"
import { useLIA, Conversation } from "@/context/LIAContext"

const LIA_BUST_URL = "/images/lia-bust.png"

// Modos de navegação
const navItems = [
  { id: "chat" as const, label: "Chat Mode", icon: MessageSquare, mode: 'chat' as const },
  { id: "multimodal" as const, label: "Multi-Modal", icon: Zap, mode: 'multimodal' as const },
  { id: "live" as const, label: "Live Mode", icon: Radio, mode: 'live' as const },
  { id: "data" as const, label: "Data Insights", icon: BarChart3, mode: null },
  { id: "studio" as const, label: "Avatar Studio", icon: Layers, mode: null },
]

interface SidebarProps {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
}

export function Sidebar({ activeView, setActiveView }: SidebarProps) {
  // Usar o contexto global de conversas
  const {
    conversations,
    activeConversationIdByMode,
    currentConversationId,
    createConversation,
    switchConversation,
    renameConversation,
    deleteConversation,
    plan
  } = useLIA();

  // Modo atual baseado na view ativa
  const currentMode = navItems.find(n => n.id === activeView)?.mode || null;

  // Filtrar conversas pelo modo ativo
  const filteredConversations = currentMode
    ? Object.values(conversations)
      .filter(c => c.mode === currentMode)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    : [];

  // Criar nova conversa no modo atual
  const handleNewConversation = () => {
    if (!currentMode) return;
    createConversation(currentMode);
    console.log(`✅ Nova conversa criada para ${currentMode}`);
  };

  return (
    <aside className="w-64 h-full flex flex-col glass-panel border-r border-[rgba(0,243,255,0.2)] z-10">
      {/* Logo */}
      <div className="p-4 border-b border-[rgba(0,243,255,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] flex items-center justify-center animate-pulse-glow">
            <span className="text-[#0a0e1a] font-bold text-sm">LV</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#00f3ff] tracking-wider">LIA Viva</h1>
              {plan && (
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${plan.toLowerCase() === 'pro'
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-600 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                  : 'bg-[#00f3ff]/20 text-[#00f3ff] border border-[#00f3ff]/30'
                  }`}>
                  {plan}
                </span>
              )}
            </div>
            <p className="text-xs text-[rgba(224,247,255,0.5)] font-mono">LUMINNUS AI</p>
          </div>
        </div>
      </div>

      {/* Navigation - Modos */}
      <nav className="p-3 space-y-1 border-b border-[rgba(0,243,255,0.2)]">
        {navItems.map((item) => {
          const isActive = activeView === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 group ${isActive
                ? "bg-[rgba(0,243,255,0.15)] border border-[#00f3ff] text-[#00f3ff] shadow-[0_0_15px_rgba(0,243,255,0.3)]"
                : "text-[rgba(224,247,255,0.7)] hover:bg-[rgba(0,243,255,0.05)] hover:text-[#00f3ff] border border-transparent"
                }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? "drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]" : ""}`} />
              <span className="font-medium text-sm">{item.label}</span>
              {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-[#00f3ff] shadow-[0_0_10px_#00f3ff]" />}
            </button>
          )
        })}
      </nav>

      {/* Histórico de Conversas (dinâmico por modo) */}
      {currentMode && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Botão Nova Conversa */}
          <div className="p-3">
            <button
              onClick={handleNewConversation}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg 
                bg-gradient-to-r from-[rgba(0,243,255,0.15)] to-[rgba(188,19,254,0.15)]
                border border-[rgba(0,243,255,0.3)] text-[#00f3ff]
                hover:from-[rgba(0,243,255,0.25)] hover:to-[rgba(188,19,254,0.25)]
                transition-all duration-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              Nova Conversa
            </button>
          </div>

          {/* Lista de Conversas */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-6 text-[rgba(224,247,255,0.4)]">
                <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">Nenhuma conversa</p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationIdByMode[currentMode]}
                  onSelect={() => switchConversation(conv.id, currentMode)}
                  onRename={(title) => renameConversation(conv.id, title)}
                  onDelete={() => deleteConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Avatar Section */}
      <div className="p-4 border-t border-[rgba(0,243,255,0.2)] mt-auto">
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] opacity-30 blur-xl animate-pulse" />
          <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#00f3ff] shadow-[0_0_20px_rgba(0,243,255,0.5)]">
            <img
              src={LIA_BUST_URL || "/placeholder.svg"}
              alt="LIA Avatar"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </aside>
  )
}

// ================================================================
// COMPONENTE DE ITEM DE CONVERSA
// ================================================================

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}

function ConversationItem({ conversation, isActive, onSelect, onRename, onDelete }: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename(editTitle.trim());
    }
    setIsEditing(false);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm('Excluir esta conversa?')) {
      onDelete();
    }
    setShowMenu(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all duration-200 ${isActive
        ? 'bg-[rgba(0,243,255,0.12)] border border-[rgba(0,243,255,0.3)] text-[#00f3ff]'
        : 'text-[rgba(224,247,255,0.6)] hover:bg-[rgba(0,243,255,0.05)] border border-transparent'
        }`}
      onClick={isEditing ? undefined : onSelect}
    >
      <FolderOpen className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#00f3ff]' : 'text-[rgba(224,247,255,0.4)]'}`} />

      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(0,243,255,0.3)] rounded px-1.5 py-0.5 text-xs text-[#e0f7ff] outline-none"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
          <button onClick={handleRename} className="p-0.5 hover:text-[#00f3ff]"><Check className="w-3 h-3" /></button>
          <button onClick={() => setIsEditing(false)} className="p-0.5 hover:text-red-400"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <span className="flex-1 text-xs truncate">{conversation.title}</span>
      )}

      {!isEditing && (
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`p-0.5 rounded transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[100px] py-1 bg-[#0a0e1a] border border-[rgba(0,243,255,0.3)] rounded-lg shadow-lg">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-2 py-1 text-xs text-[rgba(224,247,255,0.8)] hover:bg-[rgba(0,243,255,0.1)]"
                >
                  <Edit2 className="w-3 h-3" />Renomear
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="w-full flex items-center gap-2 px-2 py-1 text-xs text-red-400 hover:bg-[rgba(255,0,0,0.1)]"
                >
                  <Trash2 className="w-3 h-3" />Excluir
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
