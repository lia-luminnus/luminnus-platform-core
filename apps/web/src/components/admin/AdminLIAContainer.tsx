import { useState, useEffect } from "react";
import { Loader2, Maximize2, Minimize2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const AdminLIAContainer = () => {
    const { session } = useAuth();
    const [loading, setLoading] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // URL do LIA Viva (Painel Unificado)
    // Porta padrão em dev: 5173 (Vite dev server do lia-live-view)
    // Configure VITE_LIA_VIVA_URL no .env para customizar
    const LIA_VIVA_URL = import.meta.env.VITE_LIA_VIVA_URL || "http://localhost:5173";

    // Constrói a URL limpa com embed=1
    const getIframeUrl = () => {
        return `${LIA_VIVA_URL}?embed=1`;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullScreen) {
                setIsFullScreen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreen]);

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            // Segurança: Validar origin se possível
            if (event.origin !== LIA_VIVA_URL) return;

            if (event.data?.type === 'LIA_READY' && session) {
                console.log('[AdminLIAContainer] LIA Viva is ready, sending auth handshake...');
                const iframe = document.querySelector('iframe');
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'LIA_AUTH_HANDSHAKE',
                        accessToken: session.access_token,
                        refreshToken: session.refresh_token,
                        userId: session.user?.id
                    }, LIA_VIVA_URL);
                }
            }
        };

        window.addEventListener('message', handleMessage);

        // Health check simplificado
        const checkLiaStatus = async () => {
            try {
                await fetch(`${LIA_VIVA_URL}/api/health`, { mode: 'no-cors' });
                setLoading(false);
            } catch (err) {
                setLoading(false);
            }
        };

        checkLiaStatus();
        return () => window.removeEventListener('message', handleMessage);
    }, [LIA_VIVA_URL, session]);

    return (
        <div
            className={cn(
                "relative flex w-full flex-col overflow-hidden transition-all duration-300 ease-in-out",
                isFullScreen
                    ? "fixed inset-0 z-[9999] h-screen bg-black"
                    : "h-[calc(100vh-120px)] rounded-xl border border-border bg-black shadow-2xl"
            )}
        >
            {/* Botão de Expansão */}
            {!loading && (
                <div className="absolute top-4 right-4 z-[10000]">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsFullScreen(!isFullScreen)}
                        className="h-10 w-10 bg-black/40 text-white/70 hover:bg-black/60 hover:text-white backdrop-blur-md border border-white/10"
                        title={isFullScreen ? "Recolher (Esc)" : "Expandir Tela Cheia"}
                    >
                        {isFullScreen ? (
                            <Minimize2 className="h-5 w-5" />
                        ) : (
                            <Maximize2 className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                        <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-400" />
                        <p className="mt-4 text-white/70">Sincronizando com LIA Viva...</p>
                    </div>
                </div>
            ) : (
                <iframe
                    src={getIframeUrl()}
                    className="h-full w-full border-none"
                    title="LIA (Painel Completo)"
                    allow="microphone; camera; display-capture; autoplay; encrypted-media; geolocation"
                />
            )}
        </div>
    );
};

export default AdminLIAContainer;
