import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LanguageContext } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { QrCode, Smartphone, RefreshCw, Zap, ShieldCheck } from 'lucide-react';

interface EvolutionStatus {
    instanceName: string;
    state: 'open' | 'connecting' | 'close' | 'refused';
    statusReason?: number;
    profileName?: string;
    profilePicUrl?: string;
    owner?: string;
}

const WhatsAppConnection: React.FC<{ onComplete?: () => void; tenantIdOverride?: string }> = ({ onComplete, tenantIdOverride }) => {
    const { activeTenantId: contextTenantId } = useContext(LanguageContext) as any;
    const activeTenantId = tenantIdOverride || contextTenantId;

    const [status, setStatus] = useState<EvolutionStatus | null>(null);
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Fetch status from our own API wrapper
    const fetchStatus = async () => {
        if (!activeTenantId) return;
        try {
            const res = await fetch(`/api/whatsapp/evolution/status?tenant_id=${activeTenantId}`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status); // e.g., { state: 'open', owner: '5511999999999' }
            } else {
                setStatus(null); // Instance might not exist
            }
        } catch (error) {
            console.error('Erro ao buscar status:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateQrCode = async () => {
        if (!activeTenantId) return;
        setGenerating(true);
        setQrCodeData(null);
        try {
            const res = await fetch(`/api/whatsapp/evolution/instance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: activeTenantId })
            });

            const data = await res.json();
            if (res.ok && data.qrcode) {
                setQrCodeData(data.qrcode.base64);
                // Start polling after generating
                pollStatus();
            } else {
                toast.error(data.error || 'Erro ao gerar QR Code');
            }
        } catch (error) {
            toast.error('Erro na comunicação com o servidor');
        } finally {
            setGenerating(false);
        }
    };

    const disconnect = async () => {
        if (!activeTenantId) return;
        const confirm = window.confirm("Deseja realmente desconectar este WhatsApp? A LIA parará de responder imediatamente.");
        if (!confirm) return;

        try {
            const res = await fetch(`/api/whatsapp/evolution/instance`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: activeTenantId })
            });
            if (res.ok) {
                toast.success("Desconectado com sucesso.");
                fetchStatus();
                setQrCodeData(null);
            }
        } catch (e) {
            toast.error("Erro ao desconectar");
        }
    }

    let pollInterval: any;
    const pollStatus = () => {
        clearInterval(pollInterval);
        pollInterval = setInterval(async () => {
            const res = await fetch(`/api/whatsapp/evolution/status?tenant_id=${activeTenantId}`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data.status);
                if (data.status?.state === 'open') {
                    setQrCodeData(null);
                    clearInterval(pollInterval);
                    toast.success('WhatsApp Conectado!');
                    if (onComplete) onComplete();
                }
            }
        }, 5000);
    };

    useEffect(() => {
        fetchStatus();
        return () => clearInterval(pollInterval);
    }, [activeTenantId]);

    if (loading) return (
        <div className="p-8 flex items-center justify-center gap-3">
            <div className="w-6 h-6 rounded-full border-2 border-brand-primary border-t-transparent animate-spin"></div>
            <span className="text-sm font-black uppercase tracking-widest text-gray-400">Verificando conexão Evolution...</span>
        </div>
    );

    const isConnected = status?.state === 'open';

    return (
        <div className="p-8 space-y-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-[#0D111C] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2 tracking-tight flex items-center gap-2">
                            <Smartphone className="text-brand-primary" /> Conexão WhatsApp
                        </h2>
                        <p className="text-sm text-gray-400 font-medium">Escaneie o QR Code para conectar seu número à LIA via Evolution API.</p>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                            {isConnected ? 'Conectado' : 'Aguardando'}
                        </span>
                    </div>
                </div>

                <div className="mt-8 relative z-10">
                    {isConnected ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                {status.profilePicUrl ? (
                                    <img src={status.profilePicUrl} alt="Profile" className="w-16 h-16 rounded-full border-2 border-emerald-500 shadow-md" />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                        <Smartphone size={32} />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{status.profileName || 'WhatsApp Business'}</h3>
                                    <p className="text-sm text-gray-500">{status.owner ? `+${status.owner}` : 'Número Oculto'}</p>
                                </div>
                            </div>
                            <button
                                onClick={disconnect}
                                className="px-6 py-3 bg-red-500/10 text-red-500 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
                            >
                                Desconectar
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-black/20 rounded-3xl border border-gray-100 dark:border-white/5">
                            {qrCodeData ? (
                                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-3xl shadow-xl mb-6 border border-gray-100">
                                        <img src={qrCodeData} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">
                                        Abra o WhatsApp no seu celular, vá em <strong className="text-gray-700 dark:text-gray-300">Aparelhos Conectados</strong> e escaneie este código.
                                    </p>
                                    <button onClick={generateQrCode} className="text-brand-primary text-sm font-bold hover:underline flex items-center gap-2">
                                        <RefreshCw size={16} /> Gerar Novo QR Code
                                    </button>
                                </motion.div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-brand-primary/10 text-brand-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-brand-primary/10">
                                        <QrCode size={40} />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Pronto para conectar</h3>
                                    <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
                                        Gere o QR Code e escaneie pelo seu aplicativo do WhatsApp para habilitar a LIA neste número através da Instância Evolution.
                                    </p>
                                    <button
                                        onClick={generateQrCode}
                                        disabled={generating}
                                        className="px-8 py-4 bg-brand-primary text-white rounded-2xl text-sm font-black shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto"
                                    >
                                        {generating ? <RefreshCw className="animate-spin" size={20} /> : <QrCode size={20} />}
                                        Gerar QR Code
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sutil Decorativo */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <ShieldCheck className="text-brand-primary" size={24} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Aviso Estratégico</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        A LIA foi desenhada para atuar como <strong className="text-gray-500 dark:text-gray-300">assistente receptiva (Inbound)</strong>. Enviar centenas de mensagens não solicitadas sem "Opt-in" acarretará em bloqueio do número pelo próprio WhatsApp.
                    </p>
                </div>
                <div className="p-6 rounded-3xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-4">
                        <Zap className="text-brand-primary" size={24} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">Ativação Expressa</h4>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Esqueça verificações burocráticas no Facebook Business. Basta escanear e sua LIA já estará processando textos, imagens e escutando áudios instantaneamente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppConnection;
