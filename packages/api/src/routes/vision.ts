import express from 'express';
import multer from 'multer';
import { supabase } from '../config/supabase.js';
import { MultimodalOrchestrator } from '../services/multimodalOrchestrator.js';

const router: express.Router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/vision/analyze
router.post('/analyze', upload.any(), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        const { prompt, conversationId, userId, tenantId, persistedFiles } = req.body;

        console.log(`[Vision API] Analyzing ${files?.length || 0} files for conv=${conversationId}`);

        // 1. Validar input
        if ((!files || files.length === 0) && (!persistedFiles)) {
            return res.status(400).json({ error: 'No files provided' });
        }

        // 2. Preparar imagens para o orquestrador
        let imagesToProcess: { mimeType: string; base64: string }[] = [];

        // Prioridade 1: Arquivos enviados no POST (Multer)
        if (files && files.length > 0) {
            imagesToProcess = files.map(f => ({
                mimeType: f.mimetype,
                base64: f.buffer.toString('base64')
            }));
        }
        // Prioridade 2: persistedFiles (URLs do Supabase) - Futuro: Baixar para base64 se necessário
        else if (persistedFiles && Array.isArray(persistedFiles)) {
            // Se já temos o print na memória da UI ou persistido, o orquestrador pode precisar dele
            // Por enquanto, assumimos que o orquestrador nativo do Gemini 2.0 cuida via bytes se fornecido
        }

        // 3. Executar orquestração real (v17.6)
        const result = await MultimodalOrchestrator.processar({
            message: prompt || "Analise esta imagem.",
            images: imagesToProcess,
            conversationId,
            userId,
            tenantId
        });

        // 4. Salvar resposta da LIA no banco (SSOT)
        if (conversationId && userId && result.success) {
            await supabase.from('messages').insert({
                conversation_id: conversationId,
                user_id: userId,
                content: result.content,
                type: 'lia',
                metadata: {
                    provider: result.provider,
                    trace: 'vision-endpoint-v17.6'
                }
            });
        }

        res.json({
            success: true,
            text: result.content,
            provider: result.provider,
            analysis: {
                summary: "Análise concluída com sucesso",
                details: "Processado via Gemini 2.0 Flash"
            }
        });

    } catch (error: any) {
        console.error('[Vision API] Error Critical:', error);
        res.status(500).json({
            error: 'Vision analysis failed',
            details: error.message
        });
    }
});

export { router as visionRouter };
