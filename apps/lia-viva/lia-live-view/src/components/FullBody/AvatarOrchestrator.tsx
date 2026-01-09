"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

// =====================================================
// TIPOS DO AVATAR ORCHESTRATOR
// =====================================================

export type AvatarBaseState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'

export type AvatarEmotion =
    | 'neutral' | 'happy' | 'sad' | 'surprised' | 'confused'
    | 'angry' | 'fear' | 'disgust' | 'proud' | 'tired' | 'curious' | 'envy'

export type AvatarGesture =
    | 'none' | 'wave_short' | 'shrug' | 'hand_open_explain' | 'nod_yes' | 'nod_no'

export interface AvatarCommand {
    state: AvatarBaseState
    emotion?: AvatarEmotion
    gesture?: AvatarGesture
    text?: string
    audioStatus?: 'playing' | 'stopped'
}

export interface AvatarVisualState {
    currentImage: string
    isBlinking: boolean
    isBreathing: boolean
    isSpeaking: boolean
    glowColor: string
    glowIntensity: number
    currentEmotion: AvatarEmotion
    currentGesture: AvatarGesture
}

// =====================================================
// MAPEAMENTO DE IMAGENS (baseado no metadata.json)
// =====================================================

const AVATAR_BASE_PATH = '/avatar/'

const BASE_IMAGES: Record<AvatarBaseState, string> = {
    idle: 'ChatGPT Image 10 de out. de 2025, 07_29_56.png',
    listening: 'Lia expressando curiosidade.PNG',
    thinking: 'Lia com uma expressão de confusão.PNG',
    speaking: 'Gemini_Generated_Image_nk1tnnnk1tnnnk1t.PNG',
    error: 'Lia expressando frustração.PNG'
}

const EXPRESSION_IMAGES: Record<AvatarEmotion, string> = {
    neutral: 'ChatGPT Image 10 de out. de 2025, 07_29_56.png',
    happy: 'Lia expressando alegriafelicidade.PNG',
    sad: 'Lia expressando tristeza.PNG',
    surprised: 'Lia com uma expressão de surpresa.PNG',
    confused: 'Lia com uma expressão de confusão.PNG',
    angry: 'Lia expressando frustração.PNG',
    fear: 'Lia expressando medo.PNG',
    disgust: 'Lia expressando desprezo.PNG',
    proud: 'Lia expressando orgulho.PNG',
    tired: 'Lia expressando tédio.PNG',
    curious: 'Lia expressando curiosidade.PNG',
    envy: 'Lia expressando inveja.PNG'
}

// Frames para lip-sync simplificado
const SPEAKING_FRAMES = [
    'Gemini_Generated_Image_nk1tnnnk1tnnnk1t.PNG',
    'ChatGPT Image 10 de out. de 2025, 07_29_56.png',
    'Gemini_Generated_Image_up9tpfup9tpfup9t.PNG'
]

// =====================================================
// DETECÇÃO AUTOMÁTICA DE EMOÇÃO/GESTO
// =====================================================

function detectEmotionFromText(text: string): AvatarEmotion {
    const lowerText = text.toLowerCase()

    // Saudações → happy
    if (/\b(oi|olá|bom dia|boa tarde|boa noite|hey|hello)\b/.test(lowerText)) {
        return 'happy'
    }
    // Desculpas → sad
    if (/\b(desculpe|desculpa|perdão|sinto muito|me perdoe)\b/.test(lowerText)) {
        return 'sad'
    }
    // Dúvida → confused
    if (/\b(não sei|talvez|pode ser|hmm|não tenho certeza)\b/.test(lowerText)) {
        return 'confused'
    }
    // Surpresa
    if (/\b(uau|nossa|wow|incrível|impressionante)\b/.test(lowerText)) {
        return 'surprised'
    }
    // Explicação → neutral/curious
    if (/\b(veja|observe|note que|importante|atenção)\b/.test(lowerText)) {
        return 'curious'
    }
    // Sucesso/Orgulho
    if (/\b(pronto|feito|consegui|sucesso|ótimo)\b/.test(lowerText)) {
        return 'proud'
    }
    // Erro/Problema
    if (/\b(erro|problema|falha|não consegui|impossível)\b/.test(lowerText)) {
        return 'angry'
    }

    return 'neutral'
}

function detectGestureFromText(text: string): AvatarGesture {
    const lowerText = text.toLowerCase()

    // Saudação → wave
    if (/\b(oi|olá|bom dia|boa tarde|boa noite|tchau|até logo)\b/.test(lowerText)) {
        return 'wave_short'
    }
    // Dúvida → shrug
    if (/\b(não sei|talvez|pode ser|hmm)\b/.test(lowerText)) {
        return 'shrug'
    }
    // Explicação → hand explain
    if (/\b(veja|observe|note que|por exemplo|ou seja)\b/.test(lowerText)) {
        return 'hand_open_explain'
    }
    // Confirmação → nod yes
    if (/\b(sim|claro|certo|ok|entendi|perfeito)\b/.test(lowerText)) {
        return 'nod_yes'
    }
    // Negação → nod no
    if (/\b(não|negativo|errado|incorreto)\b/.test(lowerText)) {
        return 'nod_no'
    }

    return 'none'
}

// =====================================================
// HOOK PRINCIPAL: useAvatarOrchestrator
// =====================================================

export function useAvatarOrchestrator() {
    // Estados principais
    const [baseState, setBaseState] = useState<AvatarBaseState>('idle')
    const [emotion, setEmotion] = useState<AvatarEmotion>('neutral')
    const [gesture, setGesture] = useState<AvatarGesture>('none')
    const [isSpeaking, setIsSpeaking] = useState(false)

    // Micro-animações
    const [isBlinking, setIsBlinking] = useState(false)
    const [speakingFrame, setSpeakingFrame] = useState(0)

    // Piscada automática (3-7 segundos)
    useEffect(() => {
        const blink = () => {
            setIsBlinking(true)
            setTimeout(() => setIsBlinking(false), 150)
        }

        const scheduleNextBlink = () => {
            const delay = 3000 + Math.random() * 4000 // 3-7 segundos
            return setTimeout(() => {
                blink()
                timerId = scheduleNextBlink()
            }, delay)
        }

        let timerId = scheduleNextBlink()
        return () => clearTimeout(timerId)
    }, [])

    // Lip-sync: alternar frames enquanto speaking
    useEffect(() => {
        if (!isSpeaking) {
            setSpeakingFrame(0)
            return
        }

        const interval = setInterval(() => {
            setSpeakingFrame(prev => (prev + 1) % SPEAKING_FRAMES.length)
        }, 120) // Alternar a cada 120ms

        return () => clearInterval(interval)
    }, [isSpeaking])

    // Determinar imagem atual
    const currentImage = useMemo(() => {
        // Se speaking, usar frame de lip-sync
        if (isSpeaking) {
            return AVATAR_BASE_PATH + SPEAKING_FRAMES[speakingFrame]
        }

        // Se tem emoção específica, usar expressão
        if (emotion !== 'neutral') {
            return AVATAR_BASE_PATH + EXPRESSION_IMAGES[emotion]
        }

        // Usar imagem do estado base
        return AVATAR_BASE_PATH + BASE_IMAGES[baseState]
    }, [baseState, emotion, isSpeaking, speakingFrame])

    // Determinar glow
    const glowStyle = useMemo(() => {
        switch (baseState) {
            case 'listening':
                return { color: 'rgba(255,0,255,0.7)', intensity: 50 }
            case 'thinking':
                return { color: 'rgba(188,19,254,0.7)', intensity: 40 }
            case 'speaking':
                return { color: 'rgba(0,243,255,0.8)', intensity: 60 }
            case 'error':
                return { color: 'rgba(255,68,68,0.7)', intensity: 50 }
            default:
                return { color: 'rgba(0,243,255,0.3)', intensity: 30 }
        }
    }, [baseState])

    // Processar comando
    const processCommand = useCallback((command: AvatarCommand) => {
        console.log('🎭 Avatar Command:', command)

        // Atualizar estado base
        setBaseState(command.state)

        // Atualizar speaking
        setIsSpeaking(command.audioStatus === 'playing' || command.state === 'speaking')

        // Se tem texto, detectar emoção e gesto automaticamente
        if (command.text) {
            const detectedEmotion = command.emotion || detectEmotionFromText(command.text)
            const detectedGesture = command.gesture || detectGestureFromText(command.text)
            setEmotion(detectedEmotion)
            setGesture(detectedGesture)
        } else {
            setEmotion(command.emotion || 'neutral')
            setGesture(command.gesture || 'none')
        }

        // Resetar gesto após 2 segundos
        if (command.gesture && command.gesture !== 'none') {
            setTimeout(() => setGesture('none'), 2000)
        }
    }, [])

    // Atalhos para estados comuns
    const setIdle = useCallback(() => {
        processCommand({ state: 'idle', emotion: 'neutral' })
    }, [processCommand])

    const setListening = useCallback(() => {
        processCommand({ state: 'listening', emotion: 'curious' })
    }, [processCommand])

    const setThinking = useCallback(() => {
        processCommand({ state: 'thinking', emotion: 'confused' })
    }, [processCommand])

    const setSpeakingState = useCallback((text?: string) => {
        processCommand({ state: 'speaking', text, audioStatus: 'playing' })
    }, [processCommand])

    const stopSpeaking = useCallback(() => {
        setIsSpeaking(false)
        processCommand({ state: 'idle', emotion: 'neutral' })
    }, [processCommand])

    // Retornar estado visual e métodos
    return {
        // Estado visual
        currentImage,
        isBlinking,
        isBreathing: true, // Sempre ativo via CSS
        isSpeaking,
        glowColor: glowStyle.color,
        glowIntensity: glowStyle.intensity,
        currentEmotion: emotion,
        currentGesture: gesture,
        baseState,

        // Métodos de controle
        processCommand,
        setIdle,
        setListening,
        setThinking,
        setSpeakingState,
        stopSpeaking,
        setEmotion,
        setGesture
    }
}

// =====================================================
// TIPOS EXPORTADOS
// =====================================================

export type AvatarOrchestratorReturn = ReturnType<typeof useAvatarOrchestrator>

export default useAvatarOrchestrator
