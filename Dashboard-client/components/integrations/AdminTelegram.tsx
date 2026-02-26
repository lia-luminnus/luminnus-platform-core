import React, { useState, useEffect } from 'react';
import Header from '../Header';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const AdminTelegram: React.FC = () => {
    const { profile } = useDashboardAuth();
    const [telegramId, setTelegramId] = useState<string>('');
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectedGroup, setConnectedGroup] = useState<{ id: string, name: string } | null>(null);

    // Bot username for LIA Manager
    // Você pode alterar este nome caso crie outro bot no BotFather (basta configurar a ENV)
    const botUsername = import.meta.env?.VITE_TELEGRAM_BOT_USERNAME || 'Lia_Lumi_Bot';

    useEffect(() => {
        loadTelegramConfig();
    }, [profile?.id]);

    const loadTelegramConfig = async () => {
        if (!profile?.id) return;

        try {
            const { data, error } = await supabase
                .from('user_integrations')
                .select('services, config_json, status')
                .eq('user_id', profile.id)
                .eq('provider', 'telegram_manager')
                .single();

            if (data && data.status === 'active') {
                setConnectedGroup({
                    id: data.config_json?.telegram_chat_id || '',
                    name: data.config_json?.telegram_user_name || 'Conta Telegram'
                });
            }
        } catch (error) {
            console.error("Erro ao puxar configuração do Telegram", error);
        }
    };

    const handleConnectId = async () => {
        if (!telegramId) {
            toast.error("Por favor, insira o seu Chat ID do Telegram.");
            return;
        }

        setIsConnecting(true);
        toast.loading("Vinculando sua conta Telegram...", { id: 'tg-connect' });

        try {
            // Em tese chamaríamos uma API interna aqui
            // Simulando gravação no Supabase como Integration
            const { data: existing } = await supabase
                .from('user_integrations')
                .select('id')
                .eq('user_id', profile?.id)
                .eq('provider', 'telegram_manager')
                .maybeSingle();

            const configJson = {
                telegram_chat_id: telegramId,
                telegram_user_name: 'Admin E-Manager'
            };

            let res;
            if (existing) {
                res = await supabase
                    .from('user_integrations')
                    .update({ status: 'active', config_json: configJson })
                    .eq('id', existing.id);
            } else {
                res = await supabase
                    .from('user_integrations')
                    .insert({
                        user_id: profile?.id,
                        provider: 'telegram_manager',
                        status: 'active',
                        config_json: configJson
                    });
            }

            if (res.error) throw res.error;

            toast.success("Telegram E-Manager ativado com sucesso!", { id: 'tg-connect' });
            loadTelegramConfig();
        } catch (error) {
            console.error("Erro ao vincular TG:", error);
            toast.error("Falha ao salvar a vinculação.", { id: 'tg-connect' });
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!profile?.id) return;

        toast.loading("Desconectando Telegram...", { id: 'tg-disconnect' });
        try {
            await supabase
                .from('user_integrations')
                .update({ status: 'disconnected', config_json: {} })
                .eq('user_id', profile.id)
                .eq('provider', 'telegram_manager');

            setConnectedGroup(null);
            setTelegramId('');
            toast.success("Telegram desconectado.", { id: 'tg-disconnect' });
        } catch (e) {
            console.error(e);
            toast.error("Falha ao desconectar.", { id: 'tg-disconnect' });
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0D111C]">
            <Header title="E-Manager (Gestão via Telegram)" />

            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-8">
                    {/* Informational Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-8 bg-gradient-to-r from-blue-500/10 via-telegram-blue/5 to-transparent rounded-3xl border border-blue-500/20"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-[#0088cc]/20 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-4xl text-[#0088cc]">send</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-[#0088cc] mb-2 tracking-tight">O que é o LIA E-Manager?</h2>
                                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-4">
                                    Diferente do WhatsApp, que foca no atendimento ao seu <strong>cliente final</strong>,
                                    o Telegram E-Manager é o seu <strong>Controle Remoto Pessoal</strong> de dono de negócio.
                                    Conecte seu Telegram pessoal para:
                                </p>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                                    <li className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[#0088cc] text-lg">insights</span>
                                        <strong>Receber Relatórios Diários</strong> e resumos de vendas.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                                        <strong>Alertas de Anomalias</strong> (ex: estoque crítico).
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-green-500 text-lg">mic</span>
                                        Dar comandos por voz para a LIA investigar algo na sua empresa.
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-purple-500 text-lg">security</span>
                                        Acesso privado, criptografado e sem risco de banimento de número.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </motion.div>

                    {/* Connection Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8"
                    >
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary">link</span>
                            Vincular Conta
                        </h3>

                        {connectedGroup ? (
                            <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-green-500/10 border border-green-500/30 rounded-2xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-500 text-2xl">check_circle</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-green-700 dark:text-green-400">Telegram Vinculado</h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Chat ID: <span className="font-mono text-gray-800 dark:text-gray-200">{connectedGroup.id}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 md:mt-0 flex gap-3">
                                    <a
                                        href={`https://t.me/${botUsername}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-5 py-2.5 bg-[#0088cc] text-white rounded-xl font-bold text-sm hover:opacity-90 flex items-center gap-2 transition-all shadow-lg shadow-[#0088cc]/30"
                                    >
                                        <span className="material-symbols-outlined text-lg">open_in_new</span>
                                        Abrir no Telegram
                                    </a>
                                    <button
                                        onClick={handleDisconnect}
                                        className="px-5 py-2.5 border-2 border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-xl font-bold text-sm transition-all"
                                    >
                                        Desvincular
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <div className="space-y-4 mb-6">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            <strong>Passo 1:</strong> Abra o aplicativo do Telegram e busque por <span className="text-[#0088cc] font-mono select-all">@{botUsername}</span> ou clique no botão ao lado.
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            <strong>Passo 2:</strong> Envie a mensagem <code>/start</code> para o bot.
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            <strong>Passo 3:</strong> Envie o comando <code>/myid</code> para ele retornar o seu <strong>Chat ID Numérico</strong>. Coloque esse número abaixo.
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ex: 123456789"
                                            value={telegramId}
                                            onChange={(e) => setTelegramId(e.target.value)}
                                            className="flex-1 px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0088cc] text-sm font-mono"
                                        />
                                        <button
                                            onClick={handleConnectId}
                                            disabled={isConnecting}
                                            className="px-6 py-3 bg-[#0088cc] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#0088cc]/30 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {isConnecting ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Vincular ID'}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-center p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-white p-2 rounded-2xl mx-auto mb-4 hover:scale-105 transition-transform shadow-xl">
                                            {/* Mock de um QR code real apenas para visual (opcional) */}
                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://t.me/${botUsername}`} alt="Telegram Bot QR" className="w-full h-full rounded-xl" />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Escaneie com a câmera ou clique no botão abaixo.</p>
                                        <a
                                            href={`https://t.me/${botUsername}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-4 px-5 py-2.5 border-2 border-[#0088cc]/30 text-[#0088cc] rounded-xl font-bold text-sm w-full inline-block hover:bg-[#0088cc]/10 transition-all"
                                        >
                                            Abrir Link Direto do Bot
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default AdminTelegram;
