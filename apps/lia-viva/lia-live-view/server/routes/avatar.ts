import { Express } from 'express';
import OpenAI from 'openai';
import { textToAudio } from '../assistants/gpt4-mini.js';

// =====================================================
// AVATAR STUDIO API - ISOLADO DO RESTO DO PROJETO
// =====================================================
// Este endpoint é usado SOMENTE pelo Avatar Studio
// para testes de voz e animação
// =====================================================

// Mapeamento de emoções em português
const EMOTION_KEYWORDS: Record<string, string[]> = {
    happy: ['feliz', 'alegre', 'contente', 'maravilha', 'ótimo', 'incrível', 'parabéns', 'adorei', 'legal', 'bom', 'excelente'],
    sad: ['triste', 'pena', 'infelizmente', 'sinto muito', 'lamento', 'difícil', 'complicado'],
    surprised: ['uau', 'nossa', 'caramba', 'sério', 'verdade', 'impressionante', 'inacreditável', 'incrível'],
    angry: ['raiva', 'irritado', 'absurdo', 'injusto', 'errado', 'problema'],
    curious: ['interessante', 'curioso', 'pergunta', 'como', 'por que', 'será'],
    neutral: []
};

// Detectar emoção no texto
function detectEmotion(text: string): { emotion: string; intensity: number } {
    const lowerText = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword)) {
                const hasExclamation = text.includes('!');
                const intensity = hasExclamation ? 0.9 : 0.7;
                return { emotion, intensity };
            }
        }
    }

    return { emotion: 'neutral', intensity: 0.5 };
}

// Gerar fonemas simplificados para lip-sync
function generatePhonemes(text: string): Array<{ phoneme: string; start: number; end: number }> {
    const words = text.split(/\s+/);
    const phonemes: Array<{ phoneme: string; start: number; end: number }> = [];

    let currentTime = 0;
    const avgWordDuration = 0.3; // 300ms por palavra

    for (const word of words) {
        // Simplificação: mapear para visemas básicos
        const vowels = word.match(/[aeiouáéíóúâêôãõ]/gi) || [];
        const duration = avgWordDuration * Math.max(1, vowels.length / 2);

        // Primeira letra determina abertura inicial
        const firstChar = word[0]?.toLowerCase();
        let phoneme = 'neutral';

        if ('aáâã'.includes(firstChar)) phoneme = 'A';
        else if ('eéê'.includes(firstChar)) phoneme = 'E';
        else if ('iíî'.includes(firstChar)) phoneme = 'I';
        else if ('oóôõ'.includes(firstChar)) phoneme = 'O';
        else if ('uúû'.includes(firstChar)) phoneme = 'U';
        else if ('mbp'.includes(firstChar)) phoneme = 'M';
        else if ('fv'.includes(firstChar)) phoneme = 'F';
        else if ('szç'.includes(firstChar)) phoneme = 'S';

        phonemes.push({
            phoneme,
            start: currentTime,
            end: currentTime + duration
        });

        currentTime += duration + 0.05; // pequena pausa entre palavras
    }

    return phonemes;
}

export function setupAvatarRoutes(app: Express, openai: OpenAI) {
    // =====================================================
    // POST /api/avatar/speak
    // Usado pelo Avatar Studio para testar voz + animação
    // RETORNA: Audio bytes diretamente (Content-Type: audio/mpeg)
    // =====================================================
    app.post('/api/avatar/speak', async (req, res) => {
        try {
            const { text, avatarId } = req.body;

            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }

            console.log('\n========== 🎭 AVATAR STUDIO SPEAK ==========');
            console.log(`📝 Texto: ${text.substring(0, 100)}...`);
            console.log(`🆔 Avatar: ${avatarId || 'default'}`);

            // 1. Detectar emoção no texto
            const { emotion, intensity } = detectEmotion(text);
            console.log(`😊 Emoção: ${emotion} (${(intensity * 100).toFixed(0)}%)`);

            // 2. Gerar áudio TTS
            try {
                const audioBuffer = await textToAudio(text);
                console.log(`🔊 Áudio gerado: ${audioBuffer.length} bytes`);
                console.log('============================================\n');

                // RETORNA AUDIO BYTES DIRETAMENTE
                res.setHeader('Content-Type', 'audio/mpeg');
                res.setHeader('Content-Length', audioBuffer.length.toString());
                res.setHeader('X-Emotion', emotion);
                res.setHeader('X-Emotion-Intensity', intensity.toString());
                return res.send(audioBuffer);

            } catch (ttsError: any) {
                console.warn('⚠️ TTS falhou:', ttsError.message);
                console.log('============================================\n');
                return res.status(503).json({
                    ok: false,
                    error: 'TTS service unavailable',
                    message: ttsError.message
                });
            }

        } catch (error) {
            console.error('❌ Erro /api/avatar/speak:', error);
            res.status(500).json({
                ok: false,
                error: String(error)
            });
        }
    });

    // =====================================================
    // POST /api/avatar/chat
    // Avatar Studio com resposta da LIA
    // =====================================================
    app.post('/api/avatar/chat', async (req, res) => {
        try {
            const { message, avatarId } = req.body;

            if (!message) {
                return res.status(400).json({ error: 'Message is required' });
            }

            console.log('\n========== 🎭 AVATAR STUDIO CHAT ==========');
            console.log(`📝 Pergunta: ${message.substring(0, 100)}...`);

            // 1. Chamar GPT para resposta
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'Você é LIA, uma assistente virtual amigável e expressiva. Responda de forma natural e emocional. Mantenha respostas curtas (1-2 frases) para testes de avatar.'
                    },
                    { role: 'user', content: message }
                ],
                temperature: 0.7,
                max_tokens: 150
            });

            const replyText = completion.choices[0]?.message?.content || 'Olá!';

            // 2. Detectar emoção na resposta
            const { emotion, intensity } = detectEmotion(replyText);

            // 3. Gerar fonemas
            const phonemes = generatePhonemes(replyText);
            const duration = phonemes.length > 0
                ? phonemes[phonemes.length - 1].end
                : replyText.split(/\s+/).length * 0.3;

            // 4. Gerar áudio
            let audioBase64 = null;
            try {
                const audioBuffer = await textToAudio(replyText);
                audioBase64 = audioBuffer.toString('base64');
            } catch (ttsError: any) {
                console.warn('⚠️ TTS falhou:', ttsError.message);
            }

            console.log(`💬 Resposta: ${replyText.substring(0, 50)}...`);
            console.log(`😊 Emoção: ${emotion}, 🗣️ Fonemas: ${phonemes.length}`);
            console.log('============================================\n');

            res.json({
                ok: true,
                reply: replyText,
                audio: audioBase64,
                emotion,
                emotionIntensity: intensity,
                phonemes,
                duration,
                avatarId: avatarId || 'default'
            });

        } catch (error) {
            console.error('❌ Erro /api/avatar/chat:', error);
            res.status(500).json({
                ok: false,
                error: String(error)
            });
        }
    });

}
