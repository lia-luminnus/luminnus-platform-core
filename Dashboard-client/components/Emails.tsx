import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Send,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    Filter,
    ChevronRight,
    RefreshCw,
    ExternalLink
} from 'lucide-react';
import { emailService, EmailOutbox } from '../services/emailService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Emails: React.FC = () => {
    const [emails, setEmails] = useState<EmailOutbox[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'delivered' | 'failed' | 'sent'>('all');
    const [selectedEmail, setSelectedEmail] = useState<EmailOutbox | null>(null);

    useEffect(() => {
        loadEmails();
    }, []);

    const loadEmails = async () => {
        try {
            setLoading(true);
            const data = await emailService.getEmailHistory();
            setEmails(data);
        } catch (error) {
            console.error('Falha ao carregar e-mails:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmails = emails.filter(email => {
        const matchesSearch =
            email.recipient_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.subject.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filter === 'all' || email.status === filter;

        return matchesSearch && matchesFilter;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'delivered':
                return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
            case 'failed':
            case 'bounced':
            case 'complained':
                return <AlertCircle className="w-4 h-4 text-rose-400" />;
            case 'sent':
                return <Send className="w-4 h-4 text-blue-400" />;
            default:
                return <Clock className="w-4 h-4 text-amber-400" />;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'delivered': return 'Entregue';
            case 'sent': return 'Enviado';
            case 'failed': return 'Falhou';
            case 'bounced': return 'Retornado';
            case 'pending': return 'Pendente';
            default: return status;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0F1A]/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Mail className="w-6 h-6 text-[#00C2FF]" />
                            E-mails do Sistema
                        </h2>
                        <p className="text-sm text-gray-400">Gerencie e acompanhe o status das comunicações enviadas</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadEmails}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                            title="Atualizar lista"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar destinatário ou assunto..."
                                className="pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00C2FF]/50 transition-all w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-6">
                    {(['all', 'sent', 'delivered', 'failed'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filter === type
                                    ? 'bg-[#00C2FF] text-black shadow-[0_0_20px_rgba(0,194,255,0.3)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {type === 'all' ? 'Todos' : getStatusLabel(type)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {loading && emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <RefreshCw className="w-10 h-10 animate-spin text-[#00C2FF]" />
                        <p className="animate-pulse">Carregando e-mails...</p>
                    </div>
                ) : filteredEmails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                            <Mail className="w-8 h-8 opacity-20" />
                        </div>
                        <p>Nenhum e-mail encontrado para o filtro atual.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredEmails.map((email) => (
                            <motion.div
                                layout
                                key={email.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => setSelectedEmail(email)}
                                className={`group flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-[#00C2FF]/30 transition-all cursor-pointer ${selectedEmail?.id === email.id ? 'bg-white/10 border-[#00C2FF]/50 ring-1 ring-[#00C2FF]/20' : ''
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${email.status === 'delivered' ? 'bg-emerald-500/10' :
                                        email.status === 'failed' ? 'bg-rose-500/10' : 'bg-blue-500/10'
                                    }`}>
                                    {getStatusIcon(email.status)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="font-semibold text-white truncate">{email.subject}</span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">
                                            {format(new Date(email.created_at), "dd MMM, HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <span className="truncate">{email.recipient_email}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                                        <span className="text-xs uppercase tracking-wider font-bold">
                                            {getStatusLabel(email.status)}
                                        </span>
                                    </div>
                                </div>

                                <ChevronRight className={`w-5 h-5 text-gray-600 group-hover:text-[#00C2FF] transition-all transform ${selectedEmail?.id === email.id ? 'rotate-90' : ''}`} />
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedEmail && (
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#0D1424] border-l border-white/10 shadow-2xl z-50 flex flex-col"
                    >
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Detalhes do E-mail</h3>
                            <button
                                onClick={() => setSelectedEmail(null)}
                                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            >
                                <ChevronRight className="w-6 h-6 rotate-180" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 space-y-8">
                            <section>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Informações Gerais</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Assunto</label>
                                        <p className="text-white font-medium">{selectedEmail.subject}</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Destinatário</label>
                                        <p className="text-[#00C2FF] transition-colors">{selectedEmail.recipient_email}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Status</label>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(selectedEmail.status)}
                                                <span className="text-white">{getStatusLabel(selectedEmail.status)}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Data de Envio</label>
                                            <p className="text-white">{format(new Date(selectedEmail.created_at), "dd/MM/yyyy HH:mm")}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {selectedEmail.error_message && (
                                <section className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-bold text-rose-400">Erro no Envio</h4>
                                            <p className="text-sm text-rose-300/80 mt-1">{selectedEmail.error_message}</p>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Conteúdo (Preview)</h4>
                                    <button className="text-[10px] text-[#00C2FF] hover:underline flex items-center gap-1">
                                        Ver HTML <ExternalLink className="w-3 h-3" />
                                    </button>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10 max-h-60 overflow-hidden relative">
                                    <div className="text-sm text-gray-300 pointer-events-none opacity-80" dangerouslySetInnerHTML={{ __html: selectedEmail.metadata?.preview || 'Visualização limitada do conteúdo.' }} />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1424] to-transparent" />
                                </div>
                            </section>

                            <section>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Metadados Técnicos</h4>
                                <div className="p-4 rounded-xl bg-black/30 font-mono text-[10px] text-gray-400 overflow-auto max-h-40">
                                    <pre>{JSON.stringify({
                                        id: selectedEmail.id,
                                        external_id: selectedEmail.metadata?.external_id,
                                        user_id: selectedEmail.user_id,
                                        tenant_id: selectedEmail.tenant_id
                                    }, null, 2)}</pre>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-white/10 bg-white/5">
                            <button
                                className="w-full py-3 rounded-xl bg-[#00C2FF] text-black font-bold hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                Reenviar E-mail
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Emails;
