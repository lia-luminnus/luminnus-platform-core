import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useDashboardAuth } from '../contexts/DashboardAuthContext';

const OAuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { profile } = useDashboardAuth();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processando autorização...');
    const [details, setDetails] = useState<{
        provider?: string;
        services?: string[];
        email?: string;
    }>({});

    useEffect(() => {
        const processCallback = async () => {
            try {
                // Extrair parâmetros da URL
                const code = searchParams.get('code');
                const state = searchParams.get('state');
                const error = searchParams.get('error');

                // Se houve erro no OAuth
                if (error) {
                    const errorDescription = searchParams.get('error_description') || error;
                    throw new Error(`Autorização negada: ${errorDescription}`);
                }

                // Se não tem código
                if (!code) {
                    throw new Error('Código de autorização não encontrado');
                }

                console.log('[OAuth Callback] Código recebido, processando...');
                setMessage('Conectando com o provedor...');

                // Decodificar state para identificar o provedor
                let stateData: { user_id?: string; services?: string[] } = {};
                if (state) {
                    try {
                        stateData = JSON.parse(atob(state));
                    } catch (e) {
                        console.warn('[OAuth Callback] State inválido');
                    }
                }

                // Chamar API para trocar código por tokens
                const apiUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const response = await fetch(`${apiUrl}/api/auth/google/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        state,
                        redirect_uri: `${window.location.origin}/#/oauth/callback`
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erro ao processar callback');
                }

                const data = await response.json();
                console.log('[OAuth Callback] Conexão bem sucedida:', data);

                setStatus('success');
                setMessage('Conectado com sucesso!');
                setDetails({
                    provider: 'Google Workspace',
                    services: data.services,
                    email: data.googleEmail
                });

                toast.success('Google Workspace conectado!', { duration: 3000 });

                // Redirecionar para integrações após 2 segundos
                setTimeout(() => {
                    navigate('/integrations');
                }, 2500);

            } catch (error) {
                console.error('[OAuth Callback] Erro:', error);
                setStatus('error');
                setMessage(error instanceof Error ? error.message : 'Erro desconhecido');
                toast.error('Falha na conexão');
            }
        };

        processCallback();
    }, [searchParams, navigate, profile]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0D111C] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-[#1A1F2E] rounded-3xl p-10 max-w-md w-full shadow-2xl text-center"
            >
                {/* Ícone de Status */}
                <div className="mb-6">
                    {status === 'processing' && (
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-16 h-16 mx-auto rounded-full border-4 border-brand-primary border-t-transparent"
                        />
                    )}
                    {status === 'success' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-white text-3xl">check</span>
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-16 h-16 mx-auto rounded-full bg-red-500 flex items-center justify-center"
                        >
                            <span className="material-symbols-outlined text-white text-3xl">close</span>
                        </motion.div>
                    )}
                </div>

                {/* Título */}
                <h1 className="text-2xl font-black tracking-tight mb-2">
                    {status === 'processing' && 'Conectando...'}
                    {status === 'success' && 'Conectado!'}
                    {status === 'error' && 'Erro na Conexão'}
                </h1>

                {/* Mensagem */}
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {message}
                </p>

                {/* Detalhes do Sucesso */}
                {status === 'success' && details.services && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                            <strong>{details.email}</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {details.services.map((service) => (
                                <span
                                    key={service}
                                    className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-300 rounded-full text-xs font-bold uppercase"
                                >
                                    {service}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Ações */}
                {status === 'error' && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => navigate('/integrations')}
                            className="flex-1 px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-bold hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 px-6 py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:opacity-90 transition-all"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <p className="text-xs text-gray-400">
                        Redirecionando em 2 segundos...
                    </p>
                )}
            </motion.div>
        </div>
    );
};

export default OAuthCallback;
