/**
 * ConversationItem - Item individual de conversa na sidebar
 */
import { useState } from 'react';
import { FolderOpen, MoreHorizontal, Edit2, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from './ConversationSidebar';

interface ConversationItemProps {
    conversation: Conversation;
    isActive: boolean;
    onSelect: () => void;
    onRename: (title: string) => void;
    onDelete: () => void;
}

export function ConversationItem({
    conversation,
    isActive,
    onSelect,
    onRename,
    onDelete
}: ConversationItemProps) {
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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleRename();
        } else if (e.key === 'Escape') {
            setEditTitle(conversation.title);
            setIsEditing(false);
        }
    };

    const handleDelete = () => {
        if (confirm('Tem certeza que deseja excluir esta conversa?')) {
            onDelete();
        }
        setShowMenu(false);
    };

    return (
        <div
            className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${isActive
                    ? 'bg-[rgba(0,243,255,0.15)] border border-[rgba(0,243,255,0.4)] text-[#00f3ff]'
                    : 'text-[rgba(224,247,255,0.7)] hover:bg-[rgba(0,243,255,0.05)] border border-transparent'
                }`}
            onClick={isEditing ? undefined : onSelect}
        >
            {/* Ícone */}
            <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#00f3ff]' : 'text-[rgba(224,247,255,0.5)]'}`} />

            {/* Título */}
            {isEditing ? (
                <div className="flex-1 flex items-center gap-1">
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-[rgba(0,0,0,0.3)] border border-[rgba(0,243,255,0.3)] rounded px-2 py-0.5 text-sm text-[#e0f7ff] outline-none focus:border-[#00f3ff]"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={handleRename} className="p-1 hover:text-[#00f3ff]">
                        <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setEditTitle(conversation.title); setIsEditing(false); }} className="p-1 hover:text-red-400">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ) : (
                <span className="flex-1 text-sm truncate">{conversation.title}</span>
            )}

            {/* Botão Menu (aparece no hover) */}
            {!isEditing && (
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className={`p-1 rounded transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} hover:bg-[rgba(0,243,255,0.1)]`}
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] py-1 bg-[#0a0e1a] border border-[rgba(0,243,255,0.3)] rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsEditing(true); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[rgba(224,247,255,0.8)] hover:bg-[rgba(0,243,255,0.1)] hover:text-[#00f3ff]"
                                >
                                    <Edit2 className="w-3 h-3" />
                                    Renomear
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[rgba(255,0,0,0.1)]"
                                >
                                    <Trash2 className="w-3 h-3" />
                                    Excluir
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
