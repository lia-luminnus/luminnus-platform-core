// Test script to verify tools loading
import { getAllAvailableTools } from "./utils/tools-manager.js";

async function test() {
    try {
        console.log("Testing getAllAvailableTools...");
        const tools = await getAllAvailableTools();

        console.log(`\n✅ Total: ${tools.length} tools`);
        console.log("\n📋 Functions:");
        tools.forEach((tool, idx) => {
            console.log(`  ${idx + 1}. ${tool.function?.name || 'UNKNOWN'}`);
        });

    } catch (error) {
        console.error("❌ Error:", error);
    }
}

test();
