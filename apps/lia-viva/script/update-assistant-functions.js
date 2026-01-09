// ======================================================================
// 🔄 SCRIPT: ATUALIZAR ASSISTANT COM TODAS AS FUNCTIONS
// ======================================================================

import { OpenAI } from "openai";
import dotenv from "dotenv";
import fs from "fs";
import { ASSISTANT_ID } from "./assistants-config.js";

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function updateAssistantFunctions() {
    try {
        console.log("📦 Carregando mega-functions.json...");

        // Ler arquivo JSON
        const functionsData = JSON.parse(
            fs.readFileSync("./config/mega-functions.json", "utf-8")
        );

        const functions = functionsData.functions;
        console.log(`✅ ${functions.length} functions carregadas do arquivo`);

        // Converter para formato do OpenAI
        const tools = functions.map(fn => ({
            type: "function",
            function: {
                name: fn.name,
                description: fn.description,
                parameters: fn.parameters,
                strict: fn.strict || false
            }
        }));

        console.log(`🔄 Atualizando assistant ${ASSISTANT_ID}...`);

        // Atualizar assistant
        const assistant = await openai.beta.assistants.update(ASSISTANT_ID, {
            tools: tools
        });

        console.log(`✅ Assistant atualizado com sucesso!`);
        console.log(`📊 Total de tools: ${assistant.tools.length}`);

        // Mostrar lista de functions
        console.log("\n📋 Functions disponíveis:");
        assistant.tools.forEach((tool, index) => {
            if (tool.type === 'function') {
                console.log(`   ${index + 1}. ${tool.function.name}`);
            }
        });

        return assistant;

    } catch (error) {
        console.error("❌ Erro ao atualizar assistant:", error.message);
        throw error;
    }
}

// Executar
updateAssistantFunctions()
    .then(() => {
        console.log("\n🎉 Processo concluído!");
        process.exit(0);
    })
    .catch((err) => {
        console.error("\n💥 Falha:", err);
        process.exit(1);
    });
