import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDashboardAuth } from '../../contexts/DashboardAuthContext';
import { getApiUrl } from '../../config/api';
import { supabase } from '../../lib/supabase';

const AdminWidget: React.FC = () => {
    const { profile, user } = useDashboardAuth();
    const [enableVoice, setEnableVoice] = useState(false);
    const [agentName, setAgentName] = useState('Suporte LIA');
    const [devEmail, setDevEmail] = useState('');

    const handleVoiceToggle = () => {
        const newValue = !enableVoice;
        setEnableVoice(newValue);
        if (newValue) {
            toast.success('Recursos de voz ativados!');
        }
    };

    const handleSendEmail = (e: React.FormEvent) => {
        e.preventDefault();
        if (!devEmail) {
            toast.error('Informe o e-mail do desenvolvedor.');
            return;
        }
        toast.success(`Instruções enviadas para ${devEmail}`);
        setDevEmail('');
    };

    // Tries to find the most accurate ID. Tenant ID is best, fallback to User ID.
    const workspaceId = profile?.tenant_id || user?.id || 'SEU_WORKSPACE_ID';

    // Note: Temporary solution: Pointing the widget source to the api server where we can eventually route it.
    // If you have a specific render URL serving the widget, put that host here.
    const widgetHostUrl = getApiUrl().replace('/api', '') + '/widget.js'; // Fallback to Unified Engine Host or you can use your preferred domain.

    const displayName = agentName.trim() || 'Suporte LIA';
    const scriptCode = `<script src="${widgetHostUrl}" data-workspace-id="${workspaceId}" data-agent-name="${displayName}" ${enableVoice ? 'data-enable-voice="true"' : ''}></script>`;

    const copyScript = async () => {
        navigator.clipboard.writeText(scriptCode);
        toast.success('Script copiado para a área de transferência!');

        // Register web_widget as active in user_integrations
        const userId = profile?.id || user?.id;
        if (userId) {
            try {
                const { data: existing } = await supabase
                    .from('user_integrations')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('provider', 'web_widget')
                    .maybeSingle();

                if (existing) {
                    await supabase
                        .from('user_integrations')
                        .update({ status: 'active', config: { agent_name: displayName, enable_voice: enableVoice } })
                        .eq('id', existing.id);
                } else {
                    await supabase
                        .from('user_integrations')
                        .insert({
                            id: crypto.randomUUID(),
                            user_id: userId,
                            provider: 'web_widget',
                            status: 'active',
                            config: { agent_name: displayName, enable_voice: enableVoice }
                        });
                }
            } catch (err) {
                console.warn('[AdminWidget] Erro ao registrar web_widget:', err);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0D111C] p-8 overflow-y-auto">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <span className="material-symbols-outlined text-4xl text-brand-primary">public</span>
                    <h1 className="text-3xl font-black tracking-tight">Atendimento Web (Widget)</h1>
                </div>
                <p className="text-gray-500 dark:text-gray-400">Instale a LIA no seu site comercial.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Coluna Principal */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Toggle de Voz */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <span className="material-symbols-outlined text-brand-primary">mic</span>
                                    Recursos de Voz
                                </h3>
                                <p className="text-sm text-gray-500 w-4/5">Permitir que usuários conversem por áudio com a LIA diretamente no site.</p>
                            </div>
                            <button
                                onClick={handleVoiceToggle}
                                className={`relative w-14 h-7 rounded-full transition-colors flex items-center \${enableVoice ? 'bg-brand-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <span className={`absolute left-1 w-5 h-5 bg-white rounded-full transition-transform \${enableVoice ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        {enableVoice && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl"
                            >
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-400">warning</span>
                                    <div>
                                        <h4 className="font-bold text-yellow-600 dark:text-yellow-400 text-sm mb-1">Aviso sobre Consumo de Créditos</h4>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-500">
                                            Interações por voz utilizam conversores STT (Fala-para-Texto) e TTS (Texto-para-Fala), que <strong>consomem créditos da plataforma de forma significativamente mais rápida</strong> do que mensagens de texto. Fique de olho no seu saldo no plano.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Nome do Agente */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary">badge</span>
                            Nome do Agente
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Personalize o nome que aparece no widget do seu site. Ex.: "Atendimento Acme", "Suporte TechStore"</p>
                        <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="Ex: Atendimento Minha Empresa"
                            maxLength={40}
                            className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors text-sm"
                        />
                        <p className="text-[11px] text-gray-400 mt-2">O nome aparecerá no cabeçalho do chat e na mensagem de boas-vindas.</p>
                    </div>

                    {/* Copiar Script */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary">code</span>
                            1. Instalação Manual (Código Pixel)
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Copie o código abaixo e cole no HTML do seu site, pouco antes do fechamento da tag <code>&lt;/body&gt;</code>.</p>

                        <div className="relative group">
                            <pre className="p-4 bg-gray-900 text-green-400 rounded-xl overflow-x-auto text-sm">
                                {scriptCode}
                            </pre>
                            <button
                                onClick={copyScript}
                                className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-all text-white flex items-center gap-2 opacity-0 group-hover:opacity-100"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                Copiar
                            </button>
                        </div>
                    </div>

                    {/* Enviar para Dev */}
                    <div className="bg-white dark:bg-white/5 p-6 rounded-3xl border border-gray-200 dark:border-white/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-bl-full -z-10" />

                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand-primary">forward_to_inbox</span>
                            2. Enviar para meu Desenvolvedor
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">Não entende de código? Digite o e-mail da sua agência ou programador que a LIA manda as instruções.</p>

                        <form onSubmit={handleSendEmail} className="flex gap-3">
                            <input
                                type="email"
                                value={devEmail}
                                onChange={(e) => setDevEmail(e.target.value)}
                                placeholder="E-mail do desenvolvedor..."
                                className="flex-1 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-primary transition-colors text-sm"
                            />
                            <button type="submit" className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-brand-primary/30 transition-all flex items-center gap-2 min-w-max">
                                <span className="material-symbols-outlined text-sm">send</span>
                                Enviar
                            </button>
                        </form>
                    </div>
                </div>

                {/* Coluna Sidebar (Preview) */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-brand-primary/20 to-purple-600/10 p-6 rounded-3xl border border-brand-primary/20 flex flex-col items-center justify-center min-h-[400px]">
                        <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col">
                            {/* Browser Mockup */}
                            <div className="bg-gray-100 dark:bg-gray-800 p-2 flex gap-2 items-center border-b border-gray-200 dark:border-white/10">
                                <div className="flex gap-1.5 ml-1 flex-shrink-0">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                                </div>
                                <div className="bg-white dark:bg-black/30 rounded-md py-1 px-3 text-[10px] text-gray-500 w-full text-center flex-1 mx-2">
                                    seu-site.com.br
                                </div>
                            </div>

                            {/* Page Content Mockup */}
                            <div className="flex-1 p-4 relative">
                                <div className="w-2/3 h-6 bg-gray-200 dark:bg-gray-800 rounded-md mb-3"></div>
                                <div className="w-full h-3 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-2"></div>
                                <div className="w-4/5 h-3 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-2"></div>
                                <div className="w-3/4 h-3 bg-gray-100 dark:bg-gray-800/50 rounded-full mb-6"></div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="h-20 bg-gray-100 dark:bg-gray-800/50 rounded-xl"></div>
                                    <div className="h-20 bg-gray-100 dark:bg-gray-800/50 rounded-xl"></div>
                                </div>

                                {/* Widget Mockup */}
                                <div className="absolute bottom-4 right-4 flex flex-col items-end gap-3 z-10 w-full px-4">
                                    <div className="bg-white dark:bg-[#1A1F2E] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 w-full max-w-[240px] overflow-hidden ml-auto flex flex-col">
                                        <div className="bg-brand-primary p-3 text-white flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px]">{agentName.substring(0, 3).toUpperCase()}</div>
                                                <div>
                                                    <div className="text-xs font-bold leading-tight">{agentName}</div>
                                                    <div className="text-[9px] text-white/70">Online agora</div>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </div>
                                        <div className="p-3 bg-gray-50 dark:bg-black/20 h-32 flex flex-col gap-2">
                                            <div className="bg-white dark:bg-gray-800 p-2 text-[10px] rounded-lg rounded-tl-none self-start shadow-sm border border-gray-100 dark:border-white/5 w-4/5">
                                                Olá! Bem-vindo ao {agentName}. Como posso ajudar?
                                            </div>
                                        </div>
                                        <div className="p-2 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1A1F2E] flex gap-2">
                                            <input type="text" placeholder="Digite..." className="flex-1 bg-gray-50 dark:bg-black/10 rounded-md px-2 text-[10px] outline-none" disabled />
                                            {enableVoice && <button className="p-1 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0 w-6 h-6"><span className="material-symbols-outlined text-[12px]">mic</span></button>}
                                        </div>
                                    </div>

                                    <div className="w-12 h-12 bg-brand-primary rounded-full shadow-lg flex items-center justify-center text-white cursor-pointer ml-auto hover:scale-105 transition-transform">
                                        <span className="material-symbols-outlined text-xl">forum</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminWidget;
