/**
 * ============================================================
 * 🧠 LIA Hub - Módulo LIA Nativo para Dashboard-client
 * ============================================================
 * 
 * Layout:
 * - Top Tabs: Chat Mode | Multi-Modal | Live Mode
 * - Sidebar: Histórico de conversas + Nova Conversa
 * - Main: Componente do modo ativo
 * 
 * Controle por Plano:
 * - Start: Apenas Chat Mode
 * - Plus: Chat + Multi-Modal
 * - Pro: Todos os 3 modos
 * - Admin: Override total (libera tudo)
 * 
 * ============================================================
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    MessageSquare, Layers, Zap, Plus, Trash2, Edit2, Search,
    Maximize2, Minimize2, Lock, ChevronRight, MessageCircle, X, Check, RefreshCw
} from 'lucide-react';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { LIAProvider, useLIA, Conversation } from './LIAContext';
import Header from '../Header';
import { ChatMode } from './ChatMode';
import { MultiModal } from './MultiModal';
import { LiveMode } from './LiveMode';

// ============================================================
// TYPES
// ============================================================

type LIAMode = 'chat' | 'multimodal' | 'live';

interface TabConfig {
    id: LIAMode;
    label: string;
    icon: React.ReactNode;
    requiredPlan: 'start' | 'plus' | 'pro';
}

// ============================================================
// CONSTANTS
// ============================================================

const TABS: TabConfig[] = [
    { id: 'chat', label: 'Chat Mode', icon: <MessageSquare className="w-4 h-4" />, requiredPlan: 'start' },
    { id: 'multimodal', label: 'Multi-Modal', icon: <Layers className="w-4 h-4" />, requiredPlan: 'plus' },
    { id: 'live', label: 'Live Mode', icon: <Zap className="w-4 h-4" />, requiredPlan: 'pro' },
];

const PLAN_LEVELS: Record<string, number> = {
    'start': 1,
    'plus': 2,
    'pro': 3,
};

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
    const { user, plan } = useDashboardAuth();
    const lia = useLIA();

    const [activeMode, setActiveMode] = useState<LIAMode>('chat');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    // Verificar se é admin (override total) - múltiplas verificações
    const adminEmails = ['luminnus.lia.ai@gmail.com', 'wendell@luminnus.com.br'];
    const isAdmin = adminEmails.includes(user?.email || '');

    // Em desenvolvimento local, liberar tudo para teste
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const userPlanName = (plan?.name || 'Start').toLowerCase();
    const userPlanLevel = PLAN_LEVELS[userPlanName] || 1;

    console.log('[LIAHub] Auth Debug:', {
        email: user?.email,
        isAdmin,
        isDev,
        plan: plan?.name,
        userPlanLevel
    });

    // Verificar acesso ao modo
    const handleSync = async () => {
        console.log('🔄 [LIAHub] Sincronizando LIA...');
        // Força recarregamento do contexto e conversas
        await lia.refreshConversations?.();
        // Feedback visual simples
        const btn = document.getElementById('sync-btn');
        if (btn) {
            btn.classList.add('animate-spin');
            setTimeout(() => btn.classList.remove('animate-spin'), 1000);
        }
    };

    const canAccessMode = (mode: LIAMode): boolean => {
        // Admin OU desenvolvimento local = libera tudo
        if (isAdmin || isDev) return true;
        const tab = TABS.find(t => t.id === mode);
        if (!tab) return false;
        return userPlanLevel >= PLAN_LEVELS[tab.requiredPlan];
    };

    // Filtrar conversas do modo atual
    const conversationsForMode = useMemo(() => {
        return Object.values(lia.conversations)
            .filter(c => c.mode === activeMode)
            .filter(c => searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [lia.conversations, activeMode, searchQuery]);

    // Conversa ativa do modo atual
    const activeConversationId = lia.activeConversationIdByMode[activeMode];
    const activeConversation = activeConversationId ? lia.conversations[activeConversationId] : null;

    // Auto-criar conversa se não existir NENHUMA para o modo
    const hasInitializedMode = useRef<Record<LIAMode, boolean>>({ chat: false, multimodal: false, live: false });

    useEffect(() => {
        // Agora apenas marcamos como inicializado quando o carregamento do backend termina
        // sem forçar a criação de conversas vazias indesejadas.
        if (lia.isInitialLoadDone) {
            hasInitializedMode.current[activeMode] = true;
        }
    }, [activeMode, lia.isInitialLoadDone]);

    // Definir escopo ativo
    useEffect(() => {
        if (activeConversationId) {
            const scopeKey = lia.getScopeKey(activeMode, activeConversationId);
            lia.setActiveScope(scopeKey);
        }
    }, [activeMode, activeConversationId]);

    // Tecla Escape para sair do fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    // Handlers
    const handleTabClick = (mode: LIAMode) => {
        if (!canAccessMode(mode)) return;
        setActiveMode(mode);
    };

    const handleNewConversation = () => {
        lia.createConversation(activeMode);
    };

    const handleSelectConversation = (id: string) => {
        lia.switchConversation(id, activeMode);
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

    // Renderizar componente do modo ativo
    const renderActiveMode = () => {
        if (!canAccessMode(activeMode)) {
            return (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <Lock className="h-10 w-10 text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Modo Bloqueado</h3>
                        <p className="text-gray-400 mb-4 text-sm">
                            O modo {TABS.find(t => t.id === activeMode)?.label} requer o plano{' '}
                            <strong className="text-white">{TABS.find(t => t.id === activeMode)?.requiredPlan.toUpperCase()}</strong> ou superior.
                        </p>
                        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-transform">
                            Fazer Upgrade
                        </button>
                    </div>
                </div>
            );
        }

        switch (activeMode) {
            case 'chat':
                return <ChatMode />;
            case 'multimodal':
                return <MultiModal />;
            case 'live':
                return <LiveMode />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050810] overflow-hidden">
            {/* NO Header here - LIA takes full control of its module view */}

            <div className="flex-1 p-0 md:p-6 md:pt-4 min-h-0">
                <div
                    className={cn(
                        "relative flex h-full flex-col overflow-hidden transition-all duration-300 ease-in-out shadow-2xl shadow-indigo-500/5 min-h-0",
                        isFullScreen
                            ? "fixed inset-0 z-[9999] h-screen bg-[#050810]"
                            : "rounded-2xl border border-white/10 bg-[#0A0F1A]"
                    )}
                >
                    {/* ============================================================ */}
                    {/* TOP TABS - Horizontal Layout */}
                    {/* ============================================================ */}
                    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-[#0D111C]">
                        <div className="flex flex-wrap gap-2">
                            {TABS.map((tab) => {
                                const isActive = activeMode === tab.id;
                                const isLocked = !canAccessMode(tab.id);

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => handleTabClick(tab.id)}
                                        disabled={isLocked}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                                                : isLocked
                                                    ? "bg-white/5 text-gray-600 cursor-not-allowed"
                                                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                                        )}
                                    >
                                        {tab.icon}
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        {isLocked && <Lock className="w-3 h-3 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Fullscreen Toggle */}
                        <button
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="h-9 w-9 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                            title={isFullScreen ? "Sair (Esc)" : "Tela Cheia"}
                        >
                            {isFullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* ============================================================ */}
                    {/* MAIN AREA (SIDEBAR + CONTENT) */}
                    {/* ============================================================ */}
                    <div className="flex flex-1 overflow-hidden min-h-0">
                        {/* SIDEBAR - Histórico de Conversas */}
                        <div className="w-64 border-r border-white/10 flex flex-col bg-[#0A0F1A] shrink-0">
                            {/* Botão Nova Conversa */}
                            <div className="px-3 pb-3 flex gap-2">
                                <button
                                    onClick={() => lia.createConversation(activeMode)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-600/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nova Conversa
                                </button>
                                <button
                                    id="sync-btn"
                                    onClick={handleSync}
                                    title="Sincronizar LIA"
                                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/10 transition-all"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Busca */}
                            <div className="px-3 pb-3">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Lista de Conversas */}
                            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                                {conversationsForMode.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        Nenhuma conversa
                                    </div>
                                ) : (
                                    conversationsForMode.map((conv) => {
                                        const isActive = conv.id === activeConversationId;
                                        const isEditing = editingConversationId === conv.id;

                                        return (
                                            <div
                                                key={conv.id}
                                                onClick={() => handleSelectConversation(conv.id)}
                                                className={cn(
                                                    "group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                                                    isActive
                                                        ? "bg-indigo-600/20 border border-indigo-500/30"
                                                        : "hover:bg-white/5 border border-transparent"
                                                )}
                                            >
                                                <MessageCircle className={cn(
                                                    "w-4 h-4 shrink-0",
                                                    isActive ? "text-indigo-400" : "text-gray-500"
                                                )} />

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
                                                        <button onClick={handleSaveEdit} className="p-1 hover:bg-green-500/20 rounded">
                                                            <Check className="w-3 h-3 text-green-500" />
                                                        </button>
                                                        <button onClick={handleCancelEdit} className="p-1 hover:bg-red-500/20 rounded">
                                                            <X className="w-3 h-3 text-red-500" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className={cn(
                                                            "flex-1 text-sm truncate",
                                                            isActive ? "text-white font-medium" : "text-gray-400"
                                                        )}>
                                                            {conv.title}
                                                        </span>

                                                        {/* Actions */}
                                                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                                            <button
                                                                onClick={(e) => handleStartEdit(conv, e)}
                                                                className="p-1 hover:bg-white/10 rounded"
                                                            >
                                                                <Edit2 className="w-3 h-3 text-gray-400" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                                                className="p-1 hover:bg-red-500/20 rounded"
                                                            >
                                                                <Trash2 className="w-3 h-3 text-red-500" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Status */}
                            <div className="p-3 border-t border-white/10">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        lia.isConnected ? "bg-green-500" : "bg-red-500"
                                    )} />
                                    {lia.isConnected ? 'Conectado' : 'Desconectado'}
                                </div>
                            </div>
                        </div>

                        {/* MAIN CONTENT - Componente do Modo */}
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
                            {renderActiveMode()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// MAIN EXPORT (Wrapped with LIAProvider)
// ============================================================

export default function LIAHub() {
    return (
        <LIAProvider>
            <LIAHubContent />
        </LIAProvider>
    );
}
