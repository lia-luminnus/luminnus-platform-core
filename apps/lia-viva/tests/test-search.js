// Test script - verificar se buscarNaWeb funciona
import { buscarNaWeb } from "./tools/search.js";

async function test() {
    try {
        console.log("🧪 Testando buscarNaWeb...\n");

        const result = await buscarNaWeb("cotação euro real");

        console.log("✅ SUCESSO!");
        console.log("Resultado:", result.substring(0, 300));

    } catch (error) {
        console.error("❌ ERRO:", error.message);
        console.error("Stack:", error.stack);
    }
}

test();
