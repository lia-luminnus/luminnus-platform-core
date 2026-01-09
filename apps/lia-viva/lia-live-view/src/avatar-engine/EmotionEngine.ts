
// =====================================================
// EMOTION ENGINE v3.1 - Decodificador Estrito
// =====================================================
// - Recebe { emotion, intensity } do backend
// - Mapeia APENAS para frames existentes
// - SEM aleatoriedade
// - SEM fallback para imagens Gemini
// =====================================================

import { AvatarEngine, type ExpressionName } from './AvatarEngine'

// LEITURA DO USER:
// happy -> "Lia expressando alegriafelicidade.PNG"
// sad -> "Lia expressando tristeza.PNG"
// curious -> "Lia expressando curiosidade.PNG"
// surprised -> "Lia expressando surpresa.PNG"
// confused -> "Lia com uma expressão de confusão.PNG"
// frustrated -> "Lia expressando frustração.PNG"
// fearful -> "Lia expressando medo.PNG"
// bored -> "Lia porco quase todo.PNG"
// proud -> "Lia expressando orgulho.PNG"

export interface EmotionDecision {
    expression: ExpressionName
    intensity: number
    reason: string
    shouldSpeak?: boolean
}

export interface EmotionRequest {
    userMessage: string
    assistantReply: string
    emotionTemperature: number
}

class EmotionEngineClass {
    constructor() {
        console.log('🧠 EmotionEngine v3.1 inicializado (Estrito)')
    }

    // =====================================================
    // PROCESSAR MENSAGEM
    // =====================================================

    async processMessage(
        userMessage: string,
        assistantReply: string,
        temperature: number = 5
    ): Promise<EmotionDecision> {
        // 1. Tentar Backend (GPT)
        try {
            const backendResult = await this.callBackend({
                userMessage,
                assistantReply,
                emotionTemperature: temperature
            })

            if (backendResult) {
                console.log(`🧠 EmotionEngine (GPT): ${backendResult.expression} (int: ${backendResult.intensity}) Speak: ${backendResult.shouldSpeak}`)

                AvatarEngine.setEmotionTemperature(temperature)
                // Aplica COM SEGURANÇA
                this.applySafeEmotion(backendResult.expression)

                // NOVO: Trigger Lip-Sync se o backend mandar
                if (backendResult.shouldSpeak) {
                    AvatarEngine.startTalking()
                    // Stop talking é controlado externamente (audio end) ou por timer no AvatarEngine se necessário, 
                    // mas aqui vamos assumir que o frontend dispara o "stop" quando o audio acaba.
                    // Porém, para garantir consistência visual imediata:
                }

                return backendResult
            }
        } catch (error) {
            console.error('🧠 Erro no Emotion Backend:', error)
        }

        // 2. Fallback LOCAL (Apenas Keyword Matching Estrito)
        // Se falhar o backend, tentamos deduzir pelo texto, 
        // mas sem "chutar" aleatoriamente.
        console.warn('🧠 Usando fallback local estrito')
        const localDecision = this.analyzeLocallyStrict(assistantReply)

        AvatarEngine.setEmotionTemperature(temperature)
        this.applySafeEmotion(localDecision.expression)

        return localDecision
    }

    // =====================================================
    // APLICAÇÃO SEGURA
    // =====================================================

    private applySafeEmotion(expr: string) {
        // Validar se a expressão existe no AvatarEngine types
        // Se vier algo estranho do GPT (ex: "angry"), mapeamos para o mais próximo ou neutral
        // O AvatarEngine já tem validação, mas reforçamos aqui.

        const validMap: Record<string, ExpressionName> = {
            'joy': 'happy',
            'happy': 'happy',
            'sadness': 'sad',
            'sad': 'sad',
            'surprise': 'surprised',
            'surprised': 'surprised',
            'confusion': 'confused',
            'confused': 'confused',
            'curiosity': 'curious',
            'curious': 'curious',
            'frustration': 'frustrated',
            'frustrated': 'frustrated',
            'fear': 'fearful',
            'fearful': 'fearful',
            'anxiety': 'fearful',
            'pride': 'proud',
            'proud': 'proud',
            'boredom': 'bored',
            'bored': 'bored',
            'disgust': 'contempt',
            'contempt': 'contempt',
            'envy': 'envious',
            'envious': 'envious',
            'neutral': 'neutral'
        }

        const mapped = validMap[expr.toLowerCase()] || 'neutral'
        AvatarEngine.applyEmotion(mapped)
    }

    // =====================================================
    // CHAMADA BACKEND
    // =====================================================

    private async callBackend(request: EmotionRequest): Promise<EmotionDecision | null> {
        try {
            // Nota: O endpoint deve retornar { emotion: string, intensity: number, shouldSpeak: boolean }
            const response = await fetch('/api/emotion-decode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            })

            if (!response.ok) return null

            const data = await response.json()

            // Validação básica da resposta
            if (!data.emotion) return null

            return {
                expression: data.emotion, // O backend deve enviar "emotion"
                intensity: data.intensity || 0.5,
                shouldSpeak: data.shouldSpeak, // Captura instrução de falan
                reason: 'gpt-backend'
            }
        } catch {
            return null
        }
    }

    // =====================================================
    // FALLBACK NO-GUESS (Apenas palavras óbvias)
    // =====================================================

    private analyzeLocallyStrict(text: string): EmotionDecision {
        const t = text.toLowerCase()

        // Mapeamento direto de palavras-chave fortes
        if (t.includes('sinto muito') || t.includes('triste') || t.includes('lamento'))
            return { expression: 'sad', intensity: 0.8, reason: 'keyword-sad' }

        if (t.includes('haha') || t.includes('kkk') || t.includes('feliz') || t.includes('ótimo'))
            return { expression: 'happy', intensity: 0.8, reason: 'keyword-happy' }

        if (t.includes('uau') || t.includes('nossa') || t.includes('incrível'))
            return { expression: 'surprised', intensity: 0.8, reason: 'keyword-surprised' }

        if (t.includes('não entendi') || t.includes('confus'))
            return { expression: 'confused', intensity: 0.8, reason: 'keyword-confused' }

        if (t.includes('interessante') || t.includes('me conta'))
            return { expression: 'curious', intensity: 0.6, reason: 'keyword-curious' }

        // Se não tiver certeza absoluta: NEUTRO (ou Curioso que é o "coringa" seguro)
        return { expression: 'curious', intensity: 0.3, reason: 'default-safe' }
    }

    // =====================================================
    // TESTES MANUAIS
    // =====================================================

    setEmotion(expression: ExpressionName) {
        AvatarEngine.applyEmotion(expression)
    }
}

export const EmotionEngine = new EmotionEngineClass()
export default EmotionEngine

