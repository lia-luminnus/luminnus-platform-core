/**
 * LIA Capability Registry v2.0 (Agent Tool Enhanced)
 * SSOT for available execution capabilities using strict Zod schemas
 */
import { z } from 'zod';
import { AgentTool, createTool } from './agentTool.js';

// Re-export AgentTool as Capability for backward compatibility (temporarily)
export type Capability = AgentTool;

// Plans with full access
export const ADMIN_PLANS = ['admin', 'pro', 'premium', 'enterprise', 'ceo', 'owner'];

/**
 * Central Registry of Agent Tools
 */
export const TOOL_REGISTRY: AgentTool<any>[] = [
    // Gmail Tools
    createTool({
        id: 'gmail.delete_email',
        name: 'Delete Email',
        description: 'Deletes specific emails based on ID or search criteria.',
        schema: z.object({
            count: z.number().optional().describe('Number of emails to delete'),
            query: z.string().optional().describe('Search query to identify emails to delete')
        }),
        provider: 'gmail',
        action: 'delete_email',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.modify'],
        allowedPlans: ['plus', 'pro'],
        toolHandler: 'gmail_delete'
    }),
    createTool({
        id: 'gmail.send_email',
        name: 'Send Email',
        description: 'Sends an email to a recipient.',
        schema: z.object({
            to: z.string().email().describe('Recipient email address'),
            subject: z.string().describe('Email subject'),
            body: z.string().describe('Email body content')
        }),
        provider: 'gmail',
        action: 'send_email',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.send'],
        allowedPlans: ['start', 'plus', 'pro'],
        toolHandler: 'gmail_send'
    }),
    createTool({
        id: 'gmail.search_email',
        name: 'Search Emails',
        description: 'Searches for emails matching criteria.',
        schema: z.object({
            query: z.string().describe('Gmail search query (e.g., "from:boss is:unread")'),
            limit: z.number().max(20).default(5).describe('Max results to return')
        }),
        provider: 'gmail',
        action: 'search_email',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['gmail.readonly'],
        allowedPlans: ['start', 'plus', 'pro'],
        toolHandler: 'gmail_search'
    }),

    // Calendar Tools
    createTool({
        id: 'calendar.create_event',
        name: 'Create Event',
        description: 'Schedules a new event on the calendar.',
        schema: z.object({
            summary: z.string().describe('Event title'),
            startTime: z.string().datetime().describe('Start time in ISO format'),
            endTime: z.string().datetime().describe('End time in ISO format'),
            attendees: z.array(z.string().email()).optional().describe('List of attendee emails')
        }),
        provider: 'calendar',
        action: 'create_event',
        requiresAuth: true,
        requiresConnection: true,
        scopes: ['calendar'],
        allowedPlans: ['start', 'plus', 'pro'],
        toolHandler: 'calendar_create'
    }),

    // Dashboard Tools
    createTool({
        id: 'dashboard.add_widget',
        name: 'Add Widget',
        description: 'Adds a new widget to the user dashboard.',
        schema: z.object({
            type: z.enum(['chart', 'metric', 'list']).describe('Type of widget'),
            title: z.string().describe('Widget title'),
            dataSource: z.string().optional().describe('Source of data for the widget')
        }),
        provider: 'dashboard',
        action: 'add_widget',
        requiresAuth: false,
        requiresConnection: false,
        allowedPlans: ['free', 'start', 'plus', 'pro'],
        toolHandler: 'dashboard_widget'
    })
];

// Alias for legacy compatibility
export const CAPABILITY_REGISTRY = TOOL_REGISTRY;

export interface CanExecuteResult {
    canExecute: boolean;
    capability?: AgentTool;
    reason?: string;
}

export interface ConnectionStatus {
    gmail?: boolean;
    workspace?: boolean;
    calendar?: boolean;
}

/**
 * Checks if a tool can be executed based on plan and permissions
 */
export function canExecute(
    capabilityId: string,
    userPlan: string = 'free',
    connections: ConnectionStatus = {}
): CanExecuteResult {
    const capability = TOOL_REGISTRY.find(c => c.id === capabilityId);

    if (!capability) {
        return { canExecute: false, reason: `Tool "${capabilityId}" not found in registry` };
    }

    // Admin Bypass
    const isAdminPlan = ADMIN_PLANS.includes(userPlan.toLowerCase());

    // Plan check
    if (!isAdminPlan && !capability.allowedPlans?.includes(userPlan as any)) {
        return {
            canExecute: false,
            capability,
            reason: `This action requires plan ${capability.allowedPlans?.join(' or ')}. Current plan: ${userPlan}.`
        };
    }

    // Connection check
    if (capability.requiresConnection) {
        const isConnected = connections[capability.provider as keyof ConnectionStatus];
        if (!isConnected) {
            return {
                canExecute: false,
                capability,
                reason: `Integration with ${capability.provider} is not connected.`
            };
        }
    }

    return { canExecute: true, capability };
}

/**
 * @deprecated Use LLM tool calling with tool.schema instead.
 * Extract ActionRequest structured from user text (Legacy Regex)
 */
export interface ActionRequest {
    provider: string;
    action: string;
    targets: string[];
    params: Record<string, any>;
    capabilityId: string;
}

export function extractActionRequest(userText: string): ActionRequest | null {
    // ... Legacy regex logic preserved for backward compatibility ...
    let text = userText.toLowerCase();

    // Gmail Delete
    if ((text.includes('delete') || text.includes('apag') || text.includes('exclu')) &&
        (text.includes('email') || text.includes('e-mail'))) {
        return {
            provider: 'gmail',
            action: 'delete_email',
            targets: [],
            params: { count: 1 },
            capabilityId: 'gmail.delete_email'
        };
    }

    // Send Email
    if ((text.includes('envi') || text.includes('mand')) && (text.includes('email'))) {
        return {
            provider: 'gmail',
            action: 'send_email',
            targets: [],
            params: {},
            capabilityId: 'gmail.send_email'
        };
    }

    // Create Event
    if ((text.includes('cri') || text.includes('agend')) && (text.includes('evento') || text.includes('reunião'))) {
        return {
            provider: 'calendar',
            action: 'create_event',
            targets: [],
            params: {},
            capabilityId: 'calendar.create_event'
        };
    }

    return null;
}

export function generateActionFallback(capability: AgentTool, reason: string): string {
    return `⚠️ **Cannot execute "${capability.name}" right now.**\n\n• ${reason}\n\n💡 **Next step**: Connect your ${capability.provider} account in Settings.`;
}

