/**
 * ConversationSidebar - Lista de conversas estilo ChatGPT
 */
import { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { ConversationItem } from './ConversationItem';

export interface Conversation {
    id: string;
    title: string;
    messages: any[];
    mode: 'chat' | 'multi-modal' | 'live';
    createdAt: number;
    updatedAt: number;
}

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewConversation: () => void;
    onRenameConversation: (id: string, title: string) => void;
    onDeleteConversation: (id: string) => void;
}

export function ConversationSidebar({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewConversation,
    onRenameConversation,
    onDeleteConversation
}: ConversationSidebarProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Header com botão Nova Conversa */}
            <div className="p-3 border-b border-[rgba(0,243,255,0.2)]">
                <button
                    onClick={onNewConversation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
            bg-gradient-to-r from-[rgba(0,243,255,0.2)] to-[rgba(188,19,254,0.2)]
            border border-[rgba(0,243,255,0.3)] text-[#00f3ff]
            hover:from-[rgba(0,243,255,0.3)] hover:to-[rgba(188,19,254,0.3)]
            transition-all duration-300 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Nova Conversa</span>
                </button>
            </div>

            {/* Lista de Conversas */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {conversations.length === 0 ? (
                    <div className="text-center py-8 text-[rgba(224,247,255,0.4)]">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Nenhuma conversa ainda</p>
                        <p className="text-xs mt-1">Clique em "Nova Conversa"</p>
                    </div>
                ) : (
                    conversations.map((conv) => (
                        <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isActive={conv.id === activeConversationId}
                            onSelect={() => onSelectConversation(conv.id)}
                            onRename={(title) => onRenameConversation(conv.id, title)}
                            onDelete={() => onDeleteConversation(conv.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
