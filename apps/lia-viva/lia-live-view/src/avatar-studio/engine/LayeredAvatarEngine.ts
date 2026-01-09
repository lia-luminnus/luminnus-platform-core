// =====================================================
// LAYERED AVATAR ENGINE - Motor de Camadas Separadas
// =====================================================
// Este motor renderiza o avatar usando sprites SEPARADOS
// para boca, olhos, e sobrancelhas, permitindo animação
// independente de cada parte.
// =====================================================

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface AvatarLayerConfig {
    // Boca (0 = fechada, 1 = semi-aberta, 2 = aberta)
    mouthFrame: 0 | 1 | 2

    // Olhos (0 = abertos, 1 = semi-aberto, 2 = fechados)
    eyeFrame: 0 | 1 | 2

    // Sobrancelhas (-1 = franzida, 0 = normal, 1 = levantada)
    browFrame: -1 | 0 | 1

    // Cabeça (rotação em graus)
    headRotationX: number // -10 a 10
    headRotationY: number // -10 a 10

    // Escala de respiração
    breatheScale: number // 0.99 a 1.01

    // Posição dos olhos (olhar)
    eyeLookX: number // -1 a 1
    eyeLookY: number // -1 a 1
}

export interface AvatarPublishConfig extends AvatarLayerConfig {
    version: number
    publishedAt: number
    name: string
}

// =====================================================
// NOTA: AVATAR_SPRITES e LAYER_OFFSETS agora estão em
// /config/AvatarRigConfig.ts para centralização
// =====================================================

// =====================================================
// STORAGE KEY
// =====================================================

const STORAGE_KEY = 'lia-avatar-published-config'

// =====================================================
// CLASSE DO MOTOR
// =====================================================

class LayeredAvatarEngineClass {
    private _config: AvatarLayerConfig = {
        mouthFrame: 0,
        eyeFrame: 0,
        browFrame: 0,
        headRotationX: 0,
        headRotationY: 0,
        breatheScale: 1,
        eyeLookX: 0,
        eyeLookY: 0
    }

    private _publishedConfig: AvatarPublishConfig | null = null
    private _listeners: Set<(config: AvatarLayerConfig) => void> = new Set()
    private _isVoiceActive: boolean = false

    // Timers para animação
    private _animationFrame: number | null = null
    private _lipSyncActive: boolean = false
    private _lipSyncPhase: number = 0
    private _blinkTimer: number = 0
    private _nextBlinkTime: number = 3000
    private _breathePhase: number = 0

    constructor() {
        this.loadPublishedConfig()
    }

    // =====================================================
    // GETTERS
    // =====================================================

    get config(): AvatarLayerConfig { return { ...this._config } }
    get publishedConfig(): AvatarPublishConfig | null { return this._publishedConfig }
    get isVoiceActive(): boolean { return this._isVoiceActive }

    // =====================================================
    // SETTERS
    // =====================================================

    setMouthFrame(frame: 0 | 1 | 2) {
        if (this._config.mouthFrame === frame) return
        this._config.mouthFrame = frame
        this.notify()
    }

    setEyeFrame(frame: 0 | 1 | 2) {
        if (this._config.eyeFrame === frame) return
        this._config.eyeFrame = frame
        this.notify()
    }

    setBrowFrame(frame: -1 | 0 | 1) {
        if (this._config.browFrame === frame) return
        this._config.browFrame = frame
        this.notify()
    }

    setHeadRotation(x: number, y: number) {
        this._config.headRotationX = Math.max(-10, Math.min(10, x))
        this._config.headRotationY = Math.max(-10, Math.min(10, y))
        this.notify()
    }

    setBreatheScale(scale: number) {
        this._config.breatheScale = Math.max(0.99, Math.min(1.01, scale))
        this.notify()
    }

    setEyeLook(x: number, y: number) {
        this._config.eyeLookX = Math.max(-1, Math.min(1, x))
        this._config.eyeLookY = Math.max(-1, Math.min(1, y))
        this.notify()
    }

    // =====================================================
    // ANIMAÇÃO
    // =====================================================

    startAnimation() {
        if (this._animationFrame) return
        this._isVoiceActive = true

        const animate = (currentTime: number) => {
            const deltaTime = 16 // ~60fps

            // Respiração
            this._breathePhase += deltaTime / 1000 * 0.5 * Math.PI * 2
            this._config.breatheScale = 1 + Math.sin(this._breathePhase) * 0.005

            // Piscada
            this._blinkTimer += deltaTime
            if (this._blinkTimer >= this._nextBlinkTime) {
                this._config.eyeFrame = 2 // Fechado
                setTimeout(() => {
                    this._config.eyeFrame = 0 // Aberto
                    this.notify()
                }, 150)
                this._nextBlinkTime = 3000 + Math.random() * 4000
                this._blinkTimer = 0
            }

            // Lip-sync
            if (this._lipSyncActive) {
                this._lipSyncPhase += deltaTime / 1000 * 8 * Math.PI * 2
                const mouthValue = (Math.sin(this._lipSyncPhase) + 1) / 2
                this._config.mouthFrame = mouthValue < 0.33 ? 0 : mouthValue < 0.66 ? 1 : 2
            }

            this.notify()
            this._animationFrame = requestAnimationFrame(animate)
        }

        this._animationFrame = requestAnimationFrame(animate)
    }

    stopAnimation() {
        if (this._animationFrame) {
            cancelAnimationFrame(this._animationFrame)
            this._animationFrame = null
        }
        this._isVoiceActive = false
        this._lipSyncActive = false

        // Resetar para posição neutra
        this._config.mouthFrame = 0
        this._config.eyeFrame = 0
        this._config.breatheScale = 1
        this.notify()
    }

    startLipSync() {
        this._lipSyncActive = true
        this._lipSyncPhase = 0
        if (!this._animationFrame) {
            this.startAnimation()
        }
    }

    stopLipSync() {
        this._lipSyncActive = false
        this._config.mouthFrame = 0
        this.notify()
    }

    // =====================================================
    // PUBLICAÇÃO
    // =====================================================

    publish(name: string = 'Avatar Build') {
        const config: AvatarPublishConfig = {
            ...this._config,
            version: (this._publishedConfig?.version || 0) + 1,
            publishedAt: Date.now(),
            name
        }

        this._publishedConfig = config

        // Salvar no localStorage
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
            console.log('📦 Avatar publicado:', config)
        } catch (e) {
            console.error('Erro ao salvar config:', e)
        }

        // Disparar evento global
        window.dispatchEvent(new CustomEvent('lia-avatar-published', { detail: config }))

        return config
    }

    loadPublishedConfig(): AvatarPublishConfig | null {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                this._publishedConfig = JSON.parse(saved)
                console.log('📦 Config carregada:', this._publishedConfig)
                return this._publishedConfig
            }
        } catch (e) {
            console.error('Erro ao carregar config:', e)
        }
        return null
    }

    // =====================================================
    // LISTENERS
    // =====================================================

    subscribe(listener: (config: AvatarLayerConfig) => void): () => void {
        this._listeners.add(listener)
        listener(this._config)
        return () => this._listeners.delete(listener)
    }

    private notify() {
        const config = { ...this._config }
        this._listeners.forEach(l => l(config))
    }

    // =====================================================
    // EVENTOS DO SISTEMA
    // =====================================================

    onAudioStart() {
        this.startAnimation()
        this.startLipSync()
    }

    onAudioEnd() {
        this.stopLipSync()
    }

    onListeningStart() {
        this.startAnimation()
    }

    onVoiceEnd() {
        this.stopAnimation()
    }
}

// =====================================================
// SINGLETON EXPORT
// =====================================================

export const LayeredAvatarEngine = new LayeredAvatarEngineClass()
export default LayeredAvatarEngine
