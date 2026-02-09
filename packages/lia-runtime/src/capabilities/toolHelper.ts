import { AgentTool } from './agentTool.js';
import { z } from 'zod';

/**
 * Utility to inspect and format tool definitions for LLMs
 */
export const ToolHelper = {
    /**
     * returns a simplified JSON representation of the tool for the LLM system prompt
     */
    toSystemPrompt(tool: AgentTool): string {
        // Basic schema description wrapper
        // In a real implementation, this would use zod-to-json-schema
        return JSON.stringify({
            name: tool.name,
            description: tool.description,
            parameters: "See Zod Schema definition in codebase (runtime validation enabled)"
        }, null, 2);
    },

    /**
     * Validates input against the tool schema
     */
    validateInput(tool: AgentTool, input: any): { success: boolean, data?: any, error?: any } {
        const result = tool.schema.safeParse(input);
        if (result.success) {
            return { success: true, data: result.data };
        } else {
            return { success: false, error: result.error };
        }
    }
};
