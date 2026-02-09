import { z } from 'zod';

/**
 * Standard definition for an AI Agent Tool
 * Follows the "Agent Tool Builder" pattern:
 * - Strict Zod schema for validation
 * - Clear description for the LLM
 * - Execution logic typed to the schema
 */
export interface AgentTool<TSchema extends z.ZodTypeAny = z.ZodTypeAny> {
    // LLM-facing properties
    id: string;          // Unique identifier (e.g., 'gmail.send_email')
    name: string;        // Human readable name (e.g., 'Send Email')
    description: string; // Detailed description for the LLM instructions at system level
    schema: TSchema;     // Zod schema for input validation

    // Execution Logic
    execute?: (params: z.infer<TSchema>, context: any) => Promise<any>;

    // Legacy/Platform Metadata (for permissions, UI, billing)
    provider: string;
    action: string;
    requiresAuth: boolean;
    requiresConnection: boolean;
    scopes?: string[];
    allowedPlans: ('free' | 'start' | 'plus' | 'pro' | 'admin' | 'premium' | 'enterprise' | 'ceo' | 'owner')[];

    // Optional: Legacy handler string if execution is decoupled
    toolHandler?: string;
}

/**
 * Helper to create a strongly typed tool definition
 */
export function createTool<T extends z.ZodTypeAny>(tool: AgentTool<T>): AgentTool<T> {
    return tool;
}

/**
 * Common Zod schemas for tools
 */
export const schemas = {
    noop: z.object({}),
    pagination: z.object({
        limit: z.number().min(1).max(50).optional().describe("Number of items to return"),
        cursor: z.string().optional().describe("Pagination cursor")
    })
};
