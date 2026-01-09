"use client"

// =====================================================
// AVATAR RENDERER - Componente React
// =====================================================
// Este componente se INSCREVE no AvatarOrchestrator
// e só re-renderiza quando o orquestrador notifica.
// Isso evita flickering causado por re-renders do React.
// =====================================================

import { useState, useEffect, useRef, memo } from "react"
import { AvatarOrchestrator, type AvatarSnapshot } from "./AvatarOrchestrator"

// =====================================================
// ESTILOS CSS PARA MICRO-ANIMAÇÕES
// =====================================================

const avatarStyles = `
  .avatar-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: opacity 0.2s ease-out;
  }
  
  .avatar-image.blinking {
    filter: brightness(0.9);
  }
  
  /* Respiração suave */
  .avatar-breathe {
    animation: avatar-breathe 4s ease-in-out infinite;
  }
  
  @keyframes avatar-breathe {
    0%, 100% { transform: scale(1) translateY(0); }
    50% { transform: scale(1.003) translateY(-1px); }
  }
  
  /* Glow por estado */
  .avatar-glow-idle {
    filter: drop-shadow(0 0 20px rgba(0, 243, 255, 0.3));
  }
  
  .avatar-glow-listening {
    filter: drop-shadow(0 0 40px rgba(255, 0, 255, 0.6));
  }
  
  .avatar-glow-thinking {
    filter: drop-shadow(0 0 35px rgba(188, 19, 254, 0.6));
    animation: avatar-pulse 1.5s ease-in-out infinite;
  }
  
  .avatar-glow-speaking {
    filter: drop-shadow(0 0 50px rgba(0, 243, 255, 0.7));
  }
  
  .avatar-glow-searching {
    filter: drop-shadow(0 0 45px rgba(255, 230, 0, 0.7));
    animation: avatar-pulse 1s ease-in-out infinite;
  }
  
  .avatar-glow-error {
    filter: drop-shadow(0 0 40px rgba(255, 68, 68, 0.6));
  }
  
  @keyframes avatar-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  
  /* Ring de escuta */
  .listening-ring {
    position: absolute;
    inset: -1rem;
    border: 2px solid rgba(255, 0, 255, 0.5);
    border-radius: 9999px;
    animation: ring-pulse 1.5s ease-in-out infinite;
  }
  
  @keyframes ring-pulse {
    0%, 100% { transform: scale(0.98); opacity: 0.5; }
    50% { transform: scale(1.02); opacity: 1; }
  }
`

// =====================================================
// PROPS
// =====================================================

interface AvatarRendererProps {
  size?: 'small' | 'normal' | 'large'
  className?: string
  showStatusBadge?: boolean
  showEmotionBadge?: boolean
}

// =====================================================
// COMPONENTE (Memoizado)
// =====================================================

function AvatarRendererComponent({
  size = 'normal',
  className = '',
  showStatusBadge = true,
  showEmotionBadge = false
}: AvatarRendererProps) {
  // Estado local - atualizado APENAS pelo orquestrador
  const [snapshot, setSnapshot] = useState<AvatarSnapshot>(AvatarOrchestrator.snapshot)
  const imageRef = useRef<HTMLImageElement>(null)

  // Inscrever no orquestrador
  useEffect(() => {
    const unsubscribe = AvatarOrchestrator.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot)
    })

    return () => unsubscribe()
  }, [])

  // Classes de tamanho
  const sizeClasses = {
    small: 'w-[200px] h-[300px] md:w-[250px] md:h-[380px]',
    normal: 'w-[300px] h-[450px] md:w-[380px] md:h-[560px]',
    large: 'w-[380px] h-[560px] md:w-[480px] md:h-[700px]'
  }

  // Classe de glow baseada no estado
  const glowClass = {
    idle: 'avatar-glow-idle',
    listening: 'avatar-glow-listening',
    thinking: 'avatar-glow-thinking',
    searching: 'avatar-glow-searching',
    speaking: 'avatar-glow-speaking',
    error: 'avatar-glow-error'
  }[snapshot.state]

  // Texto do badge
  const badgeInfo = {
    idle: { text: '✨ STANDBY', color: 'bg-cyan-500/20 text-cyan-400' },
    listening: { text: '👂 OUVINDO', color: 'bg-pink-500/90 text-white animate-pulse' },
    thinking: { text: '🧠 PENSANDO', color: 'bg-purple-500/90 text-white animate-pulse' },
    searching: { text: '🔎 PESQUISANDO', color: 'bg-yellow-500/90 text-slate-900 animate-pulse' },
    speaking: { text: '🗣️ FALANDO', color: 'bg-cyan-500/90 text-slate-900' },
    error: { text: '❌ ERRO', color: 'bg-red-500 text-white' }
  }[snapshot.state]

  // Emoji de emoção
  const emotionEmoji: Record<string, string> = {
    neutral: '',
    happy: '😊',
    sad: '😢',
    surprised: '😲',
    confused: '🤔',
    angry: '😠',
    fear: '😨',
    disgust: '🤢',
    proud: '😎',
    tired: '😴',
    curious: '🧐'
  }

  return (
    <>
      {/* Injetar estilos */}
      <style dangerouslySetInnerHTML={{ __html: avatarStyles }} />

      <div className={`avatar-container ${sizeClasses[size]} ${className}`}>
        {/* Ring de escuta (listening) */}
        {snapshot.state === 'listening' && (
          <div className="listening-ring" />
        )}

        {/* Container com respiração */}
        <div className="relative w-full h-full avatar-breathe">
          {/* Imagem do Avatar */}
          <img
            ref={imageRef}
            src={snapshot.imageUrl}
            alt="LIA Avatar"
            className={`avatar-image ${glowClass} ${snapshot.isBlinking ? 'blinking' : ''}`}
            draggable={false}
          />

          {/* Badge de Estado */}
          {showStatusBadge && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
              <div className={`px-4 py-2 rounded-full text-xs font-bold ${badgeInfo.color} flex items-center gap-2 shadow-lg`}>
                {snapshot.state !== 'idle' && (
                  <div className="w-2 h-2 bg-current rounded-full animate-ping" />
                )}
                {badgeInfo.text}
              </div>
            </div>
          )}

          {/* Badge de Emoção (opcional) */}
          {showEmotionBadge && snapshot.emotion !== 'neutral' && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 text-white text-sm">
              {emotionEmoji[snapshot.emotion]}
            </div>
          )}

          {/* Indicador de Gesto (debug) */}
          {snapshot.gesture !== 'none' && (
            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-purple-500/70 text-white text-[10px]">
              {snapshot.gesture === 'wave' ? '👋' :
                snapshot.gesture === 'shrug' ? '🤷' :
                  snapshot.gesture === 'explain' ? '👐' :
                    snapshot.gesture === 'nod_yes' ? '👍' :
                      snapshot.gesture === 'nod_no' ? '👎' : ''}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Memoizar para evitar re-renders desnecessários
export const AvatarRenderer = memo(AvatarRendererComponent)

export default AvatarRenderer
