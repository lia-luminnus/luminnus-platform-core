/**
 * ============================================================
 * 🧠 LIA Hub - Chat Unificado
 * ============================================================
 * 
 * Layout:
 * - Sidebar: Histórico de conversas + Nova Conversa
 * - Main: UnifiedChat (chat único sem tabs)
 * 
 * ============================================================
 */

import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Trash2, Edit2, Search,
    MessageCircle, X, Check, RefreshCw, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { LIAProvider, useLIA, Conversation } from './LIAContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { UnifiedChat } from './UnifiedChat';

// ============================================================
// CONSTANTS
// ============================================================

const CHAT_MODE = 'multimodal' as const;

// ============================================================
// HELPER
// ============================================================

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}

// ============================================================
// LIA HUB CONTENT (Inside LIAProvider)
// ============================================================

function LIAHubContent() {
    const { user, plan, profile, isAdmin } = useDashboardAuth();
    const { t } = useContext(LanguageContext);
    const lia = useLIA();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const lastRefreshedUserId = useRef<string | null>(null);

    // Set active mode to multimodal (unified chat uses this mode)
    useEffect(() => {
        lia.setActiveMode(CHAT_MODE);
    }, []);

    // Refresh conversas
    useEffect(() => {
        const effectiveUserId = user?.id || (isDev ? '00000000-0000-0000-0000-000000000001' : null);
        if (!effectiveUserId || lastRefreshedUserId.current === effectiveUserId) return;

        const doRefresh = async () => {
            try {
                await lia.refreshConversations?.();
                lastRefreshedUserId.current = effectiveUserId;
            } catch (e) {
                console.error('❌ [LIAHub] Falha no refresh:', e);
            }
        };

        const timer = setTimeout(doRefresh, 500);
        return () => clearTimeout(timer);
    }, [user?.id, isDev]);

    const handleSync = async () => {
        await lia.refreshConversations?.();
        const btn = document.getElementById('sync-btn');
        if (btn) {
            btn.classList.add('animate-spin');
            setTimeout(() => btn.classList.remove('animate-spin'), 1000);
        }
    };

    // Filter conversations for the unified mode
    const conversationsForMode = useMemo(() => {
        return Object.values(lia.conversations)
            .filter(c => c.mode === CHAT_MODE)
            .filter(c => searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [lia.conversations, searchQuery]);

    const activeConversationId = lia.activeConversationIdByMode[CHAT_MODE];

    useEffect(() => {
        if (activeConversationId) {
            const scopeKey = lia.getScopeKey(CHAT_MODE, activeConversationId);
            lia.setActiveScope(scopeKey);
        }
    }, [activeConversationId]);

    const handleSelectConversation = (id: string) => {
        lia.switchConversation(id, CHAT_MODE);
    };

    const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        lia.deleteConversation(id);
    };

    const handleStartEdit = (conv: Conversation, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingConversationId(conv.id);
        setEditingTitle(conv.title);
    };

    const handleSaveEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (editingConversationId && editingTitle.trim()) {
            lia.renameConversation(editingConversationId, editingTitle.trim());
        }
        setEditingConversationId(null);
        setEditingTitle('');
    };

    const handleCancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingConversationId(null);
        setEditingTitle('');
    };

    return (
        <div className="flex flex-col h-full bg-[#050810] overflow-hidden">
            <div className="flex-1 p-0 md:p-6 md:pt-4 min-h-0">
                <div className="relative flex h-full flex-col overflow-hidden shadow-2xl shadow-indigo-500/5 min-h-0 rounded-2xl border border-white/10 bg-[#0A0F1A]">

                    {/* Área Principal */}
                    <div className="flex flex-1 overflow-hidden min-h-0">
                        {/* Sidebar */}
                        <div className={cn(
                            "border-r border-white/10 flex flex-col bg-[#0A0F1A] shrink-0 transition-all duration-300",
                            sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
                        )}>
                            <div className="px-3 pt-3 pb-3 flex gap-2">
                                <button
                                    onClick={() => lia.createConversation(CHAT_MODE)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nova Conversa
                                </button>
                                <button
                                    id="sync-btn"
                                    onClick={handleSync}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/10 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="px-3 pb-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder={t('searchPlaceholder')}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                                {conversationsForMode.map((conv) => {
                                    const isActive = conv.id === activeConversationId;
                                    const isEditing = editingConversationId === conv.id;
                                    return (
                                        <div
                                            key={conv.id}
                                            onClick={() => handleSelectConversation(conv.id)}
                                            className={cn(
                                                "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                                                isActive ? "bg-indigo-600/20 border border-indigo-500/30" : "hover:bg-white/5 border border-transparent"
                                            )}
                                        >
                                            <MessageCircle className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-gray-500")} />
                                            {isEditing ? (
                                                <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        value={editingTitle}
                                                        onChange={(e) => setEditingTitle(e.target.value)}
                                                        className="flex-1 bg-white/10 border border-indigo-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleSaveEdit(e as any);
                                                            if (e.key === 'Escape') handleCancelEdit(e as any);
                                                        }}
                                                    />
                                                    <button onClick={handleSaveEdit} className="p-1 hover:bg-green-500/20 rounded"><Check className="w-3 h-3 text-green-500" /></button>
                                                    <button onClick={handleCancelEdit} className="p-1 hover:bg-red-500/20 rounded"><X className="w-3 h-3 text-red-500" /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={cn("flex-1 text-sm truncate", isActive ? "text-white font-medium" : "text-gray-400")}>{conv.title}</span>
                                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                        <button onClick={(e) => handleStartEdit(conv, e)} className="p-1 hover:bg-white/10 rounded"><Edit2 className="w-3 h-3 text-gray-400" /></button>
                                                        <button onClick={(e) => handleDeleteConversation(conv.id, e)} className="p-1 hover:bg-red-500/20 rounded"><Trash2 className="w-3 h-3 text-red-500" /></button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-3 border-t border-white/10">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className={cn("w-2 h-2 rounded-full", lia.isConnected ? "bg-green-500" : "bg-red-500")} />
                                    {lia.isConnected ? t('connected') : t('disconnected')}
                                </div>
                            </div>
                        </div>

                        {/* Toggle Sidebar Button */}
                        <button
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                            className="absolute top-3 left-3 z-20 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5 md:hidden"
                            title={sidebarCollapsed ? "Mostrar sidebar" : "Esconder sidebar"}
                        >
                            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </button>

                        {/* Conteúdo Principal — Chat Unificado */}
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
                            <UnifiedChat />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LIAHub() {
    return (
        <LIAHubContent />
    );
}
