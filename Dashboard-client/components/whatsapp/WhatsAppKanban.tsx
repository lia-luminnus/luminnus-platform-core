/**
 * WhatsApp Kanban - Pipeline SDR
 * Visualização de leads em formato Kanban com drag-and-drop
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSelect from '../ui/CustomSelect';
import { getApiUrl } from '../../config/api';
import { backendService } from '../lia/services/backendService';

interface Lead {
    id: string;
    contact_name: string;
    contact_phone: string;
    company_name?: string;
    stage: string;
    urgency_score: number;
    sentiment_score: number;
    agent_mode: string;
    last_message_at: string;
    notes?: string;
    contact?: {
        name: string;
        phone: string;
    };
}

interface KanbanData {
    NEW: Lead[];
    QUALIFIED_BY_LIA: Lead[];
    WAITING_HUMAN: Lead[];
    SCHEDULED: Lead[];
    WON: Lead[];
    LOST: Lead[];
}

const STAGES = [
    { key: 'NEW', label: 'Novos', icon: 'fiber_new', color: 'bg-blue-500' },
    { key: 'QUALIFIED_BY_LIA', label: 'Qualificados', icon: 'auto_awesome', color: 'bg-purple-500' },
    { key: 'WAITING_HUMAN', label: 'Aguardando', icon: 'person', color: 'bg-amber-500' },
    { key: 'SCHEDULED', label: 'Agendados', icon: 'event', color: 'bg-cyan-500' },
    { key: 'WON', label: 'Ganhos', icon: 'emoji_events', color: 'bg-green-500' },
    { key: 'LOST', label: 'Perdidos', icon: 'cancel', color: 'bg-red-500/50' },
];

interface WhatsAppKanbanProps {
    tenantId?: string;
    onOpenChat?: (leadId: string) => void;
    onLeadClick?: (lead: Lead) => void;
}

const WhatsAppKanban: React.FC<WhatsAppKanbanProps> = ({ tenantId, onOpenChat, onLeadClick }) => {
    const navigate = useNavigate();
    const [kanban, setKanban] = useState<KanbanData>({
        NEW: [],
        QUALIFIED_BY_LIA: [],
        WAITING_HUMAN: [],
        SCHEDULED: [],
        WON: [],
        LOST: []
    });
    const [loading, setLoading] = useState(true);
    const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [agentMode, setAgentMode] = useState('SDR');

    // Função para atualizar os scores do lead selecionado
    const updateLeadScore = (field: 'urgency_score' | 'sentiment_score', value: number) => {
        if (!selectedLead) return;

        const updatedLead = { ...selectedLead, [field]: value };
        setSelectedLead(updatedLead);

        // Atualiza na lista principal para refletir no Kanban
        setKanban(prev => {
            const newKanban = { ...prev };
            Object.keys(newKanban).forEach(stage => {
                newKanban[stage as keyof KanbanData] = newKanban[stage as keyof KanbanData].map(l =>
                    l.id === selectedLead.id ? updatedLead : l
                );
            });
            return newKanban;
        });
    };

    useEffect(() => {
        const loadKanban = async () => {
            if (!tenantId) {
                setKanban({ NEW: [], QUALIFIED_BY_LIA: [], WAITING_HUMAN: [], SCHEDULED: [], WON: [], LOST: [] });
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const { headers } = backendService.getAuthContext();
                const response = await fetch(`${getApiUrl()}/api/whatsapp/kanban?tenantId=${tenantId}&mode=${agentMode}`, {
                    method: 'GET',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`Kanban request failed: ${response.status}`);
                }

                const payload = await response.json();
                const data = payload?.data?.kanban || {};

                setKanban({
                    NEW: Array.isArray(data.NEW) ? data.NEW : [],
                    QUALIFIED_BY_LIA: Array.isArray(data.QUALIFIED_BY_LIA) ? data.QUALIFIED_BY_LIA : [],
                    WAITING_HUMAN: Array.isArray(data.WAITING_HUMAN) ? data.WAITING_HUMAN : [],
                    SCHEDULED: Array.isArray(data.SCHEDULED) ? data.SCHEDULED : [],
                    WON: Array.isArray(data.WON) ? data.WON : [],
                    LOST: Array.isArray(data.LOST) ? data.LOST : []
                });
            } catch (error) {
                console.error('[WhatsAppKanban] Erro ao carregar kanban:', error);
                setKanban({ NEW: [], QUALIFIED_BY_LIA: [], WAITING_HUMAN: [], SCHEDULED: [], WON: [], LOST: [] });
            } finally {
                setLoading(false);
            }
        };

        loadKanban();
    }, [tenantId, agentMode]);

    const handleDragStart = (e: React.DragEvent, lead: Lead) => {
        setDraggedLead(lead);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStage: string) => {
        e.preventDefault();
        if (!draggedLead || draggedLead.stage === targetStage) {
            setDraggedLead(null);
            return;
        }

        const oldStage = draggedLead.stage as keyof KanbanData;
        const newStage = targetStage as keyof KanbanData;

        // Atualizar estado local otimisticamente
        setKanban(prev => {
            const updated = { ...prev };
            updated[oldStage] = prev[oldStage].filter(l => l.id !== draggedLead.id);
            updated[newStage] = [...prev[newStage], { ...draggedLead, stage: targetStage }];
            return updated;
        });

        try {
            const { headers } = backendService.getAuthContext();
            const response = await fetch(`${getApiUrl()}/api/whatsapp/leads/${draggedLead.id}/move`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ stage: targetStage })
            });

            if (!response.ok) {
                throw new Error(`Move lead failed: ${response.status}`);
            }
        } catch (error) {
            console.error('[WhatsAppKanban] Erro ao mover lead:', error);
            // Reverter mudança local se falhar
            setKanban(prev => {
                const reverted = { ...prev };
                reverted[newStage] = prev[newStage].filter(l => l.id !== draggedLead.id);
                reverted[oldStage] = [...prev[oldStage], { ...draggedLead, stage: oldStage }];
                return reverted;
            });
        } finally {
            setDraggedLead(null);
        }
    };

    const getUrgencyColor = (score: number) => {
        if (score >= 80) return 'border-l-red-500';
        if (score >= 60) return 'border-l-amber-500';
        if (score >= 40) return 'border-l-yellow-400';
        return 'border-l-gray-300';
    };

    const getSentimentEmoji = (score: number) => {
        if (score >= 70) return '😊';
        if (score >= 40) return '😐';
        return '😟';
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins}min`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
        return `${Math.floor(diffMins / 1440)}d`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#06080f] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#0a0d14] border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <span className="material-symbols-outlined">view_kanban</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Pipeline SDR</h2>
                            <p className="text-xs text-gray-500 font-medium">
                                {Object.values(kanban).flat().length} leads ativos
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CustomSelect
                            value={agentMode}
                            onChange={setAgentMode}
                            options={[
                                { label: 'Modo SDR', value: 'SDR' },
                                { label: 'Modo Suporte', value: 'SUPPORT' }
                            ]}
                            variant="glass"
                            className="min-w-[160px]"
                        />
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto p-4">
                <div className="flex gap-4 h-full min-w-max">
                    {STAGES.map((stage) => (
                        <div
                            key={stage.key}
                            className="w-72 flex flex-col bg-white/50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.key)}
                        >
                            {/* Column Header */}
                            <div className="px-4 py-3 bg-white dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                                    <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                                        {stage.label}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                    {kanban[stage.key as keyof KanbanData].length}
                                </span>
                            </div>

                            {/* Cards */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                                <AnimatePresence>
                                    {kanban[stage.key as keyof KanbanData].map((lead) => (
                                        <motion.div
                                            key={lead.id}
                                            layoutId={lead.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e as any, lead)}
                                            onClick={() => {
                                                setSelectedLead(lead);
                                                onLeadClick?.(lead);
                                            }}
                                            className={`
                                                bg-white dark:bg-[#0a0d14] rounded-xl p-3 
                                                border border-gray-100 dark:border-white/10 
                                                border-l-4 ${getUrgencyColor(lead.urgency_score)}
                                                cursor-grab active:cursor-grabbing
                                                hover:shadow-lg hover:scale-[1.02] transition-all
                                                ${draggedLead?.id === lead.id ? 'opacity-50' : ''}
                                            `}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-sm truncate">
                                                        {lead.contact_name || lead.contact?.name || 'Sem nome'}
                                                    </h4>
                                                    {lead.company_name && (
                                                        <p className="text-[10px] text-gray-500 font-medium truncate">
                                                            {lead.company_name}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-sm" title={`Sentimento: ${lead.sentiment_score}%`}>
                                                    {getSentimentEmoji(lead.sentiment_score)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] text-gray-400 font-mono">
                                                    {lead.contact_phone || lead.contact?.phone}
                                                </span>
                                            </div>

                                            {lead.notes && (
                                                <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 italic">
                                                    "{lead.notes}"
                                                </p>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1">
                                                    {lead.urgency_score >= 70 && (
                                                        <span className="flex items-center gap-0.5 text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                                            <span className="material-symbols-outlined text-[10px]">priority_high</span>
                                                            Urgente
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                    {formatTimeAgo(lead.last_message_at)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {kanban[stage.key as keyof KanbanData].length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                        <span className="material-symbols-outlined text-3xl mb-2 opacity-50">inbox</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Vazio</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Lead Detail Drawer */}
            <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex justify-end"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setSelectedLead(null)}
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            className="relative w-full max-w-md bg-white dark:bg-[#0a0d14] h-full shadow-2xl overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-black">{selectedLead.contact_name}</h3>
                                    <p className="text-sm text-gray-500">{selectedLead.contact_phone}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Badge de IA */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 w-fit">
                                    <span className="material-symbols-outlined text-sm">psychology</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Análise de IA</span>
                                </div>

                                {/* Status Editável */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 transition-all focus-within:ring-2 focus-within:ring-brand-primary/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Urgência</p>
                                            <span className="text-[10px] font-bold text-brand-primary">Editar %</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={selectedLead.urgency_score}
                                            onChange={(e) => updateLeadScore('urgency_score', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent text-2xl font-black text-brand-primary outline-none"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 transition-all focus-within:ring-2 focus-within:ring-brand-primary/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sentimento</p>
                                            <span className="text-[10px] font-bold text-gray-400">{getSentimentEmoji(selectedLead.sentiment_score)}</span>
                                        </div>
                                        <input
                                            type="number"
                                            value={selectedLead.sentiment_score}
                                            onChange={(e) => updateLeadScore('sentiment_score', parseInt(e.target.value) || 0)}
                                            className="w-full bg-transparent text-2xl font-black outline-none"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Notas</label>
                                    <textarea
                                        defaultValue={selectedLead.notes || ''}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4 text-sm resize-none h-24"
                                        placeholder="Adicionar notas..."
                                    />
                                </div>

                                {/* Ações */}
                                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        onClick={() => {
                                            if (selectedLead) {
                                                onOpenChat?.(selectedLead.id);
                                                setSelectedLead(null);
                                            }
                                        }}
                                        className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">chat</span>
                                        Abrir Conversa
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/calendar');
                                        }}
                                        className="w-full py-3 bg-gray-100 dark:bg-white/5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-white/10 active:scale-[0.98] transition-all border border-gray-200 dark:border-white/10"
                                    >
                                        <span className="material-symbols-outlined text-lg">event</span>
                                        Agendar Reunião
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppKanban;

