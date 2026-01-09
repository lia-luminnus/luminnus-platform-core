import { Express } from 'express';
import fetch from 'node-fetch';

export function setupImageRoutes(app: Express) {

    /**
     * POST /api/image/generate
     * Gera imagem usando DALL-E 3 (principal) ou fallback para ilustração simples
     */
    app.post('/api/image/generate', async (req, res) => {
        try {
            const { prompt, style = 'realistic' } = req.body;

            if (!prompt) {
                return res.status(400).json({ error: 'Prompt é obrigatório' });
            }

            console.log(`🎨 [API] Gerando imagem (${style}): ${prompt.substring(0, 50)}...`);

            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

            if (!OPENAI_API_KEY) {
                return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });
            }

            // Usar DALL-E 3 para todas as imagens (mais estável)
            const dalleResponse = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'dall-e-3',
                    prompt: style === 'realistic'
                        ? `Fotografia realista de alta qualidade: ${prompt}`
                        : `Ilustração artística digital: ${prompt}`,
                    n: 1,
                    size: '1024x1024',
                    quality: 'standard'
                })
            });

            const dalleData = await dalleResponse.json() as any;

            if (dalleData.data && dalleData.data[0]?.url) {
                const imageUrl = dalleData.data[0].url;
                console.log(`✅ [API] Imagem DALL-E gerada com sucesso`);

                res.json({
                    success: true,
                    type: 'image',
                    url: imageUrl,
                    prompt,
                    style,
                    message: style === 'realistic'
                        ? 'Imagem realista gerada com DALL-E 3'
                        : 'Ilustração artística gerada com DALL-E 3'
                });
            } else {
                console.error('❌ [API] Erro DALL-E:', dalleData.error);
                return res.status(500).json({
                    error: dalleData.error?.message || 'Erro ao gerar imagem'
                });
            }

        } catch (error: any) {
            console.error('❌ [API] Erro generateImage:', error);
            res.status(500).json({ error: error.message || 'Erro ao gerar imagem' });
        }
    });
}

