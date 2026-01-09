"use client"

// =====================================================
// LAYERED AVATAR RENDERER - Renderização por Camadas
// =====================================================
// Renderiza o avatar aplicando transforms CSS baseados
// no estado do AvatarAnimationEngine. NÃO troca PNGs.
// =====================================================

import { useState, useEffect, memo, useMemo } from "react"
import { AvatarAnimationEngine, type AvatarAnimationState, type LayerState } from "./AvatarAnimationEngine"

// =====================================================
// CONFIGURAÇÃO DAS IMAGENS
// =====================================================

const AVATAR_PATH = '/avatar/'

// Imagem base do avatar (corpo inteiro)
const BASE_IMAGE = 'Lia-idle.png'

// Imagens de emoção para trocar apenas quando emoção mudar
const EMOTION_IMAGES: Record<string, string> = {
    neutral: 'Lia-idle.png',
    happy: 'Lia-idle.png',
    sad: 'Lia-idle.png',
    surprised: 'Lia-idle.png',
    confused: 'Lia-idle.png',
    angry: 'Lia-idle.png',
    proud: 'Lia-idle.png'
}

// =====================================================
// PROPS
// =====================================================

interface LayeredAvatarRendererProps {
    size?: 'small' | 'normal' | 'large'
    className?: string
    showDebug?: boolean
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

function LayeredAvatarRendererComponent({
    size = 'normal',
    className = '',
    showDebug = false
}: LayeredAvatarRendererProps) {
    // Estado da animação
    const [animState, setAnimState] = useState<AvatarAnimationState>(
        AvatarAnimationEngine.animationState
    )

    // Inscrever no engine
    useEffect(() => {
        const unsubscribe = AvatarAnimationEngine.subscribe(setAnimState)
        return () => unsubscribe()
    }, [])

    // Classes de tamanho
    const sizeClasses = {
        small: 'w-[200px] h-[300px] md:w-[250px] md:h-[380px]',
        normal: 'w-[300px] h-[450px] md:w-[380px] md:h-[560px]',
        large: 'w-[380px] h-[560px] md:w-[480px] md:h-[700px]'
    }

    // Calcular transforms CSS baseados nas camadas
    const transforms = useMemo(() => {
        const l = animState.layers
        return {
            // Transform do corpo (respiração + sway)
            body: {
                transform: `
          scaleY(${l.breatheScale})
          translateX(${l.bodySwayX}px)
        `,
                transformOrigin: 'center bottom'
            },
            // Transform da cabeça (tilt + nod)
            head: {
                transform: `
          rotateZ(${l.headTiltX}deg)
          rotateX(${l.headTiltY}deg)
          translateY(${l.headNod}px)
        `,
                transformOrigin: 'center center'
            },
            // Overlay de olhos (piscada)
            eyes: {
                opacity: l.eyeOpenness < 0.5 ? 0.3 : 0,
                transform: `translate(${l.eyeLookX * 3}px, ${l.eyeLookY * 3}px)`
            },
            // Overlay de boca (lip-sync)
            mouth: {
                height: `${10 + l.mouthOpenness * 15}px`,
                opacity: l.mouthOpenness > 0.1 ? Math.min(0.4, l.mouthOpenness * 0.5) : 0
            },
            // Sobrancelhas
            brows: {
                transform: `translateY(${l.browPosition * -4}px)`,
                opacity: Math.abs(l.browPosition) > 0.2 ? 0.2 : 0
            }
        }
    }, [animState.layers])

    // Imagem atual baseada na emoção
    const currentImage = useMemo(() => {
        return AVATAR_PATH + (EMOTION_IMAGES[animState.emotion] || EMOTION_IMAGES.neutral)
    }, [animState.emotion])

    // Cor do glow baseada no estado
    const glowColor = useMemo(() => {
        switch (animState.state) {
            case 'speaking': return 'rgba(0, 243, 255, 0.6)'
            case 'listening': return 'rgba(255, 0, 255, 0.5)'
            case 'thinking': return 'rgba(188, 19, 254, 0.5)'
            case 'error': return 'rgba(255, 68, 68, 0.5)'
            default: return 'rgba(0, 243, 255, 0.2)'
        }
    }, [animState.state])

    // Badge de estado
    const badgeInfo = useMemo(() => {
        switch (animState.state) {
            case 'speaking': return { text: '🗣️ FALANDO', color: 'bg-cyan-500/90 text-slate-900' }
            case 'listening': return { text: '👂 OUVINDO', color: 'bg-pink-500/90 text-white animate-pulse' }
            case 'thinking': return { text: '🧠 PENSANDO', color: 'bg-purple-500/90 text-white animate-pulse' }
            case 'error': return { text: '❌ ERRO', color: 'bg-red-500 text-white' }
            default: return { text: '✨ STANDBY', color: 'bg-cyan-500/20 text-cyan-400' }
        }
    }, [animState.state])

    return (
        <div className={`relative ${sizeClasses[size]} ${className}`}>
            {/* Glow de fundo */}
            <div
                className="absolute inset-0 rounded-full blur-3xl -z-10 transition-colors duration-300"
                style={{ backgroundColor: glowColor }}
            />

            {/* Container principal com transforms de corpo */}
            <div
                className="relative w-full h-full"
                style={transforms.body}
            >
                {/* Camada: Imagem base com transforms de cabeça */}
                <div
                    className="relative w-full h-full"
                    style={transforms.head}
                >
                    {/* Imagem do avatar */}
                    <img
                        src={currentImage}
                        alt="LIA Avatar"
                        className="w-full h-full object-contain transition-opacity duration-200"
                        style={{
                            filter: `drop-shadow(0 0 30px ${glowColor})`
                        }}
                        draggable={false}
                    />

                    {/* Overlay: Piscada (escurecimento na área dos olhos) */}
                    <div
                        className="absolute pointer-events-none transition-opacity duration-75"
                        style={{
                            top: '18%',
                            left: '30%',
                            width: '40%',
                            height: '8%',
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 100%)',
                            borderRadius: '50%',
                            ...transforms.eyes
                        }}
                    />

                    {/* Overlay: Boca aberta (highlight na área da boca) */}
                    <div
                        className="absolute pointer-events-none transition-all duration-75"
                        style={{
                            top: '42%',
                            left: '38%',
                            width: '24%',
                            borderRadius: '0 0 50% 50%',
                            background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.4) 100%)',
                            ...transforms.mouth
                        }}
                    />

                    {/* Overlay: Sobrancelhas (sombra sutil) */}
                    <div
                        className="absolute pointer-events-none transition-all duration-150"
                        style={{
                            top: '15%',
                            left: '28%',
                            width: '44%',
                            height: '5%',
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%)',
                            ...transforms.brows
                        }}
                    />
                </div>
            </div>

            {/* Badge de estado */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                <div className={`px-4 py-2 rounded-full text-xs font-bold ${badgeInfo.color} flex items-center gap-2 shadow-lg`}>
                    {animState.state !== 'idle' && (
                        <div className="w-2 h-2 bg-current rounded-full animate-ping" />
                    )}
                    {badgeInfo.text}
                </div>
            </div>

            {/* Debug info */}
            {showDebug && (
                <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] p-2 rounded font-mono">
                    <div>state: {animState.state}</div>
                    <div>emotion: {animState.emotion}</div>
                    <div>mouth: {animState.layers.mouthOpenness.toFixed(2)}</div>
                    <div>eyes: {animState.layers.eyeOpenness.toFixed(2)}</div>
                    <div>breathe: {animState.layers.breatheScale.toFixed(3)}</div>
                    <div>sway: {animState.layers.bodySwayX.toFixed(1)}px</div>
                    <div>head: {animState.layers.headTiltX.toFixed(1)}°</div>
                    <div>gesture: {animState.layers.gestureType}</div>
                </div>
            )}
        </div>
    )
}

// Memoizar para performance
export const LayeredAvatarRenderer = memo(LayeredAvatarRendererComponent)

export default LayeredAvatarRenderer
