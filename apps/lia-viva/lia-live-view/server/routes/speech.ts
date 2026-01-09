// ===========================================================
// SPEECH ROUTE - Google Cloud Speech-to-Text
// ===========================================================

import { Express } from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export function setupSpeechRoutes(app: Express) {
    /**
     * POST /api/speech/transcribe
     * Transcreve áudio usando Google Cloud Speech-to-Text API
     */
    app.post('/api/speech/transcribe', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No audio file provided' });
            }

            if (!GOOGLE_API_KEY) {
                return res.status(500).json({ error: 'GOOGLE_API_KEY não configurada' });
            }

            console.log('🎤 [Google STT] Transcrevendo áudio:', req.file.originalname, req.file.size, 'bytes');

            // Converter áudio para base64
            const audioContent = req.file.buffer.toString('base64');

            // Configurar request para Google Speech-to-Text
            const requestBody = {
                config: {
                    encoding: 'LINEAR16',  // PCM 16-bit
                    sampleRateHertz: parseInt(req.body.sampleRate) || 48000,
                    languageCode: 'pt-BR',
                    model: 'latest_long',  // Melhor modelo para conversas
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: false,
                },
                audio: {
                    content: audioContent
                }
            };

            // Chamar Google Cloud Speech-to-Text API
            const response = await fetch(
                `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ [Google STT] Erro na API:', response.status, errorText);
                return res.status(response.status).json({ error: errorText });
            }

            const data: any = await response.json();

            // Extrair transcrição
            let transcription = '';
            if (data.results && data.results.length > 0) {
                transcription = data.results
                    .map((result: any) => result.alternatives?.[0]?.transcript || '')
                    .join(' ')
                    .trim();
            }

            console.log('✅ [Google STT] Transcrição:', transcription || '(silêncio)');

            res.json({ text: transcription });
        } catch (error: any) {
            console.error('❌ [Google STT] Erro:', error);
            res.status(500).json({ error: error.message });
        }
    });

}
