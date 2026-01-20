/**
 * WhatsApp Briefing Config
 * Configurador no-code de briefings programados
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BriefingRule {
    id?: string;
    name: string;
    enabled: boolean;
    schedule_cron: string;
    schedule_timezone: string;
    recipients: { phone: string; name: string }[];
    kpis: string[];
    channel: 'whatsapp' | 'email' | 'both';
}

const AVAILABLE_KPIS = [
    { key: 'leads_new', label: 'Leads Novos', icon: 'person_add' },
    { key: 'leads_qualified', label: 'Leads Qualificados', icon: 'verified' },
    { key: 'leads_won', label: 'Leads Convertidos', icon: 'emoji_events' },
    { key: 'messages_received', label: 'Mensagens Recebidas', icon: 'inbox' },
    { key: 'messages_sent', label: 'Mensagens Enviadas', icon: 'send' },
    { key: 'response_time_avg', label: 'Tempo Médio de Resposta', icon: 'timer' },
    { key: 'sentiment_avg', label: 'Sentimento Médio', icon: 'sentiment_satisfied' },
    { key: 'audios_transcribed', label: 'Áudios Transcritos', icon: 'headphones' },
];

const SCHEDULE_PRESETS = [
    { label: 'Diário às 8h', cron: '0 8 * * *' },
    { label: 'Diário às 18h', cron: '0 18 * * *' },
    { label: 'Seg-Sex às 9h', cron: '0 9 * * 1-5' },
    { label: 'Semanal (Segunda)', cron: '0 9 * * 1' },
    { label: 'Mensal (Dia 1)', cron: '0 9 1 * *' },
];

const WhatsAppBriefingConfig: React.FC = () => {
    const [rules, setRules] = useState<BriefingRule[]>([
        {
            id: '1',
            name: 'Briefing Diário SDR',
            enabled: true,
            schedule_cron: '0 8 * * 1-5',
            schedule_timezone: 'America/Sao_Paulo',
            recipients: [{ phone: '+5511999999999', name: 'João Gestor' }],
            kpis: ['leads_new', 'leads_qualified', 'messages_received', 'sentiment_avg'],
            channel: 'whatsapp'
        }
    ]);
    const [isEditing, setIsEditing] = useState(false);
    const [editingRule, setEditingRule] = useState<BriefingRule | null>(null);
    const [newRecipient, setNewRecipient] = useState({ phone: '', name: '' });

    const handleNewRule = () => {
        setEditingRule({
            name: '',
            enabled: true,
            schedule_cron: '0 8 * * 1-5',
            schedule_timezone: 'America/Sao_Paulo',
            recipients: [],
            kpis: [],
            channel: 'whatsapp'
        });
        setIsEditing(true);
    };

    const handleEditRule = (rule: BriefingRule) => {
        setEditingRule({ ...rule });
        setIsEditing(true);
    };

    const handleSaveRule = () => {
        if (!editingRule) return;

        if (editingRule.id) {
            setRules(prev => prev.map(r => r.id === editingRule.id ? editingRule : r));
        } else {
            setRules(prev => [...prev, { ...editingRule, id: Date.now().toString() }]);
        }

        setIsEditing(false);
        setEditingRule(null);
    };

    const handleDeleteRule = (id: string) => {
        if (confirm('Deseja realmente excluir esta regra de briefing?')) {
            setRules(prev => prev.filter(r => r.id !== id));
        }
    };

    const handleToggleKpi = (kpiKey: string) => {
        if (!editingRule) return;

        const kpis = editingRule.kpis.includes(kpiKey)
            ? editingRule.kpis.filter(k => k !== kpiKey)
            : [...editingRule.kpis, kpiKey];

        setEditingRule({ ...editingRule, kpis });
    };

    const handleAddRecipient = () => {
        if (!editingRule || !newRecipient.phone) return;

        setEditingRule({
            ...editingRule,
            recipients: [...editingRule.recipients, { ...newRecipient }]
        });
        setNewRecipient({ phone: '', name: '' });
    };

    const handleRemoveRecipient = (index: number) => {
        if (!editingRule) return;

        setEditingRule({
            ...editingRule,
            recipients: editingRule.recipients.filter((_, i) => i !== index)
        });
    };

    const [isRunningNow, setIsRunningNow] = useState<string | null>(null);

    const handleRunNow = async (rule: BriefingRule) => {
        setIsRunningNow(rule.id || 'new');
        // Simular execução (Chamar API real aqui no futuro)
        setTimeout(() => {
            setIsRunningNow(null);
            alert(`Briefing "${rule.name}" processado e enviado aos destinatários via LIA.`);
        }, 2500);
    };

    const getScheduleLabel = (cron: string) => {
        const preset = SCHEDULE_PRESETS.find(p => p.cron === cron);
        return preset?.label || cron;
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#06080f] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#0a0d14] border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <span className="material-symbols-outlined">schedule_send</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Briefings Programados</h2>
                            <p className="text-xs text-gray-500 font-medium">
                                {rules.filter(r => r.enabled).length} regras ativas
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleNewRule}
                        className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Novo Briefing
                    </button>
                </div>
            </div>

            {/* Rules List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {rules.map((rule) => (
                    <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-[#0a0d14] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
                    >
                        <div className="p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    <div>
                                        <h3 className="font-bold text-base">{rule.name}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">schedule</span>
                                            {getScheduleLabel(rule.schedule_cron)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleRunNow(rule)}
                                        disabled={isRunningNow === rule.id}
                                        className={`p-2 rounded-lg transition-all ${isRunningNow === rule.id
                                            ? 'text-brand-primary animate-pulse'
                                            : 'text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                        title="Executar agora"
                                    >
                                        <span className={`material-symbols-outlined text-lg ${isRunningNow === rule.id ? 'animate-spin' : ''}`}>
                                            {isRunningNow === rule.id ? 'sync' : 'play_arrow'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleEditRule(rule)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-brand-primary"
                                        title="Editar"
                                    >
                                        <span className="material-symbols-outlined text-lg">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRule(rule.id!)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-red-500"
                                        title="Excluir"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* KPIs */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {rule.kpis.map((kpiKey) => {
                                    const kpi = AVAILABLE_KPIS.find(k => k.key === kpiKey);
                                    return kpi ? (
                                        <span
                                            key={kpiKey}
                                            className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-xs">{kpi.icon}</span>
                                            {kpi.label}
                                        </span>
                                    ) : null;
                                })}
                            </div>

                            {/* Recipients */}
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="material-symbols-outlined text-sm">group</span>
                                {rule.recipients.length} destinatário(s)
                                <span className="mx-2">•</span>
                                <span className="material-symbols-outlined text-sm">
                                    {rule.channel === 'whatsapp' ? 'chat' : rule.channel === 'email' ? 'email' : 'notifications'}
                                </span>
                                {rule.channel === 'whatsapp' ? 'WhatsApp' : rule.channel === 'email' ? 'E-mail' : 'Ambos'}
                            </div>
                        </div>
                    </motion.div>
                ))}

                {rules.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-3 opacity-50">schedule_send</span>
                        <p className="font-bold">Nenhum briefing configurado</p>
                        <p className="text-sm mb-4">Crie regras para receber resumos automáticos</p>
                        <button
                            onClick={handleNewRule}
                            className="px-4 py-2 bg-brand-primary text-white rounded-xl text-xs font-bold"
                        >
                            Criar Primeiro Briefing
                        </button>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && editingRule && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsEditing(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-2xl bg-white dark:bg-[#0a0d14] rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                                <h3 className="text-xl font-black">
                                    {editingRule.id ? 'Editar Briefing' : 'Novo Briefing'}
                                </h3>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Nome */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Nome do Briefing</label>
                                    <input
                                        type="text"
                                        value={editingRule.name}
                                        onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-brand-primary/50"
                                        placeholder="Ex: Briefing Diário SDR"
                                    />
                                </div>

                                {/* Agendamento */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Agendamento</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {SCHEDULE_PRESETS.map((preset) => (
                                            <button
                                                key={preset.cron}
                                                onClick={() => setEditingRule({ ...editingRule, schedule_cron: preset.cron })}
                                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${editingRule.schedule_cron === preset.cron
                                                    ? 'bg-brand-primary text-white'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                                                    }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* KPIs */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">KPIs a Incluir</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_KPIS.map((kpi) => (
                                            <button
                                                key={kpi.key}
                                                onClick={() => handleToggleKpi(kpi.key)}
                                                className={`p-3 rounded-xl flex items-center gap-2 text-left transition-all ${editingRule.kpis.includes(kpi.key)
                                                    ? 'bg-brand-primary/10 border-2 border-brand-primary text-brand-primary'
                                                    : 'bg-gray-50 dark:bg-white/5 border-2 border-transparent text-gray-600 dark:text-gray-300 hover:border-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
                                                <span className="text-xs font-bold">{kpi.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Destinatários */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Destinatários</label>
                                    <div className="space-y-2 mb-3">
                                        {editingRule.recipients.map((recipient, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-white/5 rounded-xl">
                                                <span className="material-symbols-outlined text-gray-400">person</span>
                                                <span className="flex-1 text-sm font-medium">{recipient.name || recipient.phone}</span>
                                                <span className="text-xs text-gray-500">{recipient.phone}</span>
                                                <button
                                                    onClick={() => handleRemoveRecipient(index)}
                                                    className="p-1 hover:bg-red-100 dark:hover:bg-red-500/10 rounded text-red-500"
                                                >
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newRecipient.phone}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                                            placeholder="+5511999999999"
                                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                                        />
                                        <input
                                            type="text"
                                            value={newRecipient.name}
                                            onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                                            placeholder="Nome (opcional)"
                                            className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm outline-none"
                                        />
                                        <button
                                            onClick={handleAddRecipient}
                                            className="px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-xl font-bold text-sm hover:bg-brand-primary/20"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                </div>

                                {/* Canal */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Canal de Envio</label>
                                    <div className="flex gap-2">
                                        {(['whatsapp', 'email', 'both'] as const).map((channel) => (
                                            <button
                                                key={channel}
                                                onClick={() => setEditingRule({ ...editingRule, channel })}
                                                className={`flex-1 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${editingRule.channel === channel
                                                    ? 'bg-brand-primary text-white'
                                                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300'
                                                    }`}
                                            >
                                                <span className="material-symbols-outlined text-lg">
                                                    {channel === 'whatsapp' ? 'chat' : channel === 'email' ? 'email' : 'notifications'}
                                                </span>
                                                {channel === 'whatsapp' ? 'WhatsApp' : channel === 'email' ? 'E-mail' : 'Ambos'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-gray-100 dark:border-white/5 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveRule}
                                    disabled={!editingRule.name || editingRule.kpis.length === 0}
                                    className="px-8 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all"
                                >
                                    Salvar Briefing
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppBriefingConfig;
