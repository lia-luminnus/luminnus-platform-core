import { WhatsAppRepository } from '../repositories/WhatsAppRepository.js';
import { WhatsAppService } from './whatsappService.js';
import { OpenAIService } from './openAIService.js';
import { GeminiService } from './geminiService.js';
import { emitEvent } from './eventBusService.js';
import { logAction, logError } from '../utils/logger.js';

export class AudioService {
    /**
     * Processa um áudio recebido do WhatsApp
     */
    static async processIncomingAudio(tenantId: string, assetId: string, mediaId: string) {
        try {
            logAction('AudioService', 'processIncomingAudio', 'Iniciando processamento de áudio', { assetId, mediaId });

            // 1. Atualizar status para baixando
            await WhatsAppRepository.updateAudioAsset(assetId, { status: 'downloading' });

            // 2. Baixar mídia
            const media = await WhatsAppService.downloadMedia(tenantId, mediaId);
            if (!media) {
                throw new Error('Falha ao baixar mídia do WhatsApp');
            }

            // 3. Transcrever via Whisper (OpenAI)
            await WhatsAppRepository.updateAudioAsset(assetId, { status: 'transcribing' });

            const transcript = await OpenAIService.transcribe(media.buffer, `audio_${assetId}.ogg`);
            logAction('AudioService', 'transcribe', 'Transcrição concluída', { assetId, length: transcript.length });

            // 4. Analisar intenção e tags via Gemini
            await WhatsAppRepository.updateAudioAsset(assetId, { status: 'analyzing', transcript_text: transcript });

            const analysisPrompt = `Analise a seguinte transcrição de áudio do WhatsApp e extraia:
1. Intenção principal (ex: pricing, support, scheduling, general)
2. Resumo executivo (1 frase)
3. Tags relevantes (ex: #Orçamento, #Urgente)

Transcrição: "${transcript}"

Retorne APENAS um JSON válido.`;

            const analysis = await GeminiService.analyzeFile({
                mimetype: 'text/plain',
                data: Buffer.from(transcript).toString('base64'),
                name: 'transcript.txt'
            }, analysisPrompt, 'gemini-2.5-flash');

            let parsedAnalysis = { intent: 'general', summary: '', tags: [] };
            try {
                const cleaned = analysis.text.replace(/```json\n?|\n?```/g, '').trim();
                parsedAnalysis = JSON.parse(cleaned);
            } catch (err) {
                console.warn('⚠️ [AudioService] Falha ao parsear análise da IA:', err);
            }

            // 5. Finalizar asset
            const updatedAsset = await WhatsAppRepository.updateAudioAsset(assetId, {
                status: 'done',
                intent_detected: parsedAnalysis.intent || 'general',
                summary_text: parsedAnalysis.summary || transcript.substring(0, 200),
                tags_json: parsedAnalysis.tags || []
            });

            // 6. Emitir evento de conclusão
            await emitEvent({
                type: 'audio_transcribed',
                tenantId,
                payload: { assetId, transcript, analysis: parsedAnalysis }
            });

            logAction('AudioService', 'processIncomingAudio', 'Processamento concluído', { assetId });
            return updatedAsset;

        } catch (error: any) {
            logError('AudioService', error, `Erro ao processar áudio ${assetId}`);
            await WhatsAppRepository.updateAudioAsset(assetId, { status: 'error', notes: error.message });
            throw error;
        }
    }
}
