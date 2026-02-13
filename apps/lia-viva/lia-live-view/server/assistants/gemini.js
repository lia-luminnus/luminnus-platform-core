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
    // Converter ferramentas (OpenAI format -> Gemini format) de forma recursiva (v4.0)
    const convertSchema = (schema) => {
        if (!schema) return undefined;
        const type = (schema.type || 'object').toUpperCase();
        const result = { type };
        if (schema.description) result.description = schema.description;
        if (schema.enum) result.format = 'enum', result.enum = schema.enum;

        if (type === 'OBJECT') {
            result.properties = Object.entries(schema.properties || {}).reduce((acc, [k, v]) => {
                acc[k] = convertSchema(v);
                return acc;
            }, {});
            if (schema.required) result.required = schema.required;
        } else if (type === 'ARRAY') {
            result.items = convertSchema(schema.items);
        }
        return result;
    };

    let tools = undefined;
    if (options.functions && options.functions.length > 0) {
        tools = [{
            functionDeclarations: options.functions.map(f => ({
                name: f.name,
                description: f.description,
                parameters: convertSchema(f.parameters)
            }))
        }];
    }

    // v12.0: Prioritize system instruction from options, otherwise use default
    const currentSystemInstruction = options.systemInstruction || LIA_FULL_PERSONALITY;

    // v17.0: Configurações de Segurança permissivas para evitar bloqueios de prints técnicos/código
    const safetySettings = [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
    ];

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash", // Atualizado para v2.5 (Padrão LIA)
        systemInstruction: currentSystemInstruction,
        tools,
        safetySettings
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

    // v12.1: Se houver instruções extras nas mensagens (role: system), anexar ao prompt final para garantir atenção
    const extraInstructions = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

    // v7.1: Suporte a arquivos (Imagens e Documentos) nativamente no Gemini 2.0
    // v12.2: Anexar instruções extras se houver (provenientes de role: system no histórico)
    const promptText = extraInstructions ? `${extraInstructions}\n\nREQUISIÇÃO ATUAL: ${userText}` : userText;
    const parts = [{ text: promptText }];

    if (options.images && options.images.length > 0) {
        options.images.forEach(img => {
            parts.push({
                inlineData: {
                    mimeType: img.mimeType || 'image/jpeg',
                    data: img.base64
                }
            });
        });
    }

    if (options.documents && options.documents.length > 0) {
        options.documents.forEach(doc => {
            parts.push({
                inlineData: {
                    mimeType: doc.mimeType || 'application/pdf',
                    data: doc.base64
                }
            });
        });
    }

    // Se não houver histórico nas mensagens, adicionar a atual para garantir que o contents reflita tudo
    let finalUserText = userText;
    if (contents.length === 0 || contents[contents.length - 1].role === 'model') {
        contents.push({
            role: 'user',
            parts: parts // v7.1: Usa as partes enriquecidas com anexos
        });
    } else {
        // Se a última mensagem já é do usuário, vamos anexar as partes a ela
        const lastMsg = contents[contents.length - 1];
        lastMsg.parts = [...lastMsg.parts, ...parts.slice(1)]; // Adiciona apenas os anexos se o texto já estiver lá
        finalUserText = lastMsg.parts[0].text;
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
        // v4.0: Suporte a múltiplas chamadas de ferramentas
        let function_calls = [];
        if (calls && calls.length > 0) {
            function_calls = calls.map(call => ({
                name: call.functionCall.name,
                arguments: JSON.stringify(call.functionCall.args)
            }));
        }

        const text = response.text() || "";

        return {
            text,
            function_calls,
            function_call: function_calls.length > 0 ? function_calls[0] : null // Retrocompatibilidade
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
