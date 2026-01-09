// ===========================================================
// TRANSCRIBE ROUTE - Whisper STT
// ===========================================================

import { Express } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

export function setupTranscribeRoutes(app: Express) {
    /**
     * POST /api/transcribe
     * Transcreve áudio usando Whisper API
     */
    app.post('/api/transcribe', upload.single('file'), async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No audio file provided' });
            }

            console.log('🎤 Transcrevendo áudio:', req.file.originalname, req.file.size, 'bytes');

            // Criar FormData para a API do Whisper
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname || 'audio.webm',
                contentType: req.file.mimetype || 'audio/webm',
            });
            formData.append('model', 'whisper-1');
            formData.append('language', 'pt');

            // Enviar para OpenAI Whisper API
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders(),
                },
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Whisper API error:', response.status, errorText);
                return res.status(response.status).json({ error: errorText });
            }

            const data = await response.json() as { text: string };
            console.log('✅ Transcrição:', data.text);

            res.json({ text: data.text });
        } catch (error: any) {
            console.error('❌ Erro na transcrição:', error);
            res.status(500).json({ error: error.message });
        }
    });
}
