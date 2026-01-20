import fetch from 'node-fetch';

/**
 * ImageService
 * Responsável pela geração de imagens usando DALL-E 3
 */
export async function generateImage(prompt: string, style: 'realistic' | 'artistic' = 'realistic') {
    try {
        console.log(`🎨 [ImageService] Gerando imagem (${style}): ${prompt.substring(0, 50)}...`);

        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        if (!OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY não configurada');
        }

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
            console.log(`✅ [ImageService] Imagem DALL-E gerada com sucesso`);

            return {
                success: true,
                type: 'image',
                url: imageUrl,
                prompt,
                style,
                message: style === 'realistic'
                    ? 'Imagem realista gerada com DALL-E 3'
                    : 'Ilustração artística gerada com DALL-E 3'
            };
        } else {
            console.error('❌ [ImageService] Erro DALL-E:', dalleData.error);
            throw new Error(dalleData.error?.message || 'Erro ao gerar imagem');
        }
    } catch (error: any) {
        console.error('❌ [ImageService] Erro generateImage:', error);
        return { success: false, message: error.message || 'Erro ao gerar imagem' };
    }
}
