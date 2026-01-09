// =====================================================
// AVATAR ANIMATION ENGINE - Motor de Animação por Camadas
// =====================================================
// Este motor controla animações INDIVIDUAIS de cada parte
// do avatar usando CSS transforms, NÃO troca de PNGs.
// =====================================================

// =====================================================
// TIPOS
// =====================================================

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error'
export type AvatarEmotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'confused' | 'angry' | 'proud'
export type AvatarGesture = 'none' | 'wave' | 'shrug' | 'explain' | 'nod_yes' | 'nod_no'

// Estado de cada camada do avatar
export interface LayerState {
    // Boca (lip-sync)
    mouthOpenness: number // 0 = fechada, 1 = totalmente aberta

    // Olhos
    eyeOpenness: number // 0 = fechado, 1 = aberto
    eyeLookX: number // -1 = olhando esquerda, 0 = centro, 1 = direita
    eyeLookY: number // -1 = olhando cima, 0 = centro, 1 = baixo

    // Sobrancelhas
    browPosition: number // -1 = franzida, 0 = neutral, 1 = levantada

    // Cabeça
    headTiltX: number // rotação lateral (-5 a 5 graus)
    headTiltY: number // rotação vertical (-5 a 5 graus)
    headNod: number // para gestos de sim/não

    // Corpo
    breatheScale: number // 1.0 = normal, varia para simular respiração
    bodySwayX: number // movimento lateral sutil

    // Gesto atual
    gestureProgress: number // 0 a 1, progresso do gesto
    gestureType: AvatarGesture
}

export interface AvatarAnimationState {
    state: AvatarState
    emotion: AvatarEmotion
    layers: LayerState
}

type AnimationListener = (state: AvatarAnimationState) => void

// =====================================================
// CLASSE DO MOTOR DE ANIMAÇÃO
// =====================================================

class AvatarAnimationEngineClass {
    // Estado atual
    private _state: AvatarState = 'idle'
    private _emotion: AvatarEmotion = 'neutral'

    // Estado das camadas
    private _layers: LayerState = {
        mouthOpenness: 0,
        eyeOpenness: 1,
        eyeLookX: 0,
        eyeLookY: 0,
        browPosition: 0,
        headTiltX: 0,
        headTiltY: 0,
        headNod: 0,
        breatheScale: 1,
        bodySwayX: 0,
        gestureProgress: 0,
        gestureType: 'none'
    }

    // Listeners
    private _listeners: Set<AnimationListener> = new Set()

    // Timers e controles
    private _animationFrame: number | null = null
    private _lastTime: number = 0
    private _lipSyncActive: boolean = false
    private _lipSyncPhase: number = 0
    private _blinkTimer: number = 0
    private _nextBlinkTime: number = 3000
    private _breathePhase: number = 0
    private _idleLookPhase: number = 0

    // FLAG: Só anima quando conversa por voz está ativa
    private _isVoiceActive: boolean = false

    // Gesto em andamento
    private _gestureStartTime: number = 0
    private _gestureDuration: number = 0

    // Configurações
    private _config = {
        breatheSpeed: 0.5, // ciclos por segundo
        breatheAmount: 0.008, // intensidade da respiração
        blinkDuration: 150, // ms
        lipSyncSpeed: 8, // ciclos por segundo
        eyeFollowSpeed: 0.02, // velocidade de seguir
    }

    constructor() {
        this.startAnimationLoop()
    }

    // =====================================================
    // LOOP DE ANIMAÇÃO PRINCIPAL (requestAnimationFrame)
    // =====================================================

    private startAnimationLoop() {
        const animate = (currentTime: number) => {
            const deltaTime = currentTime - this._lastTime
            this._lastTime = currentTime

            // SÓ ANIMA SE VOZ ATIVA (listening, speaking)
            if (this._isVoiceActive) {
                this.updateBreathing(deltaTime)
                this.updateBlink(deltaTime)
                this.updateLipSync(deltaTime)
                this.updateIdleLook(deltaTime)
                this.updateGesture(deltaTime)
            } else {
                // No chat, manter estática (só lip-sync se ativo)
                this.updateLipSync(deltaTime)
            }

            // Notificar listeners
            this.notify()

            // Continuar loop
            this._animationFrame = requestAnimationFrame(animate)
        }

        this._animationFrame = requestAnimationFrame(animate)
    }

    // =====================================================
    // ANIMAÇÃO: RESPIRAÇÃO
    // =====================================================

    private updateBreathing(deltaTime: number) {
        this._breathePhase += (deltaTime / 1000) * this._config.breatheSpeed * Math.PI * 2

        // Seno suave para respiração
        const breathe = Math.sin(this._breathePhase) * this._config.breatheAmount
        this._layers.breatheScale = 1 + breathe
    }

    // REMOVIDO: updateSway - movimento lateral não é mais usado

    // =====================================================
    // ANIMAÇÃO: PISCADA
    // =====================================================

    private updateBlink(deltaTime: number) {
        this._blinkTimer += deltaTime

        // Verificar se é hora de piscar
        if (this._blinkTimer >= this._nextBlinkTime) {
            // Iniciar piscada
            this._layers.eyeOpenness = 0

            // Agendar abertura dos olhos
            setTimeout(() => {
                this._layers.eyeOpenness = 1
            }, this._config.blinkDuration)

            // Próxima piscada (3-7 segundos)
            this._nextBlinkTime = 3000 + Math.random() * 4000
            this._blinkTimer = 0
        }
    }

    // =====================================================
    // ANIMAÇÃO: LIP-SYNC
    // =====================================================

    private updateLipSync(deltaTime: number) {
        if (!this._lipSyncActive) {
            // Fechar boca gradualmente
            this._layers.mouthOpenness = Math.max(0, this._layers.mouthOpenness - deltaTime / 100)
            return
        }

        // Animar boca com padrão de fala
        this._lipSyncPhase += (deltaTime / 1000) * this._config.lipSyncSpeed * Math.PI * 2

        // Padrão variado para parecer mais natural
        const base = (Math.sin(this._lipSyncPhase) + 1) / 2 // 0 a 1
        const variation = Math.sin(this._lipSyncPhase * 2.7) * 0.2 // variação
        const noise = Math.sin(this._lipSyncPhase * 5.3) * 0.1 // ruído

        this._layers.mouthOpenness = Math.max(0, Math.min(1, base + variation + noise))
    }

    // =====================================================
    // ANIMAÇÃO: OLHOS SEGUINDO
    // =====================================================

    private updateIdleLook(deltaTime: number) {
        // Só anima quando não está em gesto
        if (this._layers.gestureType !== 'none') return

        this._idleLookPhase += deltaTime / 1000

        // Movimento lento e suave dos olhos
        const targetX = Math.sin(this._idleLookPhase * 0.3) * 0.3
        const targetY = Math.cos(this._idleLookPhase * 0.2) * 0.2

        // Interpolar suavemente
        this._layers.eyeLookX += (targetX - this._layers.eyeLookX) * this._config.eyeFollowSpeed
        this._layers.eyeLookY += (targetY - this._layers.eyeLookY) * this._config.eyeFollowSpeed
    }

    // =====================================================
    // ANIMAÇÃO: GESTOS
    // =====================================================

    private updateGesture(deltaTime: number) {
        if (this._layers.gestureType === 'none') return

        const elapsed = performance.now() - this._gestureStartTime
        this._layers.gestureProgress = Math.min(1, elapsed / this._gestureDuration)

        // Aplicar efeitos do gesto
        switch (this._layers.gestureType) {
            case 'wave':
                // Movimento de aceno (simulado via head tilt)
                this._layers.headTiltX = Math.sin(this._layers.gestureProgress * Math.PI * 4) * 5
                break

            case 'nod_yes':
                // Movimento de sim
                this._layers.headNod = Math.sin(this._layers.gestureProgress * Math.PI * 3) * 8
                break

            case 'nod_no':
                // Movimento de não
                this._layers.headTiltX = Math.sin(this._layers.gestureProgress * Math.PI * 4) * 10
                break

            case 'shrug':
                // Encolher ombros (via breathe scale)
                const shrugCurve = Math.sin(this._layers.gestureProgress * Math.PI)
                this._layers.breatheScale = 1 + shrugCurve * 0.03
                this._layers.browPosition = shrugCurve
                break

            case 'explain':
                // Gesto de explicação
                this._layers.headTiltX = Math.sin(this._layers.gestureProgress * Math.PI * 2) * 3
                this._layers.browPosition = 0.5
                break
        }

        // Terminar gesto
        if (this._layers.gestureProgress >= 1) {
            this._layers.gestureType = 'none'
            this._layers.gestureProgress = 0
            this._layers.headNod = 0
            this._layers.browPosition = 0
        }
    }

    // =====================================================
    // GETTERS
    // =====================================================

    get state() { return this._state }
    get emotion() { return this._emotion }
    get layers() { return { ...this._layers } }

    get animationState(): AvatarAnimationState {
        return {
            state: this._state,
            emotion: this._emotion,
            layers: { ...this._layers }
        }
    }

    // =====================================================
    // METHODS: CONTROLE DE ESTADO
    // =====================================================

    setState(newState: AvatarState) {
        if (this._state === newState) return
        console.log('🎭 Avatar State:', newState)
        this._state = newState

        // Ajustar emoção padrão por estado
        if (newState === 'listening') {
            this._emotion = 'neutral'
            this._layers.browPosition = 0.3 // sobrancelha levemente levantada
        } else if (newState === 'thinking') {
            this._emotion = 'confused'
            this._layers.browPosition = -0.3 // sobrancelha levemente franzida
        } else if (newState === 'speaking') {
            this._emotion = 'neutral'
        } else if (newState === 'error') {
            this._emotion = 'sad'
            this._layers.browPosition = -0.5
        }
    }

    setEmotion(emotion: AvatarEmotion) {
        if (this._emotion === emotion) return
        console.log('😊 Avatar Emotion:', emotion)
        this._emotion = emotion

        // Ajustar sobrancelhas por emoção
        switch (emotion) {
            case 'happy':
            case 'proud':
                this._layers.browPosition = 0.3
                break
            case 'sad':
                this._layers.browPosition = -0.5
                this._layers.eyeLookY = 0.3 // olhar para baixo
                break
            case 'surprised':
                this._layers.browPosition = 1
                this._layers.eyeOpenness = 1.2 // olhos mais abertos
                break
            case 'confused':
                this._layers.browPosition = -0.3
                break
            case 'angry':
                this._layers.browPosition = -0.8
                break
            default:
                this._layers.browPosition = 0
        }
    }

    // =====================================================
    // METHODS: LIP-SYNC
    // =====================================================

    startLipSync() {
        if (this._lipSyncActive) return
        console.log('👄 Lip-sync: START')
        this._lipSyncActive = true
        this._lipSyncPhase = 0
        this.setState('speaking')
    }

    stopLipSync() {
        if (!this._lipSyncActive) return
        console.log('👄 Lip-sync: STOP')
        this._lipSyncActive = false
    }

    // =====================================================
    // METHODS: GESTOS
    // =====================================================

    playGesture(gesture: AvatarGesture, durationMs: number = 1500) {
        if (gesture === 'none') return
        console.log('👋 Gesture:', gesture)

        this._layers.gestureType = gesture
        this._layers.gestureProgress = 0
        this._gestureStartTime = performance.now()
        this._gestureDuration = durationMs
    }

    // =====================================================
    // METHODS: EVENTOS DO SISTEMA
    // =====================================================

    onAudioStart() {
        this._isVoiceActive = true // Ativar animações
        this.startLipSync()
    }

    onAudioEnd() {
        this.stopLipSync()
        this.setState('idle')
        // Manter voz ativa para transição suave
    }

    onListeningStart() {
        this._isVoiceActive = true // Ativar animações
        this.setState('listening')
    }

    onThinking() {
        this.setState('thinking')
    }

    // Desativar modo voz (volta para estático)
    onVoiceEnd() {
        this._isVoiceActive = false
        this.setState('idle')
        // Resetar para posição estática
        this._layers.breatheScale = 1
        this._layers.bodySwayX = 0
        this._layers.headTiltX = 0
        this._layers.headTiltY = 0
    }

    // =====================================================
    // METHODS: LISTENERS
    // =====================================================

    subscribe(listener: AnimationListener): () => void {
        this._listeners.add(listener)
        listener(this.animationState)
        return () => this._listeners.delete(listener)
    }

    private notify() {
        const state = this.animationState
        this._listeners.forEach(l => l(state))
    }

    // =====================================================
    // CLEANUP
    // =====================================================

    destroy() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame)
        }
        this._listeners.clear()
    }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const AvatarAnimationEngine = new AvatarAnimationEngineClass()
export default AvatarAnimationEngine
