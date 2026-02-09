import React, { useState } from 'react';
import { X, Sparkles, Clock, Zap, Globe, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../config/api';

interface AutomationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AutomationWizard: React.FC<AutomationWizardProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [triggerType, setTriggerType] = useState('manual');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Mocking a flow definition for now
            const flowDefinition = [
                { id: '1', type: 'log', data: { message: `Iniciando automação ${name}` } },
                { id: '2', type: 'wait', data: { seconds: 2 } },
                { id: '3', type: 'log', data: { message: 'Aguardando LIA processar dados...' } },
                { id: '4', type: 'lia_task', data: {} },
                { id: '5', type: 'log', data: { message: 'Fluxo concluído com sucesso.' } }
            ];

            const res = await fetch(`${getApiUrl()}/api/automations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    trigger_type: triggerType,
                    status: 'draft',
                    flow_definition: flowDefinition,
                    trigger_config: triggerType === 'schedule' ? { cron: '0 0 * * *' } : {}
                })
            });

            const data = await res.json();
            if (data.success) {
                toast.success('Automação criada com sucesso!');
                onSuccess();
                onClose();
            } else {
                toast.error(data.error || 'Falha ao criar automação');
            }
        } catch (err) {
            toast.error('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg bg-white dark:bg-[#0D111C] rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-white/10"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-brand-primary text-white">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter">Nova Automação</h2>
                        <p className="text-xs text-white/70">Wizard de Configuração LIA</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Step 1: Name */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nome da Automação</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Onboard New Client"
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-brand-primary outline-none transition-all dark:text-white"
                        />
                    </div>

                    {/* Step 2: Trigger */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gatilho (Trigger)</label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'manual', label: 'Manual', icon: <Zap size={16} /> },
                                { id: 'schedule', label: 'Agendado', icon: <Clock size={16} /> },
                                { id: 'webhook', label: 'Webhook', icon: <Globe size={16} /> },
                                { id: 'event', label: 'Evento', icon: <Sparkles size={16} /> },
                            ].map(trigger => (
                                <button
                                    key={trigger.id}
                                    onClick={() => setTriggerType(trigger.id)}
                                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${triggerType === trigger.id
                                        ? 'bg-brand-primary/10 border-brand-primary text-brand-primary shadow-sm'
                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
                                        }`}
                                >
                                    {trigger.icon}
                                    <span className="text-xs font-bold uppercase tracking-tighter">{trigger.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!name || loading}
                        className="w-full py-4 rounded-2xl bg-brand-primary text-white font-black uppercase tracking-widest shadow-xl shadow-brand-primary/30 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                        Salvar e Ativar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default AutomationWizard;
