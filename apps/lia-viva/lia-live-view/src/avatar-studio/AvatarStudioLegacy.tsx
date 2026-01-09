/**
 * AvatarStudioLegacy.tsx - Original 2D Avatar Studio
 * Preserved for backward compatibility
 * The main AvatarStudio now uses the 3D version
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    Sparkles,
    RotateCcw,
    Wifi,
    WifiOff,
    Info,
    Layers
} from 'lucide-react';
import AvatarUploader from './AvatarUploader';
import AvatarPreview from './AvatarPreview';
import { AvatarStudioController, AvatarImage } from './AvatarStudioController';

export default function AvatarStudioLegacy() {
    // Controller singleton
    const controller = useMemo(() => new AvatarStudioController(), []);

    // State
    const [images, setImages] = useState<AvatarImage[]>([]);
    const [logs, setLogs] = useState<string[]>([
        '🎭 Avatar Studio v2.0 - Engine Pro (Legacy 2D)',
        '📡 Aguardando imagens...'
    ]);
    const [isConnected, setIsConnected] = useState(false);

    // Log function
    const log = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        setLogs(prev => [...prev.slice(-50), `${timestamp} - ${message}`]);
    }, []);

    // Check backend connection
    useEffect(() => {
        const checkConnection = async () => {
            try {
                const res = await fetch('/api/health');
                setIsConnected(res.ok);
            } catch {
                setIsConnected(false);
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 15000);
        return () => clearInterval(interval);
    }, []);

    // Set log callback on controller and load saved images
    useEffect(() => {
        controller.setLogCallback(log);

        // Load saved images from IndexedDB
        controller.init().then(() => {
            const savedImages = controller.getImages();
            if (savedImages.length > 0) {
                setImages(savedImages);
                log(`✅ ${savedImages.length} imagem(ns) restaurada(s) do cache`);
            }
        });

        return () => controller.destroy();
    }, [controller, log]);

    // Handle images change
    const handleImagesChange = useCallback((newImages: AvatarImage[]) => {
        setImages(newImages);
        if (newImages.length > 0) {
            log(`${newImages.length} imagem(ns) carregada(s)`);
        }
    }, [log]);

    // Reset
    const handleReset = useCallback(() => {
        controller.destroy();
        setImages([]);
        setLogs(['🎭 Avatar Studio resetado']);
    }, [controller]);

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] text-[#e0f7ff]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f3ff] to-[#bc13fe] flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold">Avatar Studio (2D Legacy)</h1>
                        <p className="text-xs text-[rgba(224,247,255,0.5)]">
                            Engine Pro • Sandbox Isolado
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Connection status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${isConnected
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                        }`}>
                        {isConnected ? (
                            <><Wifi className="w-3 h-3" /> Backend OK</>
                        ) : (
                            <><WifiOff className="w-3 h-3" /> Offline</>
                        )}
                    </div>

                    {/* Reset button */}
                    <button
                        onClick={handleReset}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                        title="Resetar Studio"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Uploader */}
                <div className="w-80 border-r border-[rgba(255,255,255,0.05)] flex flex-col">
                    <div className="p-4 flex-1 overflow-y-auto">
                        <h3 className="text-sm font-semibold text-[#bc13fe] mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4" />
                            Imagens do Avatar
                        </h3>
                        <AvatarUploader
                            controller={controller}
                            onImagesChange={handleImagesChange}
                        />

                        {/* Instructions */}
                        {images.length === 0 && (
                            <div className="mt-6 p-4 rounded-lg bg-[rgba(0,243,255,0.05)] border border-[rgba(0,243,255,0.1)]">
                                <Info className="w-4 h-4 text-[#00f3ff] mb-2" />
                                <p className="text-xs text-[rgba(224,247,255,0.6)] leading-relaxed">
                                    <strong>Como usar:</strong><br />
                                    1. Faça upload de imagens da LIA<br />
                                    2. Defina uma imagem como base (⭐)<br />
                                    3. Atribua emoções às imagens<br />
                                    4. Teste a fala no preview<br />
                                    5. Publique quando satisfeito
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Center - Preview */}
                <div className="flex-1 flex items-center justify-center p-6 bg-[rgba(0,0,0,0.2)]">
                    {images.length > 0 ? (
                        <AvatarPreview
                            controller={controller}
                            onLog={log}
                        />
                    ) : (
                        <div className="text-center">
                            <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-[rgba(0,243,255,0.1)] to-[rgba(188,19,254,0.1)] flex items-center justify-center">
                                <Sparkles className="w-12 h-12 text-[rgba(0,243,255,0.3)]" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">Avatar Engine Pro</h2>
                            <p className="text-sm text-[rgba(224,247,255,0.5)] max-w-sm">
                                Faça upload de imagens para criar um avatar com rigging facial,
                                lip-sync e animações em tempo real.
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Panel - Activity Log */}
                <div className="w-72 border-l border-[rgba(255,255,255,0.05)] flex flex-col">
                    <div className="p-3 border-b border-[rgba(255,255,255,0.05)]">
                        <h3 className="text-xs font-semibold text-[#bc13fe] uppercase tracking-wider">
                            Activity Log
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="space-y-1">
                            {logs.map((log, i) => (
                                <div
                                    key={i}
                                    className="text-[10px] font-mono text-[rgba(224,247,255,0.6)] py-1 border-b border-[rgba(255,255,255,0.03)]"
                                >
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
