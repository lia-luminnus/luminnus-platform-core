import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Check, X, Loader2 } from 'lucide-react';

const OAuthCallback: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const processingRef = React.useRef(false);

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [message, setMessage] = useState('Processando autorização...');
    const [details, setDetails] = useState<{
        provider?: string;
        services?: string[];
        email?: string;
    }>({});

    useEffect(() => {
        const processCallback = async () => {
            if (processingRef.current) return;
            processingRef.current = true;

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
                // Note: Em apps/web, as chamadas /api são proxied para o backend (port 5000)
                // IMPORTANTE: O redirect_uri DEVE corresponder EXATAMENTE ao que foi enviado ao Google
                const response = await fetch(`/api/auth/google/callback`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code,
                        state,
                        // Este redirect_uri deve ser EXATAMENTE igual ao configurado no Google Cloud Console
                        redirect_uri: 'http://localhost:3000/api/auth/google/callback'
                    })
                });

                const contentType = response.headers.get('content-type');
                let data: any;

                if (contentType && contentType.includes('application/json')) {
                    data = await response.json();
                } else {
                    const text = await response.text();
                    console.error('[OAuth Callback] Resposta não-JSON recebida:', text);
                    throw new Error(`Erro do servidor (não-JSON): ${response.status} ${response.statusText}`);
                }

                if (!response.ok) {
                    throw new Error(data.error || data.details || 'Erro ao processar callback');
                }

                console.log('[OAuth Callback] Conexão bem sucedida:', data);

                setStatus('success');
                setMessage('Conectado com sucesso!');
                setDetails({
                    provider: 'Google Workspace',
                    services: data.services,
                    email: data.googleEmail
                });

                toast.success('Google Workspace conectado!');

                // Redirecionar para o painel de integrações após um delay
                setTimeout(() => {
                    navigate('/admin-dashboard?integrations=true&success=true');
                }, 2000);

            } catch (error: any) {
                console.error('[OAuth Callback] Erro:', error);

                // Tratar erros específicos vindos do backend
                let errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
                if (errorMsg.includes('violates row-level security')) {
                    errorMsg = 'Erro de permissão no banco (RLS). Verifique se a SUPABASE_SERVICE_KEY está configurada no backend.';
                }

                setStatus('error');
                setMessage(errorMsg);
                toast.error('Falha na conexão', {
                    description: errorMsg
                });
            }
        };

        processCallback();
    }, [searchParams, navigate, user]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-900 border border-white/10 rounded-3xl p-10 max-w-md w-full shadow-2xl text-center"
            >
                {/* Ícone de Status */}
                <div className="mb-6 flex justify-center">
                    {status === 'processing' && (
                        <Loader2 className="w-16 h-16 text-purple-500 animate-spin" />
                    )}
                    {status === 'success' && (
                        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                            <Check className="text-green-500 w-8 h-8" />
                        </div>
                    )}
                    {status === 'error' && (
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
                            <X className="text-red-500 w-8 h-8" />
                        </div>
                    )}
                </div>

                {/* Título */}
                <h1 className="text-2xl font-black text-white tracking-tight mb-2">
                    {status === 'processing' && 'Conectando...'}
                    {status === 'success' && 'Conectado!'}
                    {status === 'error' && 'Erro na Conexão'}
                </h1>

                {/* Mensagem */}
                <p className="text-slate-400 mb-6">
                    {message}
                </p>

                {/* Detalhes do Sucesso */}
                {status === 'success' && details.email && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 mb-6">
                        <p className="text-sm text-green-400 mb-2">
                            <strong>{details.email}</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {details.services?.map((service) => (
                                <span
                                    key={service}
                                    className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] font-bold uppercase"
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
                            onClick={() => navigate('/admin-dashboard?integrations=true')}
                            className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-slate-300 text-sm font-bold hover:bg-white/5 transition-all"
                        >
                            Voltar
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 px-6 py-3 rounded-xl bg-purple-600 text-white text-sm font-bold hover:bg-purple-500 transition-all shadow-lg shadow-purple-600/20"
                        >
                            Tentar Novamente
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => navigate('/admin-dashboard?integrations=true')}
                            className="w-full px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-500 transition-all shadow-lg shadow-green-600/20"
                        >
                            Ir para o Painel
                        </button>
                        <p className="text-[10px] uppercase tracking-widest font-black text-slate-500 mt-2">
                            Redirecionando automaticamente...
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default OAuthCallback;
