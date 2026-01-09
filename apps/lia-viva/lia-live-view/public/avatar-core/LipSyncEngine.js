/**
 * LipSyncEngine.js
 * =====================================================
 * Motor de Lip-Sync: converte áudio/fonemas em visemas
 * Gera blendshapes para animação labial sincronizada
 * =====================================================
 */

export class LipSyncEngine {
    constructor() {
        this.active = false;
        this.audioBuffer = null;
        this.audioContext = null;
        this.analyser = null;
        this.sourceNode = null;
        this.startTime = 0;
        this.phonemes = [];
        this.currentViseme = 'neutral';
        this.visemeWeights = this.getDefaultVisemeWeights();
    }

    /**
     * Mapeamento de fonemas para visemas
     */
    static PHONEME_TO_VISEME = {
        // Vogais
        'a': 'A', 'á': 'A', 'â': 'A', 'ã': 'A',
        'e': 'E', 'é': 'E', 'ê': 'E',
        'i': 'I', 'í': 'I',
        'o': 'O', 'ó': 'O', 'ô': 'O', 'õ': 'O',
        'u': 'U', 'ú': 'U',
        // Consoantes
        'b': 'M', 'm': 'M', 'p': 'M',
        'f': 'F', 'v': 'F',
        'd': 'D', 't': 'D', 'n': 'D', 'l': 'D',
        's': 'S', 'z': 'S', 'c': 'S', 'ç': 'S',
        'j': 'S', 'x': 'S', 'ch': 'S',
        'r': 'R', 'rr': 'R',
        'g': 'K', 'k': 'K', 'q': 'K',
        'h': 'neutral',
        ' ': 'neutral',
        '.': 'neutral',
        ',': 'neutral'
    };

    /**
     * Blendshapes para cada visema
     */
    static VISEME_BLENDSHAPES = {
        'neutral': { jawOpen: 0, mouthSmile: 0, mouthPucker: 0 },
        'A': { jawOpen: 0.7, mouthSmile: 0.1, mouthPucker: 0 },
        'E': { jawOpen: 0.4, mouthSmile: 0.3, mouthPucker: 0 },
        'I': { jawOpen: 0.2, mouthSmile: 0.5, mouthPucker: 0 },
        'O': { jawOpen: 0.5, mouthSmile: 0, mouthPucker: 0.5 },
        'U': { jawOpen: 0.3, mouthSmile: 0, mouthPucker: 0.8 },
        'M': { jawOpen: 0, mouthSmile: 0, mouthPucker: 0.2 },
        'F': { jawOpen: 0.1, mouthSmile: 0, mouthPucker: 0.1 },
        'D': { jawOpen: 0.2, mouthSmile: 0.1, mouthPucker: 0 },
        'S': { jawOpen: 0.15, mouthSmile: 0.2, mouthPucker: 0 },
        'R': { jawOpen: 0.25, mouthSmile: 0, mouthPucker: 0.1 },
        'K': { jawOpen: 0.3, mouthSmile: 0, mouthPucker: 0 }
    };

    /**
     * Inicia lip-sync com áudio ou fonemas
     * @param {ArrayBuffer|string} audioOrText - Buffer de áudio ou texto
     * @param {Array} phonemes - Timeline de fonemas opcional
     */
    async start(audioOrText, phonemes = null) {
        this.active = true;
        this.startTime = performance.now();

        if (phonemes) {
            this.phonemes = phonemes;
        } else if (typeof audioOrText === 'string') {
            // Gerar fonemas a partir do texto
            this.phonemes = this.textToPhonemes(audioOrText);
        }

        if (audioOrText instanceof ArrayBuffer) {
            await this.startAudioAnalysis(audioOrText);
        }

        console.log(`[LipSyncEngine] Started with ${this.phonemes.length} phonemes`);
    }

    /**
     * Converte texto em timeline de fonemas
     */
    textToPhonemes(text) {
        const phonemes = [];
        let currentTime = 0;
        const avgDuration = 0.08; // 80ms por fonema

        const chars = text.toLowerCase().split('');

        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            const viseme = LipSyncEngine.PHONEME_TO_VISEME[char] || 'neutral';

            // Combinar dígrafos
            if (i < chars.length - 1) {
                const digraph = char + chars[i + 1];
                if (['ch', 'lh', 'nh', 'rr', 'ss'].includes(digraph)) {
                    phonemes.push({
                        phoneme: digraph,
                        viseme: LipSyncEngine.PHONEME_TO_VISEME[digraph] || 'S',
                        start: currentTime,
                        end: currentTime + avgDuration * 1.5
                    });
                    currentTime += avgDuration * 1.5;
                    i++; // Pular próximo caractere
                    continue;
                }
            }

            if (char !== ' ') {
                phonemes.push({
                    phoneme: char,
                    viseme,
                    start: currentTime,
                    end: currentTime + avgDuration
                });
            }

            currentTime += char === ' ' ? avgDuration * 0.5 : avgDuration;
        }

        return phonemes;
    }

    /**
     * Inicia análise de áudio para energia
     */
    async startAudioAnalysis(audioBuffer) {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const decodedAudio = await this.audioContext.decodeAudioData(audioBuffer);

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            this.sourceNode = this.audioContext.createBufferSource();
            this.sourceNode.buffer = decodedAudio;
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.sourceNode.onended = () => this.stop();
            this.sourceNode.start();

            console.log('[LipSyncEngine] Audio analysis started');
        } catch (error) {
            console.error('[LipSyncEngine] Audio analysis error:', error);
        }
    }

    /**
     * Para o lip-sync
     */
    stop() {
        this.active = false;
        this.currentViseme = 'neutral';
        this.visemeWeights = this.getDefaultVisemeWeights();

        if (this.sourceNode) {
            try {
                this.sourceNode.stop();
            } catch (e) { }
        }
        if (this.audioContext) {
            this.audioContext.close();
        }

        console.log('[LipSyncEngine] Stopped');
    }

    /**
     * Obtém o visema atual baseado no tempo
     */
    getCurrentViseme() {
        if (!this.active) return 'neutral';

        const elapsed = (performance.now() - this.startTime) / 1000;

        // Encontrar fonema atual na timeline
        for (const p of this.phonemes) {
            if (elapsed >= p.start && elapsed < p.end) {
                return p.viseme;
            }
        }

        // Se tiver analyser, usar energia do áudio
        if (this.analyser) {
            const energy = this.getAudioEnergy();
            if (energy > 0.3) return 'A';
            if (energy > 0.1) return 'E';
        }

        return 'neutral';
    }

    /**
     * Obtém energia do áudio atual
     */
    getAudioEnergy() {
        if (!this.analyser) return 0;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArray);

        const sum = dataArray.reduce((a, b) => a + b, 0);
        return sum / (dataArray.length * 255);
    }

    /**
     * Aplica lip-sync ao rig
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} rig 
     */
    apply(ctx, rig) {
        if (!this.active) return this.getDefaultVisemeWeights();

        const viseme = this.getCurrentViseme();
        const targetWeights = LipSyncEngine.VISEME_BLENDSHAPES[viseme] || LipSyncEngine.VISEME_BLENDSHAPES.neutral;

        // Suavizar transição
        const smoothing = 0.3;
        for (const key of Object.keys(this.visemeWeights)) {
            const target = targetWeights[key] || 0;
            this.visemeWeights[key] += (target - this.visemeWeights[key]) * smoothing;
        }

        this.currentViseme = viseme;
        return this.visemeWeights;
    }

    /**
     * Retorna pesos padrão
     */
    getDefaultVisemeWeights() {
        return {
            jawOpen: 0,
            mouthSmile: 0,
            mouthPucker: 0
        };
    }

    /**
     * Verifica se está ativo
     */
    isActive() {
        return this.active;
    }

    /**
     * Obtém duração estimada
     */
    getDuration() {
        if (this.phonemes.length === 0) return 0;
        return this.phonemes[this.phonemes.length - 1].end;
    }
}
