/**
 * WhatsApp Audio Inbox
 * Lista de áudios recebidos com player, transcrição e tags
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLIA } from '../lia/LIAContext';

interface AudioAsset {
    id: string;
    media_url?: string;
    duration_seconds?: number;
    transcript_text?: string;
    summary_text?: string;
    tags_json?: string[];
    intent_detected?: string;
    sentiment?: string;
    status: 'pending' | 'transcribing' | 'done' | 'failed';
    created_at: string;
    contact?: {
        name: string;
        phone: string;
    };
}

const WhatsAppAudioInbox: React.FC = () => {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
    const [selectedAudio, setSelectedAudio] = useState<AudioAsset | null>(null);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const { sendTextMessage, setActiveMode } = useLIA() || {};

    const [audios] = useState<AudioAsset[]>([
        {
            id: '1',
            media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Sample URL for testing
            duration_seconds: 45,
            transcript_text: 'Olá, gostaria de saber mais sobre os preços dos seus serviços. Vocês trabalham com empresas de médio porte? Estou buscando uma solução para automação de atendimento.',
            tags_json: ['#Orçamento', '#Comercial'],
            intent_detected: 'pricing',
            sentiment: 'positive',
            status: 'done',
            created_at: new Date(Date.now() - 3600000).toISOString(),
            contact: { name: 'João Silva', phone: '+5511999999999' }
        },
        {
            id: '2',
            media_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', // Sample URL
            duration_seconds: 28,
            transcript_text: 'Estou com um problema no sistema, não consigo acessar minha conta desde ontem. Já tentei resetar a senha mas não funcionou.',
            tags_json: ['#Suporte', '#Urgente'],
            intent_detected: 'support',
            sentiment: 'negative',
            status: 'done',
            created_at: new Date(Date.now() - 7200000).toISOString(),
            contact: { name: 'Maria Santos', phone: '+5511888888888' }
        },
        {
            id: '3',
            duration_seconds: 62,
            status: 'pending',
            created_at: new Date(Date.now() - 1800000).toISOString(),
            contact: { name: 'Pedro Costa', phone: '+5511777777777' }
        },
        {
            id: '4',
            duration_seconds: 15,
            status: 'transcribing',
            created_at: new Date(Date.now() - 900000).toISOString(),
            contact: { name: 'Ana Oliveira', phone: '+5511666666666' }
        }
    ]);

    // Handle audio ended
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleEnded = () => setPlayingId(null);
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, []);

    const filteredAudios = audios.filter(audio => {
        const matchesFilter = filter === 'all' || audio.status === filter || (filter === 'done' && audio.status === 'done');
        const matchesSearch = !search ||
            audio.transcript_text?.toLowerCase().includes(search.toLowerCase()) ||
            audio.contact?.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatTimeAgo = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
        return `${Math.floor(diffMins / 1440)} dias atrás`;
    };

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case 'positive': return 'text-green-500 bg-green-50 dark:bg-green-500/10';
            case 'negative': return 'text-red-500 bg-red-50 dark:bg-red-500/10';
            default: return 'text-gray-500 bg-gray-50 dark:bg-gray-500/10';
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="text-[9px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">Pendente</span>;
            case 'transcribing':
                return <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="animate-spin material-symbols-outlined text-[10px]">progress_activity</span>
                    Transcrevendo
                </span>;
            case 'done':
                return <span className="text-[9px] font-bold text-green-500 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">Transcrito</span>;
            case 'failed':
                return <span className="text-[9px] font-bold text-red-500 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full">Erro</span>;
            default:
                return null;
        }
    };

    const handleTranscribe = async (audioId: string) => {
        // TODO: Chamar API /api/whatsapp/audio/:id/transcribe
        alert(`Iniciando transcrição do áudio ${audioId}...`);
    };

    const handlePlayPause = (audio: AudioAsset) => {
        if (!audioRef.current) return;

        if (playingId === audio.id) {
            audioRef.current.pause();
            setPlayingId(null);
        } else {
            if (audio.media_url) {
                audioRef.current.src = audio.media_url;
                audioRef.current.play().catch(err => {
                    console.error("Erro ao tocar áudio:", err);
                });
                setPlayingId(audio.id);
            } else {
                alert('Este áudio é apenas uma demonstração visual no momento.');
            }
        }
    };

    const handleGenerateResponse = async (transcript: string) => {
        if (!sendTextMessage || !setActiveMode) return;

        // Mudar para modo chat e pedir sugestão
        const prompt = `Gere uma resposta profissional para esta mensagem de WhatsApp: "${transcript}"`;

        try {
            setActiveMode('chat');
            await sendTextMessage(prompt);
        } catch (error) {
            console.error("Erro ao enviar para LIA:", error);
            alert("Erro ao conectar com a inteligência da LIA.");
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] dark:bg-[#06080f] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white dark:bg-[#0a0d14] border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                            <span className="material-symbols-outlined">headphones</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight">Inbox de Áudios</h2>
                            <p className="text-xs text-gray-500 font-medium">
                                {audios.filter(a => a.status === 'pending').length} pendentes de transcrição
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por transcrição ou contato..."
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-primary/50"
                        />
                    </div>
                    <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl">
                        {(['all', 'pending', 'done'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filter === f
                                    ? 'bg-white dark:bg-brand-primary text-brand-primary dark:text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-white'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : 'Transcritos'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Audio List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                <AnimatePresence>
                    {filteredAudios.map((audio) => (
                        <motion.div
                            key={audio.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-white dark:bg-[#0a0d14] rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden"
                        >
                            {/* Audio Header */}
                            <div className="p-4 flex items-center gap-4">
                                {/* Play Button */}
                                <button
                                    onClick={() => handlePlayPause(audio)}
                                    disabled={audio.status === 'pending' || audio.status === 'transcribing'}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${audio.status === 'pending' || audio.status === 'transcribing'
                                        ? 'bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed'
                                        : 'bg-brand-primary text-white hover:scale-110 shadow-lg shadow-brand-primary/20'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">
                                        {playingId === audio.id ? 'pause' : 'play_arrow'}
                                    </span>
                                </button>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-sm truncate">{audio.contact?.name || 'Desconhecido'}</h4>
                                        {getStatusBadge(audio.status)}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="font-mono">{audio.contact?.phone}</span>
                                        <span>•</span>
                                        <span>{formatDuration(audio.duration_seconds)}</span>
                                        <span>•</span>
                                        <span>{formatTimeAgo(audio.created_at)}</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2">
                                    {audio.status === 'pending' && (
                                        <button
                                            onClick={() => handleTranscribe(audio.id)}
                                            className="px-3 py-1.5 bg-brand-primary/10 text-brand-primary rounded-lg text-xs font-bold hover:bg-brand-primary/20 transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">transcribe</span>
                                            Transcrever
                                        </button>
                                    )}
                                    {audio.status === 'done' && (
                                        <button
                                            onClick={() => handleGenerateResponse(audio.transcript_text || '')}
                                            className="px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg text-xs font-bold hover:bg-green-500/20 transition-all flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                            Gerar Resposta
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Transcript (if available) */}
                            {audio.transcript_text && (
                                <div className="px-4 pb-4">
                                    <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                            "{audio.transcript_text}"
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    {audio.tags_json && audio.tags_json.length > 0 && (
                                        <div className="flex items-center gap-2 mt-3">
                                            {audio.tags_json.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[10px] font-bold text-brand-primary bg-brand-primary/10 px-2 py-1 rounded-full"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                            {audio.sentiment && (
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${getSentimentColor(audio.sentiment)}`}>
                                                    {audio.sentiment === 'positive' ? '😊 Positivo' : audio.sentiment === 'negative' ? '😟 Negativo' : '😐 Neutro'}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredAudios.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <span className="material-symbols-outlined text-5xl mb-3 opacity-50">mic_off</span>
                        <p className="font-bold">Nenhum áudio encontrado</p>
                        <p className="text-sm">Ajuste os filtros ou aguarde novos áudios</p>
                    </div>
                )}
            </div>

            {/* Hidden Audio Element */}
            <audio ref={audioRef} className="hidden" />
        </div>
    );
};

export default WhatsAppAudioInbox;
