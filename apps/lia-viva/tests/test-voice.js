// ======================================================================
// 🧪 TESTE DE VOZ - Simula fluxo completo de voz
// ======================================================================

import fetch from "node-fetch";
import fs from "fs";
import dotenv from "dotenv";
import { textToAudio } from "../assistants/gpt4-mini.js";
import { buscarNaWeb } from "../tools/search.js";

dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ======================================================================
// 🎤 TESTE 1: TTS (Texto → Áudio)
// ======================================================================
async function testTTS() {
    console.log("\n🧪 TESTE 1: TTS (Texto → Áudio)");
    console.log("=".repeat(60));

    try {
        const texto = "A cotação do euro hoje está em R$ 6,15";
        console.log(`📝 Texto: "${texto}"`);

        console.log("🔊 Gerando áudio...");
        const audioBuffer = await textToAudio(texto);

        if (!audioBuffer) {
            console.error("❌ TTS falhou - retornou null");
            return false;
        }

        console.log(`✅ TTS gerou ${audioBuffer.length} bytes`);

        // Salvar para verificação
        fs.writeFileSync("test-audio.mp3", audioBuffer);
        console.log("💾 Áudio salvo em test-audio.mp3");

        return true;
    } catch (err) {
        console.error("❌ Erro no TTS:", err.message);
        return false;
    }
}

// ======================================================================
// 🤖 TESTE 2: Fluxo Completo de Voz (STT → GPT → Busca → TTS)
// ======================================================================
async function testVoiceFlow() {
    console.log("\n🧪 TESTE 2: Fluxo Completo de Voz");
    console.log("=".repeat(60));

    try {
        // Simula transcrição do Whisper
        const textoTranscrito = "Qual o valor do euro hoje?";
        console.log(`🎤 Transcrição (simulada): "${textoTranscrito}"`);

        // Chama GPT com function calling
        console.log("🤖 Chamando GPT...");

        const webSearchTool = {
            type: "function",
            function: {
                name: "buscarNaWeb",
                description: `OBRIGATÓRIO usar esta função quando o usuário perguntar sobre:
- Cotações: "cotação", "quanto está", "valor do", "preço do"
- Clima: "tempo", "clima", "temperatura"
NUNCA invente esses dados. SEMPRE busque.`,
                parameters: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Consulta de pesquisa"
                        },
                    },
                    required: ["query"],
                },
            },
        };

        let response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: "Você é a LIA. SEMPRE use buscarNaWeb para cotações. Seja direta."
                    },
                    {
                        role: "user",
                        content: textoTranscrito
                    }
                ],
                tools: [webSearchTool],
                tool_choice: "auto"
            }),
        });

        let data = await response.json();
        let message = data.choices?.[0]?.message;

        console.log("📥 Resposta do GPT recebida");

        let respostaFinal = "";

        if (message.tool_calls) {
            console.log("✅ GPT decidiu usar buscarNaWeb");
            const args = JSON.parse(message.tool_calls[0].function.arguments);
            console.log(`🔍 Buscando: "${args.query}"`);

            const resultadoBusca = await buscarNaWeb(args.query);
            console.log(`📊 Resultado: ${resultadoBusca.substring(0, 100)}...`);

            // Segunda chamada com resultado
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: "Você é a LIA. Seja direta e amigável."
                        },
                        {
                            role: "user",
                            content: textoTranscrito
                        },
                        message,
                        {
                            tool_call_id: message.tool_calls[0].id,
                            role: "tool",
                            name: "buscarNaWeb",
                            content: resultadoBusca,
                        }
                    ],
                }),
            });

            data = await response.json();
            respostaFinal = data.choices?.[0]?.message.content;
        } else {
            respostaFinal = message.content;
        }

        console.log(`💬 Resposta final: "${respostaFinal}"`);

        // Gera TTS
        console.log("🔊 Gerando TTS...");
        const audioBuffer = await textToAudio(respostaFinal);

        if (!audioBuffer) {
            console.error("❌ TTS falhou");
            return false;
        }

        console.log(`✅ TTS gerado: ${audioBuffer.length} bytes`);
        fs.writeFileSync("test-voice-response.mp3", audioBuffer);
        console.log("💾 Resposta de voz salva em test-voice-response.mp3");

        return true;

    } catch (err) {
        console.error("❌ Erro no fluxo de voz:", err.message);
        console.error("Stack:", err.stack);
        return false;
    }
}

// ======================================================================
// 🚀 EXECUTAR TODOS OS TESTES
// ======================================================================
async function runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🧪 TESTES DE VOZ DA LIA");
    console.log("=".repeat(60));

    const results = {
        tts: await testTTS(),
        voiceFlow: await testVoiceFlow()
    };

    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DOS TESTES");
    console.log("=".repeat(60));
    console.log(`TTS (Texto → Áudio): ${results.tts ? "✅ PASSOU" : "❌ FALHOU"}`);
    console.log(`Fluxo Completo de Voz: ${results.voiceFlow ? "✅ PASSOU" : "❌ FALHOU"}`);
    console.log("=".repeat(60) + "\n");

    const allPassed = Object.values(results).every(r => r === true);

    if (allPassed) {
        console.log("🎉 TODOS OS TESTES DE VOZ PASSARAM!");
        console.log("\n📝 Arquivos gerados:");
        console.log("   - test-audio.mp3 (teste simples de TTS)");
        console.log("   - test-voice-response.mp3 (resposta completa com busca)");
    } else {
        console.log("⚠️ ALGUNS TESTES FALHARAM - Verifique os logs acima");
    }

    process.exit(allPassed ? 0 : 1);
}

// Executar
runAllTests();
