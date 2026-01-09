"use client"

// =====================================================
// PUBLISH BUTTON - Botão de Publicação do Avatar
// =====================================================

import { useState, useCallback } from "react"
import {
    LayeredAvatarEngine,
    type AvatarPublishConfig
} from "../engine/LayeredAvatarEngine"
import { AvatarEngine } from "@/avatar-engine"
import { Upload, Check, Loader2, Info } from "lucide-react"

interface PublishButtonProps {
    className?: string
}

export function PublishButton({ className = '' }: PublishButtonProps) {
    const [isPublishing, setIsPublishing] = useState(false)
    const [lastPublished, setLastPublished] = useState<AvatarPublishConfig | null>(
        LayeredAvatarEngine.publishedConfig
    )
    const [showSuccess, setShowSuccess] = useState(false)

    const handlePublish = useCallback(async () => {
        setIsPublishing(true)

        // Simular delay de processamento
        await new Promise(resolve => setTimeout(resolve, 500))

        // Publicar no LayeredAvatarEngine
        const config = LayeredAvatarEngine.publish(`Build ${new Date().toLocaleString()}`)
        setLastPublished(config)

        // IMPORTANTE: Publicar também no AvatarEngine para habilitar animações
        // Isso permite que Multi-Modal e Live Mode usem expressões e lip-sync
        AvatarEngine.publish()
        console.log("✅ Avatar publicado - Animações habilitadas em todos os modos")

        setIsPublishing(false)
        setShowSuccess(true)

        // Esconder sucesso após 3 segundos
        setTimeout(() => setShowSuccess(false), 3000)
    }, [])

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Botão principal */}
            <button
                onClick={handlePublish}
                disabled={isPublishing}
                className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-lg font-bold transition-all
          ${isPublishing
                        ? 'bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.5)] cursor-wait'
                        : showSuccess
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.5)]'
                            : 'bg-gradient-to-r from-[#00f3ff] to-[#bc13fe] text-white hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] hover:scale-105'
                    }`}
            >
                {isPublishing ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Publicando...
                    </>
                ) : showSuccess ? (
                    <>
                        <Check className="w-6 h-6" />
                        Avatar Publicado!
                    </>
                ) : (
                    <>
                        <Upload className="w-6 h-6" />
                        Publicar Avatar no Sistema
                    </>
                )}
            </button>

            {/* Info */}
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[rgba(0,243,255,0.1)] border border-[rgba(0,243,255,0.2)]">
                <Info className="w-4 h-4 text-[#00f3ff] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[rgba(255,255,255,0.7)]">
                    Ao publicar, o avatar será atualizado em todos os modos (Multi-Modal, Live Mode).
                </p>
            </div>

            {/* Última versão publicada */}
            {lastPublished && (
                <div className="p-3 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)]">
                    <p className="text-xs text-[rgba(255,255,255,0.5)] mb-1">Última publicação:</p>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-white font-medium">
                            Versão {lastPublished.version}
                        </span>
                        <span className="text-xs text-[rgba(255,255,255,0.5)]">
                            {new Date(lastPublished.publishedAt).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PublishButton
