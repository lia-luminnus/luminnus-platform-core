// =====================================================
// AVATAR ORCHESTRATOR - Classe Singleton
// =====================================================
// Este orquestrador é uma CLASSE, não um hook React.
// Ele mantém seu próprio estado interno e só notifica
// os componentes React quando REALMENTE precisa mudar.
// =====================================================

// =====================================================
// TIPOS
// =====================================================

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'searching' | 'speaking' | 'error'
export type AvatarEmotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'confused' | 'angry' | 'fear' | 'disgust' | 'proud' | 'tired' | 'curious'
export type AvatarGesture = 'none' | 'wave' | 'shrug' | 'explain' | 'nod_yes' | 'nod_no'

export interface AvatarSnapshot {
    state: AvatarState
    emotion: AvatarEmotion
    gesture: AvatarGesture
    mouthFrame: 0 | 1 | 2 // closed, mid, open
    isBlinking: boolean
    imageUrl: string
}

type AvatarListener = (snapshot: AvatarSnapshot) => void

// =====================================================
// MAPEAMENTO DE IMAGENS
// =====================================================

const AVATAR_PATH = '/avatar/'

const IMAGES = {
    base: {
        idle: 'ChatGPT Image 10 de out. de 2025, 07_29_56.png',
        listening: 'Lia expressando curiosidade.PNG',
        thinking: 'Lia com uma expressão de confusão.PNG',
        searching: 'Lia expressando curiosidade.PNG',
        speaking: 'Gemini_Generated_Image_nk1tnnnk1tnnnk1t.PNG',
        error: 'Lia expressando frustração.PNG'
    },
    emotions: {
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
        curious: 'Lia expressando curiosidade.PNG'
    },
    mouth: [
        'ChatGPT Image 10 de out. de 2025, 07_29_56.png',  // 0 = closed
        'Gemini_Generated_Image_up9tpfup9tpfup9t.PNG',      // 1 = mid
        'Gemini_Generated_Image_nk1tnnnk1tnnnk1t.PNG'       // 2 = open
    ]
}

// =====================================================
// CLASSE ORCHESTRATOR SINGLETON
// =====================================================

class AvatarOrchestratorClass {
    // Estado interno
    private _state: AvatarState = 'idle'
    private _emotion: AvatarEmotion = 'neutral'
    private _gesture: AvatarGesture = 'none'
    private _mouthFrame: 0 | 1 | 2 = 0
    private _isBlinking: boolean = false

    // Listeners (React components)
    private _listeners: Set<AvatarListener> = new Set()

    // Timers
    private _blinkTimer: number | null = null
    private _lipSyncTimer: number | null = null
    private _gestureTimer: number | null = null

    // Controle de throttle
    private _lastNotify: number = 0
    private _notifyThrottle: number = 100 // mínimo 100ms entre notificações

    // Flag para saber se está falando
    private _isSpeaking: boolean = false

    constructor() {
        // Iniciar loop de piscada
        this.startBlinkLoop()
    }

    // =====================================================
    // GETTERS
    // =====================================================

    get state() { return this._state }
    get emotion() { return this._emotion }
    get gesture() { return this._gesture }
    get mouthFrame() { return this._mouthFrame }
    get isBlinking() { return this._isBlinking }

    get currentImage(): string {
        // Prioridade: speaking com lip-sync > emoção > estado base
        if (this._state === 'speaking') {
            return AVATAR_PATH + IMAGES.mouth[this._mouthFrame]
        }
        if (this._emotion !== 'neutral') {
            return AVATAR_PATH + IMAGES.emotions[this._emotion]
        }
        return AVATAR_PATH + IMAGES.base[this._state]
    }

    get snapshot(): AvatarSnapshot {
        return {
            state: this._state,
            emotion: this._emotion,
            gesture: this._gesture,
            mouthFrame: this._mouthFrame,
            isBlinking: this._isBlinking,
            imageUrl: this.currentImage
        }
    }

    // =====================================================
    // LISTENERS (para React)
    // =====================================================

    subscribe(listener: AvatarListener): () => void {
        this._listeners.add(listener)
        // Notificar imediatamente com estado atual
        listener(this.snapshot)
        return () => this._listeners.delete(listener)
    }

    private notify() {
        const now = Date.now()
        // Throttle: não notificar mais de 1x a cada 100ms
        if (now - this._lastNotify < this._notifyThrottle) {
            return
        }
        this._lastNotify = now

        const snap = this.snapshot
        this._listeners.forEach(l => l(snap))
    }

    // =====================================================
    // SETTERS COM CONTROLE
    // =====================================================

    setState(newState: AvatarState) {
        if (this._state === newState) return
        console.log('🎭 Avatar State:', newState)
        this._state = newState

        // Se mudou para speaking, iniciar lip-sync
        if (newState === 'speaking' && !this._isSpeaking) {
            this.startLipSync()
        } else if (newState !== 'speaking' && this._isSpeaking) {
            this.stopLipSync()
        }

        // Atualizar emoção padrão por estado
        if (newState === 'listening') this._emotion = 'curious'
        else if (newState === 'thinking') this._emotion = 'confused'
        else if (newState === 'searching') this._emotion = 'curious'
        else if (newState === 'error') this._emotion = 'angry'
        else if (newState === 'idle') this._emotion = 'neutral'

        this.notify()
    }

    setEmotion(emotion: AvatarEmotion) {
        if (this._emotion === emotion) return
        console.log('😊 Avatar Emotion:', emotion)
        this._emotion = emotion
        this.notify()
    }

    setGesture(gesture: AvatarGesture, durationMs: number = 2000) {
        if (this._gesture === gesture) return
        console.log('👋 Avatar Gesture:', gesture)
        this._gesture = gesture
        this.notify()

        // Voltar para 'none' após duração
        if (gesture !== 'none') {
            if (this._gestureTimer) clearTimeout(this._gestureTimer)
            this._gestureTimer = window.setTimeout(() => {
                this._gesture = 'none'
                this.notify()
            }, durationMs)
        }
    }

    // =====================================================
    // LIP-SYNC CONTROLADO
    // =====================================================

    startLipSync() {
        if (this._isSpeaking) return
        this._isSpeaking = true
        console.log('👄 Lip-sync: START')

        // Alternar frames de boca a cada 150ms
        let frameIndex = 0
        const frames: (0 | 1 | 2)[] = [0, 1, 2, 1] // closed, mid, open, mid (loop)

        this._lipSyncTimer = window.setInterval(() => {
            this._mouthFrame = frames[frameIndex % frames.length]
            frameIndex++
            this.notify()
        }, 150)
    }

    stopLipSync() {
        if (!this._isSpeaking) return
        this._isSpeaking = false
        console.log('👄 Lip-sync: STOP')

        if (this._lipSyncTimer) {
            clearInterval(this._lipSyncTimer)
            this._lipSyncTimer = null
        }
        this._mouthFrame = 0
        this.notify()
    }

    // =====================================================
    // PISCADA AUTOMÁTICA
    // =====================================================

    private startBlinkLoop() {
        const scheduleBlink = () => {
            // Intervalo aleatório entre 3 e 7 segundos
            const delay = 3000 + Math.random() * 4000

            this._blinkTimer = window.setTimeout(() => {
                // Piscar
                this._isBlinking = true
                this.notify()

                // Abrir olhos após 150ms
                setTimeout(() => {
                    this._isBlinking = false
                    this.notify()
                }, 150)

                // Agendar próxima piscada
                scheduleBlink()
            }, delay)
        }

        scheduleBlink()
    }

    // =====================================================
    // EVENTOS DO GEMINI LIVE
    // =====================================================

    onAudioStart() {
        this.setState('speaking')
    }

    onAudioEnd() {
        this.stopLipSync()
        this.setState('idle')
    }

    onListeningStart() {
        this.setState('listening')
    }

    onThinking() {
        this.setState('thinking')
    }

    onSearching(isSearching: boolean) {
        if (isSearching) {
            this.setState('searching')
        } else if (this._state === 'searching') {
            this.setState('idle')
        }
    }

    // =====================================================
    // DETECÇÃO AUTOMÁTICA DE EMOÇÃO/GESTO
    // =====================================================

    processText(text: string) {
        const lower = text.toLowerCase()

        // Saudações
        if (/\b(oi|olá|bom dia|boa tarde|boa noite|hey|hi)\b/.test(lower)) {
            this.setEmotion('happy')
            this.setGesture('wave', 1500)
            return
        }

        // Desculpas
        if (/\b(desculpe|desculpa|perdão|sinto muito)\b/.test(lower)) {
            this.setEmotion('sad')
            this.setGesture('shrug', 1500)
            return
        }

        // Explicações
        if (/\b(veja|observe|note|por exemplo|ou seja)\b/.test(lower)) {
            this.setEmotion('curious')
            this.setGesture('explain', 2000)
            return
        }

        // Confirmações
        if (/\b(sim|claro|certo|ok|perfeito)\b/.test(lower)) {
            this.setEmotion('happy')
            this.setGesture('nod_yes', 1000)
            return
        }

        // Negações
        if (/\b(não|negativo|errado|incorreto)\b/.test(lower)) {
            this.setEmotion('neutral')
            this.setGesture('nod_no', 1000)
            return
        }

        // Surpresa
        if (/\b(uau|nossa|incrível|wow)\b/.test(lower)) {
            this.setEmotion('surprised')
            return
        }

        // Sucesso
        if (/\b(pronto|feito|consegui|sucesso)\b/.test(lower)) {
            this.setEmotion('proud')
            return
        }
    }

    // =====================================================
    // RESET
    // =====================================================

    reset() {
        this.stopLipSync()
        this._state = 'idle'
        this._emotion = 'neutral'
        this._gesture = 'none'
        this._mouthFrame = 0
        this.notify()
    }

    // Cleanup
    destroy() {
        if (this._blinkTimer) clearTimeout(this._blinkTimer)
        if (this._lipSyncTimer) clearInterval(this._lipSyncTimer)
        if (this._gestureTimer) clearTimeout(this._gestureTimer)
        this._listeners.clear()
    }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

// Criar instância única
export const AvatarOrchestrator = new AvatarOrchestratorClass()

// Export padrão
export default AvatarOrchestrator
