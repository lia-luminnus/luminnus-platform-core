/**
 * AvatarPreview.tsx
 * =====================================================
 * Componente de preview do avatar com canvas e controles
 * CORRIGIDO: Tamanho máximo do canvas + Botão Gerar Avatar
 * =====================================================
 */

import React, { useEffect, useRef, useState } from 'react';
import {
    Play,
    Pause,
    Mic,
    Volume2,
    Eye,
    Save,
    Loader2,
    Sparkles,
    Wand2,
    RefreshCw
} from 'lucide-react';
import { AvatarStudioController, AvatarState, EmotionType } from './AvatarStudioController';

interface Props {
    controller: AvatarStudioController;
    onLog?: (message: string) => void;
}

const EMOTIONS: { key: EmotionType; label: string; emoji: string }[] = [
    { key: 'neutral', label: 'Neutro', emoji: '😐' },
    { key: 'happy', label: 'Feliz', emoji: '😊' },
    { key: 'sad', label: 'Triste', emoji: '😢' },
    { key: 'surprised', label: 'Surpreso', emoji: '😮' },
    { key: 'angry', label: 'Bravo', emoji: '😠' },
    { key: 'curious', label: 'Curioso', emoji: '🤔' },
];

export default function AvatarPreview({ controller, onLog }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [state, setState] = useState<AvatarState>(controller.getState());
    const [testText, setTestText] = useState('Olá! Eu sou a LIA, sua assistente inteligente.');
    const [showDebug, setShowDebug] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        controller.attachCanvasRef(canvasRef as React.RefObject<HTMLCanvasElement>);
        if (onLog) controller.setLogCallback(onLog);
        const unsubscribe = controller.subscribe(setState);
        return () => unsubscribe();
    }, [controller, onLog]);

    // Gerar Avatar (iniciar engine)
    const handleGenerateAvatar = async () => {
        setIsGenerating(true);
        onLog?.('Gerando avatar...');

        const success = await controller.startEngine();

        if (success) {
            onLog?.('✅ Avatar gerado!');
        } else {
            onLog?.('❌ Erro ao gerar avatar');
        }
        setIsGenerating(false);
    };

    const handleTestSpeech = async () => {
        if (!testText.trim()) return;

        // Se engine não iniciado, gerar primeiro
        if (!state.isInitialized) {
            await handleGenerateAvatar();
        }

        await controller.testSpeech(testText);
    };

    const handleSetExpression = (emotion: EmotionType) => {
        controller.setExpression(emotion, 0.7);
    };

    const handleToggleDebug = () => {
        const isDebug = controller.toggleDebugMesh();
        setShowDebug(isDebug);
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        await controller.publish();
        setIsPublishing(false);
    };

    const handleStop = () => {
        controller.stopSpeech();
    };

    // Recriar avatar com correções
    const handleRecreateAvatar = async () => {
        setIsGenerating(true);
        onLog?.('Recriando avatar...');

        const success = await controller.resetEngine();

        if (success) {
            onLog?.('✅ Avatar recriado com sucesso!');
        } else {
            onLog?.('❌ Erro ao recriar avatar');
        }
        setIsGenerating(false);
    };

    return (
        <div className="flex flex-col items-center gap-4 max-h-full overflow-y-auto pb-4">
            {/* Canvas Container - AUTO SIZE preservando aspect ratio */}
            <div className="relative flex items-center justify-center" style={{ maxWidth: '450px', maxHeight: '600px' }}>
                <canvas
                    ref={canvasRef}
                    className="rounded-2xl shadow-2xl bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0a]"
                    style={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: '550px',
                        width: 'auto',
                        height: 'auto',
                        boxShadow: state.isSpeaking
                            ? '0 0 40px rgba(0, 243, 255, 0.4)'
                            : '0 0 20px rgba(0, 0, 0, 0.5)'
                    }}
                />

                {/* Loading overlay */}
                {(state.isLoading || isGenerating) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-2xl">
                        <Loader2 className="w-12 h-12 text-[#00f3ff] animate-spin mb-3" />
                        <span className="text-sm text-[#00f3ff]">
                            {isGenerating ? 'Gerando avatar...' : 'Carregando...'}
                        </span>
                    </div>
                )}

                {/* Speaking indicator */}
                {state.isSpeaking && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[rgba(0,243,255,0.2)] backdrop-blur-sm flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-[#00f3ff] animate-pulse" />
                        <span className="text-sm text-[#00f3ff]">Falando...</span>
                    </div>
                )}

                {/* Status badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1">
                    <div className="px-2 py-1 rounded-full bg-black/50 text-[10px]">
                        {EMOTIONS.find(e => e.key === state.currentEmotion)?.emoji || '😐'}{' '}
                        {EMOTIONS.find(e => e.key === state.currentEmotion)?.label || 'Neutro'}
                    </div>
                    {state.isInitialized && (
                        <div className="px-2 py-1 rounded-full bg-green-500/30 text-green-400 text-[10px]">
                            ✓ Ativo
                        </div>
                    )}
                </div>

                {showDebug && (
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-[#bc13fe]/50 text-[10px]">
                        DEBUG
                    </div>
                )}
            </div>

            {/* BOTÃO GERAR AVATAR - Principal */}
            {!state.isInitialized && (
                <button
                    onClick={handleGenerateAvatar}
                    disabled={isGenerating || state.isLoading}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-[rgba(0,243,255,0.3)]"
                >
                    {isGenerating ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <Wand2 className="w-6 h-6" />
                    )}
                    {isGenerating ? 'Gerando...' : 'Gerar Avatar'}
                </button>
            )}

            {/* Controles após geração */}
            {state.isInitialized && (
                <>
                    {/* Expression buttons */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                        {EMOTIONS.map((emo) => (
                            <button
                                key={emo.key}
                                onClick={() => handleSetExpression(emo.key)}
                                className={`px-2.5 py-1 rounded-full text-xs transition-all ${state.currentEmotion === emo.key
                                    ? 'bg-[#00f3ff] text-black font-semibold'
                                    : 'bg-white/10 hover:bg-white/20'
                                    }`}
                            >
                                {emo.emoji} {emo.label}
                            </button>
                        ))}
                    </div>

                    {/* Test input */}
                    <div className="w-full max-w-sm">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={testText}
                                onChange={(e) => setTestText(e.target.value)}
                                placeholder="Digite o texto para a LIA falar..."
                                className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-[#00f3ff]"
                                onKeyDown={(e) => e.key === 'Enter' && handleTestSpeech()}
                                disabled={state.isLoading || state.isSpeaking}
                            />
                            <button
                                onClick={handleTestSpeech}
                                disabled={state.isLoading || state.isSpeaking || !testText.trim()}
                                className="px-4 py-2.5 rounded-xl bg-[#00f3ff] text-black font-semibold hover:bg-[#33f5ff] disabled:opacity-50 flex items-center gap-2"
                            >
                                <Mic className="w-4 h-4" />
                                Falar
                            </button>
                        </div>
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center gap-2">
                        {state.isSpeaking && (
                            <button
                                onClick={handleStop}
                                className="px-3 py-2 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5 text-sm hover:bg-red-500/30"
                            >
                                <Pause className="w-3.5 h-3.5" />
                                Parar
                            </button>
                        )}

                        <button
                            onClick={handleToggleDebug}
                            className={`p-2 rounded-full transition-all ${showDebug ? 'bg-[#bc13fe] text-white' : 'bg-white/10 hover:bg-white/20'
                                }`}
                            title="Debug Mesh"
                        >
                            <Eye className="w-4 h-4" />
                        </button>

                        {/* Botão Recriar */}
                        <button
                            onClick={handleRecreateAvatar}
                            disabled={isGenerating}
                            className="px-3 py-2 rounded-full bg-[#bc13fe]/20 text-[#bc13fe] border border-[#bc13fe]/30 flex items-center gap-1.5 text-sm hover:bg-[#bc13fe]/30 disabled:opacity-50"
                            title="Recriar Avatar"
                        >
                            {isGenerating ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            Recriar
                        </button>

                        <button
                            onClick={handlePublish}
                            disabled={isPublishing}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isPublishing ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            Publicar
                        </button>
                    </div>
                </>
            )}

            {/* Error display */}
            {state.error && (
                <div className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm max-w-sm">
                    ❌ {state.error}
                </div>
            )}
        </div>
    );
}

