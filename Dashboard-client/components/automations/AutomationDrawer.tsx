import React, { useEffect, useState } from 'react';
import { X, Play, Clock, FileText, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AutomationDrawerProps {
    automationId: string | null;
    onClose: () => void;
}

const AutomationDrawer: React.FC<AutomationDrawerProps> = ({ automationId, onClose }) => {
    const [runs, setRuns] = useState<any[]>([]);
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (automationId) {
            fetchRuns();
        }
    }, [automationId]);

    const fetchRuns = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/automations/${automationId}/runs`);
            const data = await res.json();
            if (data.success) setRuns(data.data);
        } catch (err) {
            console.error('Error fetching runs:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (runId: string) => {
        try {
            const res = await fetch(`/api/automations/runs/${runId}/logs`);
            const data = await res.json();
            if (data.success) setLogs(data.data);
        } catch (err) {
            console.error('Error fetching logs:', err);
        }
    };

    if (!automationId) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex justify-end">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="relative w-full max-w-2xl bg-white dark:bg-[#0D111C] shadow-2xl h-full flex flex-col border-l border-gray-200 dark:border-white/10"
            >
                <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold dark:text-white">Execuções e Logs</h2>
                        <p className="text-sm text-gray-500">Histórico detalhado da automação</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 dark:text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Runs List */}
                    <div className="w-full md:w-64 border-r border-gray-200 dark:border-white/10 overflow-y-auto p-4 space-y-2 bg-gray-50/50 dark:bg-transparent">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Últimos Runs</h3>
                        {runs.length === 0 && !loading && (
                            <p className="text-sm text-gray-500 py-4">Nenhuma execução registrada.</p>
                        )}
                        {runs.map(run => (
                            <button 
                                key={run.id}
                                onClick={() => { setSelectedRun(run); fetchLogs(run.id); }}
                                className={`w-full text-left p-3 rounded-xl border transition-all ${selectedRun?.id === run.id 
                                    ? 'bg-brand-primary/10 border-brand-primary/30 shadow-sm' 
                                    : 'bg-white dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`w-2 h-2 rounded-full ${run.status === 'success' ? 'bg-green-500' : run.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(run.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-xs font-bold dark:text-white truncate uppercase tracking-tighter">
                                    {run.status === 'success' ? 'Sucesso' : run.status === 'failed' ? 'Falhou' : 'Executando'}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-1">{run.duration_ms || 0}ms</p>
                            </button>
                        ))}
                    </div>

                    {/* Logs Detail */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {!selectedRun ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <FileText className="w-12 h-12 mb-4 text-gray-400" />
                                <p className="text-gray-500">Selecione uma execução para ver os logs detalhados.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-2xl border border-gray-200 dark:border-white/10">
                                    <h4 className="text-xs font-black uppercase text-brand-primary mb-3">Payload de Entrada</h4>
                                    <pre className="text-[10px] text-gray-600 dark:text-gray-400 bg-black/5 p-3 rounded-lg overflow-x-auto">
                                        {JSON.stringify(selectedRun.input_payload, null, 2)}
                                    </pre>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-xs font-black uppercase text-gray-400">Passos do Fluxo</h4>
                                    {logs.map((log, i) => (
                                        <div key={i} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                    log.level === 'error' ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
                                                }`}>
                                                    {log.level === 'error' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                                                </div>
                                                {i < logs.length - 1 && <div className="w-px h-full bg-gray-200 dark:bg-white/10 my-1" />}
                                            </div>
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold dark:text-white uppercase tracking-tighter">{log.message}</p>
                                                    <span className="text-[10px] text-gray-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                {log.data && Object.keys(log.data).length > 0 && (
                                                    <pre className="mt-2 text-[9px] text-gray-500 bg-gray-50 dark:bg-black/20 p-2 rounded border border-gray-100 dark:border-white/5">
                                                        {JSON.stringify(log.data, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AutomationDrawer;
