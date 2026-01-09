import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { LIA_FULL_PERSONALITY } from "../personality/lia-personality.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Executa uma conversa usando Gemini 2.0 Flash (Multimodal)
 * Mantém paridade com runGpt4Mini para fácil substituição.
 */
export async function runGemini(userText, options = {}) {
    // Converter ferramentas (OpenAI format -> Gemini format)
    let tools = undefined;
    if (options.functions && options.functions.length > 0) {
        tools = [{
            functionDeclarations: options.functions.map(f => ({
                name: f.name,
                description: f.description,
                parameters: {
                    type: "OBJECT",
                    properties: Object.entries(f.parameters.properties || {}).reduce((acc, [k, v]) => {
                        acc[k] = {
                            type: v.type.toUpperCase(),
                            description: v.description
                        };
                        return acc;
                    }, {}),
                    required: f.parameters.required || []
                }
            }))
        }];
    }

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        systemInstruction: LIA_FULL_PERSONALITY,
        tools
    });

    const messages = options.messages || [];

    // Converter histórico para formato Gemini
    const contents = messages.filter(m => m.role !== 'system').map(m => {
        if (m.role === 'function' || m.role === 'tool') {
            return { role: 'user', parts: [{ text: `Resultado da ferramenta ${m.name}: ${m.content}` }] };
        }
        return {
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content || "" }]
        };
    });

    // Se não houver histórico nas mensagens, adicionar a atual para garantir que o contents reflita tudo
    let finalUserText = userText;
    if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
        contents.push({
            role: 'user',
            parts: [{ text: userText }]
        });
    } else {
        // Se a última mensagem já é do usuário, vamos usá-la como o prompt atual
        finalUserText = contents[contents.length - 1].parts[0].text;
    }

    try {
        const chat = model.startChat({
            history: contents.slice(0, -1),
            generationConfig: {
                maxOutputTokens: options.maxTokens || 1024,
                temperature: options.temperature || 0.7,
            },
        });

        const result = await chat.sendMessage(finalUserText);
        const response = await result.response;

        // Check for function calls
        const calls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
        let function_call = null;
        if (calls && calls.length > 0) {
            function_call = {
                name: calls[0].functionCall.name,
                arguments: JSON.stringify(calls[0].functionCall.args)
            };
        }

        const text = response.text() || "";

        return {
            text,
            function_call
        };
    } catch (error) {
        console.error("❌ [runGemini] Erro:", error);
        // Fallback se erro for por causa de tools 
        if (tools && String(error).includes('tool')) {
            console.log("🔄 [runGemini] Tentando sem ferramentas devido a erro...");
            return runGemini(userText, { ...options, functions: [] });
        }
        return {
            text: "Desculpe, tive um probleminha ao processar com Gemini. Posso tentar novamente?",
            function_call: null
        };
    }
}
