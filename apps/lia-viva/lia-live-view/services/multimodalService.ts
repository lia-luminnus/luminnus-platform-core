
import { GoogleGenAI } from "@google/genai";
import { getApiKey } from "./configService";

/**
 * LIA Multimodal Service
 * Handles heavy generation tasks: Video (Veo), High-Res Images (Imagen), and Grounding.
 * Refactored to fetch API key dynamically for backend integration.
 */
export class MultimodalService {
  
  private async getClient(): Promise<GoogleGenAI> {
    const apiKey = await getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Generates a video using Veo-3.1
   */
  async generateVideo(prompt: string): Promise<string | null> {
    try {
      const ai = await this.getClient();
      console.log(`[LIA Multimodal] Generating video for: ${prompt}`);
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      // Poll for completion
      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({operation: operation});
      }

      if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        // We append the key to the URI because Veo preview links often require it.
        // In a real backend proxy, this would be handled differently.
        const apiKey = await getApiKey();
        return `${operation.response.generatedVideos[0].video.uri}&key=${apiKey}`;
      }
      return null;
    } catch (error) {
      console.error("[LIA Multimodal] Video Generation Error:", error);
      throw error;
    }
  }

  /**
   * Generates a high-quality image using Imagen 3
   */
  async generateImage(prompt: string): Promise<string | null> {
    try {
      const ai = await this.getClient();
      console.log(`[LIA Multimodal] Generating image for: ${prompt}`);
      const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-001', // Or latest available
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '16:9',
        },
      });

      const b64 = response.generatedImages?.[0]?.image?.imageBytes;
      if (b64) {
        return `data:image/png;base64,${b64}`;
      }
      return null;
    } catch (error) {
      console.error("[LIA Multimodal] Image Generation Error:", error);
      throw error;
    }
  }

  /**
   * Performs a Google Search Grounding request
   */
  async searchWeb(query: string) {
    try {
       const ai = await this.getClient();
       const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: query,
        config: {
            tools: [{googleSearch: {}}]
        }
       });
       
       const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
       const results = chunks
        .filter((c: any) => c.web)
        .map((c: any) => ({
            title: c.web.title,
            uri: c.web.uri,
            snippet: "Source from Google Search"
        }));

       return results;
    } catch (error) {
        console.error("[LIA Multimodal] Search Error:", error);
        return [];
    }
  }
}
