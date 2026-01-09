import React, { useEffect, useMemo, useRef, useState } from "react";
import { CompositeAvatarEngine } from "../avatar-engine/CompositeAvatarEngine";

type Uploaded = { id: string; file: File; url: string };

async function fetchTTS(text: string): Promise<Blob> {
    const r = await fetch("/api/avatar/speak", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "audio/mpeg,audio/wav,application/octet-stream"
        },
        body: JSON.stringify({ text }),
    });

    if (!r.ok) {
        const msg = await r.text().catch(() => "");
        throw new Error(`TTS falhou: ${r.status} ${msg}`);
    }

    const contentType = r.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        const j = await r.json();
        if (!j.audioBase64) throw new Error("Resposta JSON sem audioBase64.");
        const b = atob(j.audioBase64);
        const bytes = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) bytes[i] = b.charCodeAt(i);
        return new Blob([bytes], { type: "audio/mpeg" });
    }

    return await r.blob();
}

export default function AvatarStudioPro() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const engineRef = useRef<CompositeAvatarEngine | null>(null);

    const [images, setImages] = useState<Uploaded[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [text, setText] = useState("Olá! Eu sou a LIA, sua assistente inteligente da Luminnus.");
    const [status, setStatus] = useState<string>("Aguardando imagens...");
    const [isBuilding, setIsBuilding] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);

    const selected = useMemo(
        () => images.find((x) => x.id === selectedId) || null,
        [images, selectedId]
    );

    useEffect(() => {
        return () => {
            images.forEach((x) => URL.revokeObjectURL(x.url));
            engineRef.current?.destroy();
        };
    }, []);

    async function onUpload(files: FileList | null) {
        if (!files?.length) return;

        const list: Uploaded[] = [];
        for (const f of Array.from(files)) {
            const url = URL.createObjectURL(f);
            list.push({ id: crypto.randomUUID(), file: f, url });
        }

        setImages((prev) => {
            const next = [...prev, ...list];
            if (!selectedId && next.length) setSelectedId(next[0].id);
            return next;
        });
    }

    async function buildEngine() {
        if (!canvasRef.current) {
            setStatus("Erro: Canvas não encontrado.");
            return;
        }
        if (!imgRef.current) {
            setStatus("Erro: Imagem não carregada.");
            return;
        }

        setIsBuilding(true);
        setStatus("Gerando rig (FaceMesh) + patches (boca/olhos)...");

        try {
            // Destroi engine anterior
            engineRef.current?.destroy();

            const engine = new CompositeAvatarEngine();
            await engine.init({ canvas: canvasRef.current, image: imgRef.current });

            engineRef.current = engine;
            (window as any).__liaEngine = engine;

            setStatus("✅ Pronto. Clique em 'Testar' para falar.");
        } catch (error: any) {
            setStatus(`❌ Erro: ${error.message}`);
            console.error(error);
        } finally {
            setIsBuilding(false);
        }
    }

    async function handleTestSpeak() {
        if (!audioRef.current) {
            setStatus("Erro: Audio element não encontrado.");
            return;
        }

        const engine = engineRef.current;
        if (!engine) {
            setStatus("⚠️ Engine não inicializada. Clique em 'Gerar' primeiro.");
            return;
        }

        setIsSpeaking(true);
        setStatus("Solicitando TTS no backend...");

        try {
            const blob = await fetchTTS(text);
            const url = URL.createObjectURL(blob);
            audioRef.current.src = url;

            // Conecta áudio ao engine para lip-sync
            engine.attachSpeech({ audio: audioRef.current });

            await audioRef.current.play();
            setStatus("🎤 Falando (lip-sync por amplitude)...");

            audioRef.current.onended = () => {
                setIsSpeaking(false);
                setStatus("✅ Pronto.");
                URL.revokeObjectURL(url);
            };

            audioRef.current.onerror = () => {
                setIsSpeaking(false);
                setStatus("❌ Erro ao reproduzir áudio.");
            };

        } catch (error: any) {
            setIsSpeaking(false);
            setStatus(`❌ Erro TTS: ${error.message}`);
            console.error(error);
        }
    }

    function handleBlink() {
        engineRef.current?.setBlink(1);
    }

    function handleJawTest() {
        const engine = engineRef.current;
        if (!engine) return;

        let v = 0;
        const interval = setInterval(() => {
            v += 0.1;
            const jaw = (Math.sin(v * 3) + 1) / 2 * 0.8;
            engine.setJawOpen(jaw);
        }, 33);

        setTimeout(() => {
            clearInterval(interval);
            engine.setJawOpen(0);
        }, 3000);
    }

    return (
        <div className="min-h-screen bg-[#0a0a12] text-white p-6">
            <div className="max-w-7xl mx-auto grid grid-cols-[320px_1fr_360px] gap-6">

                {/* Coluna 1: Upload */}
                <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-[#222] bg-[#111]">
                        <h3 className="font-bold mb-3 text-[#00f3ff]">📷 Imagens do Avatar</h3>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => onUpload(e.target.files)}
                            className="w-full text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {images.map((img) => (
                            <button
                                key={img.id}
                                onClick={() => setSelectedId(img.id)}
                                className={`rounded-xl overflow-hidden transition-all ${img.id === selectedId
                                        ? 'ring-2 ring-[#00f3ff] scale-105'
                                        : 'border border-[#333] hover:border-[#555]'
                                    }`}
                            >
                                <img src={img.url} alt={img.file.name} className="w-full aspect-[3/4] object-cover" />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Coluna 2: Preview */}
                <div className="rounded-xl border border-[#222] bg-[#111] p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg">Preview (Composite Engine)</h3>
                        <span className="text-sm text-[#888]">{status}</span>
                    </div>

                    {/* Imagem fonte (hidden) */}
                    {selected && (
                        <img
                            ref={imgRef}
                            src={selected.url}
                            alt="source"
                            crossOrigin="anonymous"
                            style={{ display: 'none' }}
                            onLoad={() => setStatus("Imagem carregada. Clique em Gerar.")}
                        />
                    )}

                    {/* Canvas WebGL */}
                    <div
                        className="w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0a]"
                        style={{ height: '560px' }}
                    >
                        <canvas
                            ref={canvasRef}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>

                    {/* Botões de controle */}
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={buildEngine}
                            disabled={!selected || isBuilding}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-white font-semibold disabled:opacity-50"
                        >
                            {isBuilding ? 'Gerando...' : 'Gerar'}
                        </button>
                        <button
                            onClick={handleBlink}
                            className="px-4 py-2.5 rounded-xl bg-[#222] border border-[#333] hover:bg-[#333]"
                        >
                            👁️ Piscar
                        </button>
                        <button
                            onClick={handleJawTest}
                            className="px-4 py-2.5 rounded-xl bg-[#222] border border-[#333] hover:bg-[#333]"
                        >
                            👄 Testar Boca
                        </button>
                    </div>
                </div>

                {/* Coluna 3: TTS */}
                <div className="rounded-xl border border-[#222] bg-[#111] p-4 space-y-4">
                    <h3 className="font-bold text-[#00f3ff]">🎤 Teste de Fala (TTS)</h3>

                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={6}
                        className="w-full rounded-xl bg-[#1a1a2e] border border-[#333] p-3 text-sm resize-none focus:outline-none focus:border-[#00f3ff]"
                        placeholder="Digite o texto para a LIA falar..."
                    />

                    <button
                        onClick={handleTestSpeak}
                        disabled={isSpeaking}
                        className="w-full py-3 rounded-xl bg-[#00f3ff] text-black font-bold hover:bg-[#33f5ff] disabled:opacity-50"
                    >
                        {isSpeaking ? '🔊 Falando...' : '▶️ Testar (TTS + Lip-sync)'}
                    </button>

                    <audio ref={audioRef} controls className="w-full" />

                    <div className="text-xs text-[#666] mt-4">
                        <p>📌 <strong>Lip-sync MVP:</strong> amplitude (RMS) → jawOpen</p>
                        <p>📌 <strong>Próximo upgrade:</strong> fonema → visema</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
