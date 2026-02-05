/**
 * ============================================================
 * 🧠 LIA Hub - Módulo LIA Nativo para Dashboard-client
 * ============================================================
 * 
 * Layout:
 * - Top Tabs: Chat Mode | Multi-Modal
 * - Sidebar: Histórico de conversas + Nova Conversa
 * - Main: Componente do modo ativo
 * 
 * ============================================================
 */

import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import {
    MessageSquare, Layers, Plus, Trash2, Edit2, Search,
    Lock, MessageCircle, X, Check, RefreshCw
} from 'lucide-react';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { LIAProvider, useLIA, Conversation } from './LIAContext';
import { LanguageContext } from '../../contexts/LanguageContext';
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
    { id: 'chat', label: 'chatMode', icon: <MessageSquare className="w-4 h-4" />, requiredPlan: 'start' },
    { id: 'multimodal', label: 'multimodal', icon: <Layers className="w-4 h-4" />, requiredPlan: 'plus' },
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
    const { user, plan, profile, isAdmin } = useDashboardAuth();
    const { t } = useContext(LanguageContext);
    const lia = useLIA();

    const [activeMode, setActiveMode] = useState<'chat' | 'multimodal' | 'live'>('chat');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [planLoading, setPlanLoading] = useState(true);

    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    const getUserPlanLevel = (): number => {
        // v2.7: Remover bypass de admin para testar restrições de plano corretamente
        // Admins agora devem ter um plano atribuído manualmente no banco

        const contextPlanName = plan?.name?.toLowerCase();
        if (contextPlanName && PLAN_LEVELS[contextPlanName]) {
            console.log('[LIAHub] ✅ Plano do contexto:', contextPlanName, '→ Nível:', PLAN_LEVELS[contextPlanName]);
            return PLAN_LEVELS[contextPlanName];
        }

        const profilePlanType = (profile as any)?.plan_type?.toLowerCase();
        if (profilePlanType && PLAN_LEVELS[profilePlanType]) {
            console.log('[LIAHub] ✅ Plano do perfil:', profilePlanType, '→ Nível:', PLAN_LEVELS[profilePlanType]);
            return PLAN_LEVELS[profilePlanType];
        }

        const jwtPlan = (user?.app_metadata?.plan || user?.user_metadata?.plan)?.toLowerCase();
        if (jwtPlan && PLAN_LEVELS[jwtPlan]) {
            console.log('[LIAHub] ✅ Plano do JWT:', jwtPlan, '→ Nível:', PLAN_LEVELS[jwtPlan]);
            return PLAN_LEVELS[jwtPlan];
        }

        console.warn('[LIAHub] ⚠️ Nenhum plano detectado → Fallback: Start (nível 1)');
        console.warn('[LIAHub] Context:', { plan, profile, userEmail: user?.email });
        return 1;
    };

    const userPlanLevel = getUserPlanLevel();

    const lastRefreshedUserId = useRef<string | null>(null);

    useEffect(() => {
        if (!user) {
            setPlanLoading(true);
            return;
        }

        const hasPlan = !!(plan?.name || (profile as any)?.plan_type || user?.app_metadata?.plan);

        if (!hasPlan) {
            const timer = setTimeout(() => {
                console.warn('[LIAHub] ⏱️ Timeout ao aguardar plano → Assumindo Start');
                setPlanLoading(false);
            }, 12000); // v9.8: Aumentado para 12s (acompanhar AuthContext timeout)
            return () => clearTimeout(timer);
        } else {
            setPlanLoading(false);
        }
    }, [user, plan, profile]);

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

    const canAccessMode = (mode: LIAMode): boolean => {
        // v2.7: Remover bypass - admin agora respeita plano

        if (planLoading) {
            console.log('[LIAHub] ⏳ Aguardando carregamento do plano...');
            return true;
        }

        const tab = TABS.find(t => t.id === mode);
        if (!tab) return false;

        const hasAccess = userPlanLevel >= PLAN_LEVELS[tab.requiredPlan];

        if (!hasAccess) {
            console.warn('[LIAHub] 🔒 Acesso negado:', {
                mode,
                userPlanLevel,
                requiredLevel: PLAN_LEVELS[tab.requiredPlan],
                plan: plan?.name,
                profile: (profile as any)?.plan_type
            });
        }

        return hasAccess;
    };

    const conversationsForMode = useMemo(() => {
        return Object.values(lia.conversations)
            .filter(c => c.mode === activeMode)
            .filter(c => searchQuery ? c.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [lia.conversations, activeMode, searchQuery]);

    const activeConversationId = lia.activeConversationIdByMode[activeMode];

    useEffect(() => {
        lia.setActiveMode(activeMode);
        if (activeConversationId) {
            const scopeKey = lia.getScopeKey(activeMode, activeConversationId);
            lia.setActiveScope(scopeKey);
        }
    }, [activeMode, activeConversationId]);

    const handleTabClick = (mode: LIAMode) => {
        if (!canAccessMode(mode)) return;
        setActiveMode(mode);
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

    const renderActiveMode = () => {
        if (!canAccessMode(activeMode)) {
            return (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
                            <Lock className="h-10 w-10 text-yellow-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('lockedMode')}</h3>
                        <p className="text-gray-400 mb-4 text-sm">
                            O modo {t(TABS.find(t => t.id === activeMode)?.label as any)} {t('requiresPlan')}{' '}
                            <strong className="text-white">{TABS.find(t => t.id === activeMode)?.requiredPlan.toUpperCase()}</strong> {t('planToUpgrade')}
                        </p>
                        <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition-transform">
                            {t('upgradeNowBtn')}
                        </button>
                    </div>
                </div>
            );
        }
        switch (activeMode) {
            case 'chat': return <ChatMode />;
            case 'multimodal': return <MultiModal />;
            case 'live': return <LiveMode />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050810] overflow-hidden">
            <div className="flex-1 p-0 md:p-6 md:pt-4 min-h-0">
                <div className="relative flex h-full flex-col overflow-hidden shadow-2xl shadow-indigo-500/5 min-h-0 rounded-2xl border border-white/10 bg-[#0A0F1A]">
                    {/* Header com Tabs */}
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
                                        {isActive && (
                                            <div className={`w-2 h-2 rounded-full ${lia.isConnected ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-red-500"}`} />
                                        )}
                                        {tab.icon}
                                        <span className="hidden sm:inline">{t(tab.label as any)}</span>
                                        {isLocked && <Lock className="w-3 h-3 ml-1" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Área Principal */}
                    <div className="flex flex-1 overflow-hidden min-h-0">
                        {/* Sidebar */}
                        <div className="w-64 border-r border-white/10 flex flex-col bg-[#0A0F1A] shrink-0">
                            <div className="px-3 pt-3 pb-3 flex gap-2">
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

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 flex flex-col overflow-hidden min-h-0">
                            {renderActiveMode()}
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
