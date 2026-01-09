/**
 * MotionSynthesizer.js
 * =====================================================
 * Gera movimentos naturais de idle: piscar, respirar,
 * microexpressões e movimentos sutis
 * =====================================================
 */

export class MotionSynthesizer {
    constructor() {
        this.emotion = 'neutral';
        this.intensity = 0.5;
        this.lastBlinkTime = 0;
        this.nextBlinkTime = this.randomBlinkInterval();
        this.breathPhase = 0;
        this.microExpressionTimer = 0;
        this.headMotion = { x: 0, y: 0, rotation: 0 };
        this.startTime = performance.now();
    }

    /**
     * Define a emoção atual
     */
    setEmotion(emotion, intensity = 0.5) {
        this.emotion = emotion;
        this.intensity = Math.max(0, Math.min(1, intensity));
        console.log(`[MotionSynthesizer] Emotion: ${emotion} (${(intensity * 100).toFixed(0)}%)`);
    }

    /**
     * Intervalo aleatório entre piscadas (2-6 segundos)
     */
    randomBlinkInterval() {
        return 2000 + Math.random() * 4000;
    }

    /**
     * Obtém blendshapes de movimento natural
     */
    getMotionBlendshapes() {
        const now = performance.now();
        const elapsed = now - this.startTime;
        const blendshapes = {};

        // 1. Piscar automático
        const blinkWeights = this.calculateBlink(now);
        blendshapes.eyeBlinkLeft = blinkWeights.left;
        blendshapes.eyeBlinkRight = blinkWeights.right;

        // 2. Respiração sutil
        const breathWeight = this.calculateBreathing(elapsed);
        blendshapes.breathe = breathWeight;

        // 3. Microexpressões baseadas na emoção
        const microWeights = this.calculateMicroExpressions(elapsed);
        Object.assign(blendshapes, microWeights);

        // 4. Movimento sutil de cabeça
        this.calculateHeadMotion(elapsed);

        return blendshapes;
    }

    /**
     * Calcula animação de piscar
     */
    calculateBlink(now) {
        // Verificar se é hora de piscar
        if (now - this.lastBlinkTime > this.nextBlinkTime) {
            this.lastBlinkTime = now;
            this.nextBlinkTime = this.randomBlinkInterval();
        }

        // Animação do piscar (dura ~150ms)
        const blinkProgress = (now - this.lastBlinkTime);
        let weight = 0;

        if (blinkProgress < 75) {
            // Fechando (0-75ms)
            weight = blinkProgress / 75;
        } else if (blinkProgress < 150) {
            // Abrindo (75-150ms)
            weight = 1 - (blinkProgress - 75) / 75;
        }

        // Ocasionalmente piscar assíncrono
        const asyncBlink = Math.random() > 0.95;

        return {
            left: weight,
            right: asyncBlink ? weight * 0.5 : weight
        };
    }

    /**
     * Calcula respiração sutil
     */
    calculateBreathing(elapsed) {
        // Ciclo de respiração: 4 segundos
        const breathCycle = 4000;
        this.breathPhase = (elapsed % breathCycle) / breathCycle;

        // Movimento senoidal suave
        return Math.sin(this.breathPhase * Math.PI * 2) * 0.02;
    }

    /**
     * Calcula microexpressões baseadas na emoção
     */
    calculateMicroExpressions(elapsed) {
        const weights = {};

        // Variação sutil baseada no tempo
        const microCycle = elapsed / 5000; // Ciclo de 5 segundos
        const variation = Math.sin(microCycle) * 0.05;

        switch (this.emotion) {
            case 'happy':
                weights.mouthSmile = 0.3 + variation * this.intensity;
                weights.browUpLeft = 0.1;
                weights.browUpRight = 0.1;
                break;

            case 'sad':
                weights.mouthFrown = 0.2 + variation * this.intensity;
                weights.browDownLeft = 0.15;
                weights.browDownRight = 0.15;
                break;

            case 'surprised':
                weights.browUpLeft = 0.4 + variation * this.intensity;
                weights.browUpRight = 0.4 + variation * this.intensity;
                weights.eyeWideLeft = 0.3;
                weights.eyeWideRight = 0.3;
                weights.jawOpen = 0.2;
                break;

            case 'angry':
                weights.browDownLeft = 0.3 + variation * this.intensity;
                weights.browDownRight = 0.3 + variation * this.intensity;
                weights.mouthFrown = 0.15;
                break;

            case 'curious':
                weights.browUpLeft = 0.2;
                weights.browUpRight = 0.1;
                weights.mouthSmile = 0.1;
                break;

            case 'talking':
                // Lip-sync gerencia isso, mas adicionar variação
                weights.mouthSmile = variation * 0.1;
                break;

            case 'neutral':
            default:
                // Microexpressões muito sutis
                weights.mouthSmile = variation * 0.02;
                break;
        }

        return weights;
    }

    /**
     * Calcula movimento sutil de cabeça
     */
    calculateHeadMotion(elapsed) {
        // Movimento muito lento e sutil
        const xCycle = elapsed / 8000;
        const yCycle = elapsed / 10000;
        const rotCycle = elapsed / 12000;

        this.headMotion = {
            x: Math.sin(xCycle * Math.PI * 2) * 2,
            y: Math.sin(yCycle * Math.PI * 2) * 1.5,
            rotation: Math.sin(rotCycle * Math.PI * 2) * 0.5
        };
    }

    /**
     * Obtém transformação de cabeça
     */
    getHeadTransform() {
        return this.headMotion;
    }

    /**
     * Aplica motion ao contexto (para renderização)
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} rig 
     */
    apply(ctx, rig) {
        const blendshapes = this.getMotionBlendshapes();
        const headTransform = this.getHeadTransform();

        // Aplicar transformação de cabeça ao canvas
        if (headTransform && ctx) {
            // Salvar estado atual
            // A transformação será aplicada pelo AvatarEnginePro
        }

        return {
            blendshapes,
            headTransform
        };
    }

    /**
     * Mapa de emoções para configuração
     */
    static EMOTION_CONFIGS = {
        neutral: { blinkRate: 1.0, breathRate: 1.0, variation: 0.02 },
        happy: { blinkRate: 1.2, breathRate: 1.1, variation: 0.05 },
        sad: { blinkRate: 0.8, breathRate: 0.9, variation: 0.03 },
        surprised: { blinkRate: 0.5, breathRate: 1.3, variation: 0.08 },
        angry: { blinkRate: 1.5, breathRate: 1.2, variation: 0.04 },
        curious: { blinkRate: 0.7, breathRate: 1.0, variation: 0.06 },
        talking: { blinkRate: 1.0, breathRate: 1.1, variation: 0.03 }
    };
}
