// ===========================================================
// EMOTION DECODER ROUTE v3.0
// ===========================================================
// Endpoint para decodificar emoções via GPT.
// Retorna expressão facial restrita baseada na mensagem.
// ===========================================================

import express, { Request, Response } from 'express'
import OpenAI from 'openai'

const router = express.Router()

// OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
})

// Expressões válidas
const VALID_EXPRESSIONS = [
    'neutral', 'happy', 'surprised', 'confused',
    'curious', 'sad', 'frustrated', 'proud',
    'bored', 'contempt', 'fearful', 'envious', 'focused'
] as const

// Mapeamento de temperatura → expressões permitidas
const TEMP_MAPPING: Record<number, string[]> = {
    1: ['neutral', 'focused'],
    2: ['neutral', 'focused'],
    3: ['neutral', 'focused', 'curious'],
    4: ['neutral', 'curious', 'proud'],
    5: ['neutral', 'curious', 'happy'],
    6: ['curious', 'happy', 'proud'],
    7: ['happy', 'curious', 'surprised'],
    8: ['happy', 'curious', 'surprised', 'proud'],
    9: ['happy', 'surprised', 'curious'],
    10: ['happy', 'surprised']
}

// POST /api/emotion-decode
router.post('/', async (req: Request, res: Response) => {
    try {
        const { userMessage, assistantReply, emotionTemperature = 5 } = req.body

        if (!userMessage || !assistantReply) {
            return res.status(400).json({
                error: 'userMessage and assistantReply are required',
                expression: 'neutral',
                intensity: 0.5
            })
        }

        const temp = Math.max(1, Math.min(10, Number(emotionTemperature)))
        const allowedExpressions = TEMP_MAPPING[temp] || TEMP_MAPPING[5]

        // Chamar GPT para decidir emoção
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Você é um analisador de emoções para um avatar virtual.
Dado uma mensagem do usuário e resposta do assistente, determine a expressão facial.

EXPRESSÕES PERMITIDAS (temperatura ${temp}):
${allowedExpressions.join(', ')}

RESPONDA APENAS com JSON:
{"expression": "<expressão>", "intensity": <0.0-1.0>}

Regras:
- happiness/thanks → happy
- question/interest → curious
- shock → surprised
- problem → sad ou frustrated
- explanation → focused
- default → neutral`
                },
                {
                    role: 'user',
                    content: `Usuário: "${userMessage.slice(0, 200)}"
Assistente: "${assistantReply.slice(0, 300)}"

Qual expressão?`
                }
            ],
            temperature: 0.2,
            max_tokens: 50
        })

        const text = completion.choices[0]?.message?.content || ''

        // Parsear resposta
        try {
            const match = text.match(/\{[\s\S]*\}/)
            if (match) {
                const data = JSON.parse(match[0])

                // Validar expressão
                let expression = data.expression || 'neutral'
                if (!allowedExpressions.includes(expression)) {
                    expression = allowedExpressions[0]
                }

                console.log(`🧠 Emotion decoded: ${expression}`)

                return res.json({
                    expression,
                    intensity: Math.min(1, Math.max(0, data.intensity || 0.5))
                })
            }
        } catch (e) {
            console.warn('Parse error, using fallback')
        }

        // Fallback
        res.json({
            expression: allowedExpressions[Math.floor(Math.random() * allowedExpressions.length)],
            intensity: 0.5
        })

    } catch (error: any) {
        console.error('Error in /api/emotion-decode:', error.message)
        res.status(500).json({
            error: 'Internal error',
            expression: 'neutral',
            intensity: 0.5
        })
    }
})

export function setupEmotionRoutes(app: express.Application) {
    app.use('/api/emotion-decode', router)
}

export default router
