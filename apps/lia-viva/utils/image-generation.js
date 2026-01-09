// ======================================================================
// 🖼️ IMAGE GENERATION - Utilitário Compartilhado (DALL-E)
// ======================================================================

import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateImage(prompt, size = "1024x1024", quality = "standard", model = "dall-e-3") {
  try {
    console.log("🖼️ [DALL-E] Gerando imagem...");
    console.log(`   Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`   Tamanho: ${size}, Qualidade: ${quality}, Modelo: ${model}`);

    const response = await client.images.generate({
      model: model,
      prompt: prompt,
      size: size,
      quality: quality,
      n: 1,
    });

    const imageUrl = response.data[0].url;
    console.log(`✅ [DALL-E] Imagem gerada: ${imageUrl}`);
    
    return imageUrl;

  } catch (err) {
    console.error("❌ [DALL-E] Erro ao gerar imagem:", err);
    return null;
  }
}