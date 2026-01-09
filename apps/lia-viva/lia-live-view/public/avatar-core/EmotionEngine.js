/**
 * EmotionEngine.js
 * =====================================================
 * Analisa texto e detecta emoção dominante
 * Pode integrar com backend para análise GPT mais precisa
 * =====================================================
 */

export class EmotionEngine {
    constructor() {
        this.currentEmotion = 'neutral';
        this.emotionIntensity = 0.5;
        this.emotionHistory = [];
        this.backendUrl = '/api/emotion-decode';
    }

    /**
     * Palavras-chave para detecção de emoção (português)
     */
    static EMOTION_KEYWORDS = {
        happy: [
            'feliz', 'alegre', 'contente', 'ótimo', 'maravilhoso', 'incrível',
            'parabéns', 'adorei', 'amei', 'legal', 'massa', 'top', 'perfeito',
            'excelente', 'fantástico', 'sensacional', 'demais', 'show', 'sucesso',
            'alegria', 'satisfação', 'prazer', 'amor', 'carinho', 'boa', 'bom',
            '😊', '😄', '😃', '🎉', '❤️', '💕', '✨', '🥰'
        ],
        sad: [
            'triste', 'tristeza', 'pena', 'infelizmente', 'sinto muito', 'lamento',
            'difícil', 'complicado', 'problema', 'ruim', 'mal', 'dor', 'perda',
            'saudade', 'falta', 'vazio', 'sozinho', 'abandonado', 'desculpa',
            '😢', '😭', '💔', '😔', '😞'
        ],
        surprised: [
            'uau', 'nossa', 'caramba', 'sério', 'verdade', 'impressionante',
            'inacreditável', 'chocado', 'espantado', 'surpresa', 'inesperado',
            'nunca', 'impossível', 'extraordinário', 'absurdo', 'não acredito',
            '😮', '😲', '🤯', '😱', '🙀', '!'
        ],
        angry: [
            'raiva', 'irritado', 'bravo', 'furioso', 'absurdo', 'injusto',
            'errado', 'péssimo', 'horrível', 'odeio', 'droga', 'merda',
            'inferno', 'desgraça', 'maldito', 'idiota', 'estúpido',
            '😠', '😡', '🤬', '💢'
        ],
        curious: [
            'interessante', 'curioso', 'pergunta', 'como', 'por que', 'será',
            'explica', 'conta', 'detalhe', 'mais', 'entender', 'aprender',
            'descobrir', 'investigar', 'pesquisar', 'analisar',
            '🤔', '🧐', '❓', '?'
        ],
        neutral: []
    };

    /**
     * Decodifica emoção do texto
     * @param {string} text - Texto para análise
     * @param {boolean} useBackend - Se deve usar API do backend
     * @returns {Promise<Object>} Emoção e intensidade
     */
    async decode(text, useBackend = false) {
        if (!text || text.trim().length === 0) {
            return { emotion: 'neutral', intensity: 0.5 };
        }

        // Tentar backend primeiro se habilitado
        if (useBackend) {
            try {
                const backendResult = await this.decodeWithBackend(text);
                if (backendResult) {
                    this.setEmotion(backendResult.emotion, backendResult.intensity);
                    return backendResult;
                }
            } catch (error) {
                console.warn('[EmotionEngine] Backend fallback to local:', error.message);
            }
        }

        // Análise local
        const result = this.analyzeLocal(text);
        this.setEmotion(result.emotion, result.intensity);
        return result;
    }

    /**
     * Análise local com keywords
     */
    analyzeLocal(text) {
        const lowerText = text.toLowerCase();
        const scores = {};
        let maxScore = 0;
        let detectedEmotion = 'neutral';

        // Calcular pontuação para cada emoção
        for (const [emotion, keywords] of Object.entries(EmotionEngine.EMOTION_KEYWORDS)) {
            scores[emotion] = 0;

            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    scores[emotion]++;

                    // Bônus para emojis
                    if (keyword.match(/[\u{1F300}-\u{1F9FF}]/u)) {
                        scores[emotion] += 0.5;
                    }
                }
            }

            if (scores[emotion] > maxScore) {
                maxScore = scores[emotion];
                detectedEmotion = emotion;
            }
        }

        // Calcular intensidade
        let intensity = 0.5;

        // Exclamações aumentam intensidade
        const exclamations = (text.match(/!/g) || []).length;
        intensity += exclamations * 0.1;

        // Caps lock aumenta intensidade
        const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
        if (capsRatio > 0.5) {
            intensity += 0.2;
        }

        // Repetição de caracteres
        if (text.match(/(.)\1{2,}/)) {
            intensity += 0.15;
        }

        // Emojis aumentam intensidade
        const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
        intensity += emojiCount * 0.1;

        intensity = Math.min(1, Math.max(0.3, intensity));

        // Detectar emoção secundária
        const secondaryEmotion = this.detectSecondaryEmotion(scores, detectedEmotion);

        console.log(`[EmotionEngine] Local: ${detectedEmotion} (${(intensity * 100).toFixed(0)}%)`);

        return {
            emotion: detectedEmotion,
            intensity,
            secondary: secondaryEmotion,
            scores
        };
    }

    /**
     * Detecta emoção secundária
     */
    detectSecondaryEmotion(scores, primary) {
        let secondScore = 0;
        let secondary = 'neutral';

        for (const [emotion, score] of Object.entries(scores)) {
            if (emotion !== primary && score > secondScore) {
                secondScore = score;
                secondary = emotion;
            }
        }

        return secondScore > 0 ? secondary : null;
    }

    /**
     * Análise via backend
     */
    async decodeWithBackend(text) {
        const response = await fetch(this.backendUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return {
            emotion: data.emotion || 'neutral',
            intensity: data.intensity || 0.5,
            source: 'backend'
        };
    }

    /**
     * Define emoção atual
     */
    setEmotion(emotion, intensity = 0.5) {
        this.currentEmotion = emotion;
        this.emotionIntensity = intensity;

        // Adicionar ao histórico
        this.emotionHistory.push({
            emotion,
            intensity,
            timestamp: Date.now()
        });

        // Manter últimos 20 registros
        if (this.emotionHistory.length > 20) {
            this.emotionHistory.shift();
        }
    }

    /**
     * Obtém emoção atual
     */
    getCurrentEmotion() {
        return {
            emotion: this.currentEmotion,
            intensity: this.emotionIntensity
        };
    }

    /**
     * Obtém emoção dominante recente
     */
    getDominantRecentEmotion() {
        if (this.emotionHistory.length === 0) {
            return { emotion: 'neutral', intensity: 0.5 };
        }

        const counts = {};
        let totalIntensity = {};

        for (const record of this.emotionHistory) {
            counts[record.emotion] = (counts[record.emotion] || 0) + 1;
            totalIntensity[record.emotion] = (totalIntensity[record.emotion] || 0) + record.intensity;
        }

        let dominant = 'neutral';
        let maxCount = 0;

        for (const [emotion, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                dominant = emotion;
            }
        }

        return {
            emotion: dominant,
            intensity: totalIntensity[dominant] / maxCount
        };
    }

    /**
     * Mapeia emoção para blendshapes base
     */
    getEmotionBlendshapes(emotion, intensity = 1) {
        const blendshapes = {
            neutral: { mouthSmile: 0, mouthFrown: 0, browUpLeft: 0, browUpRight: 0, browDownLeft: 0, browDownRight: 0, eyeWideLeft: 0, eyeWideRight: 0 },
            happy: { mouthSmile: 0.5 * intensity, browUpLeft: 0.2 * intensity, browUpRight: 0.2 * intensity },
            sad: { mouthFrown: 0.4 * intensity, browDownLeft: 0.3 * intensity, browDownRight: 0.3 * intensity },
            surprised: { browUpLeft: 0.6 * intensity, browUpRight: 0.6 * intensity, eyeWideLeft: 0.4 * intensity, eyeWideRight: 0.4 * intensity, jawOpen: 0.3 * intensity },
            angry: { browDownLeft: 0.5 * intensity, browDownRight: 0.5 * intensity, mouthFrown: 0.2 * intensity },
            curious: { browUpLeft: 0.3 * intensity, browUpRight: 0.1 * intensity, mouthSmile: 0.1 * intensity }
        };

        return blendshapes[emotion] || blendshapes.neutral;
    }
}
