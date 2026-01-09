import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Converte áudio (Buffer) para texto usando Whisper-1
 * @param {Buffer} audioBuffer - O buffer do arquivo de áudio
 * @param {string} mimeType - O tipo MIME (ex: 'audio/webm')
 * @returns {Promise<string>} - O texto transcrito
 */
export async function audioToText(audioBuffer, mimeType = "audio/webm") {
    try {
        // O OpenAI SDK precisa de um objeto File-like.
        // Vamos criar um arquivo temporário para garantir compatibilidade
        const tempFilePath = path.join(process.cwd(), `temp_audio_${Date.now()}.webm`);
        fs.writeFileSync(tempFilePath, audioBuffer);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: "whisper-1",
            language: "pt", // Forçar português para melhor precisão
        });

        // Limpar arquivo temporário
        fs.unlinkSync(tempFilePath);

        return transcription.text;
    } catch (error) {
        console.error("❌ Erro no audioToText:", error);
        throw error;
    }
}

/**
 * Converte texto para áudio usando TTS-1
 * @param {string} text - O texto a ser falado
 * @param {string} voice - A voz a ser usada (alloy, echo, fable, onyx, nova, shimmer)
 * @param {object} options - Opções extras (como conversationId para logs, se necessário)
 * @returns {Promise<Buffer>} - O buffer do áudio gerado (MP3 por padrão, mas retornaremos Buffer)
 */
export async function textToAudio(text, voice = "shimmer", options = {}) {
    try {
        const mp3 = await openai.audio.speech.create({
            model: "tts-1",
            voice: voice,
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());
        return buffer;
    } catch (error) {
        console.error("❌ Erro no textToAudio:", error);
        throw error;
    }
}
