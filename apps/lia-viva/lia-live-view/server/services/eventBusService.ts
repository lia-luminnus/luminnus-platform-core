/**
 * Event Bus Service
 * Centraliza emissão, persistência e broadcast de eventos do WhatsApp
 */

import { supabase } from '../config/supabase.js';

// ============================================
// TIPOS DE EVENTOS
// ============================================
export type WhatsAppEventType =
    | 'message_received'
    | 'message_sent'
    | 'lead_created'
    | 'lead_updated'
    | 'stage_changed'
    | 'intent_detected'
    | 'human_handoff'
    | 'meeting_booked'
    | 'audio_received'
    | 'audio_transcribed'
    | 'copilot_suggestion'
    | 'briefing_sent'
    | 'conversation_started'
    | 'conversation_resolved';

export interface WhatsAppEvent {
    type: WhatsAppEventType;
    tenantId: string;
    conversationId?: string;
    contactId?: string;
    payload: Record<string, any>;
    occurredAt?: Date;
}

export interface EventBusConfig {
    persistEvents?: boolean;
    broadcastEvents?: boolean;
}

// ============================================
// LISTENERS (para extensibilidade)
// ============================================
type EventListener = (event: WhatsAppEvent) => void | Promise<void>;
const listeners: Map<WhatsAppEventType | '*', EventListener[]> = new Map();

// ============================================
// SOCKET.IO REFERENCE (será injetado pelo server.ts)
// ============================================
let ioInstance: any = null;

export function setSocketIO(io: any) {
    ioInstance = io;
    console.log('✅ [EventBus] Socket.IO configurado');
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Emitir evento - persiste no banco e faz broadcast via WebSocket
 */
export async function emitEvent(
    event: WhatsAppEvent,
    config: EventBusConfig = { persistEvents: true, broadcastEvents: true }
): Promise<void> {
    const eventWithTimestamp = {
        ...event,
        occurredAt: event.occurredAt || new Date()
    };

    console.log(`📡 [EventBus] Emitindo: ${event.type}`, {
        tenantId: event.tenantId,
        conversationId: event.conversationId
    });

    // 1) Persistir no banco
    if (config.persistEvents) {
        await persistEvent(eventWithTimestamp);
    }

    // 2) Broadcast via WebSocket
    if (config.broadcastEvents) {
        await broadcastEvent(eventWithTimestamp);
    }

    // 3) Notificar listeners locais
    await notifyListeners(eventWithTimestamp);
}

/**
 * Persistir evento no Supabase (whatsapp_events)
 */
async function persistEvent(event: WhatsAppEvent): Promise<void> {
    try {
        const { error } = await supabase
            .from('whatsapp_events')
            .insert({
                tenant_id: event.tenantId,
                type: event.type,
                conversation_id: event.conversationId,
                contact_id: event.contactId,
                payload_json: event.payload,
                occurred_at: event.occurredAt?.toISOString() || new Date().toISOString()
            });

        if (error) {
            console.error('❌ [EventBus] Erro ao persistir evento:', error);
        }
    } catch (err) {
        console.error('❌ [EventBus] Exceção ao persistir evento:', err);
    }
}

/**
 * Broadcast via Socket.IO para clientes conectados
 */
async function broadcastEvent(event: WhatsAppEvent): Promise<void> {
    if (!ioInstance) {
        console.warn('⚠️ [EventBus] Socket.IO não configurado, broadcast ignorado');
        return;
    }

    try {
        // Emitir para room do tenant específico
        const room = `tenant:${event.tenantId}`;
        ioInstance.to(room).emit('whatsapp:event', {
            type: event.type,
            tenantId: event.tenantId,
            conversationId: event.conversationId,
            contactId: event.contactId,
            payload: event.payload,
            occurredAt: event.occurredAt?.toISOString()
        });

        // Também emitir evento específico por tipo
        ioInstance.to(room).emit(`whatsapp:${event.type}`, event.payload);

    } catch (err) {
        console.error('❌ [EventBus] Erro ao fazer broadcast:', err);
    }
}

/**
 * Notificar listeners locais registrados
 */
async function notifyListeners(event: WhatsAppEvent): Promise<void> {
    // Listeners específicos do tipo
    const typeListeners = listeners.get(event.type) || [];
    // Listeners wildcard (*)
    const wildcardListeners = listeners.get('*') || [];

    const allListeners = [...typeListeners, ...wildcardListeners];

    for (const listener of allListeners) {
        try {
            await listener(event);
        } catch (err) {
            console.error(`❌ [EventBus] Erro em listener para ${event.type}:`, err);
        }
    }
}

// ============================================
// SUBSCRIPTION API
// ============================================

/**
 * Registrar listener para um tipo de evento (ou '*' para todos)
 */
export function onEvent(
    eventType: WhatsAppEventType | '*',
    callback: EventListener
): () => void {
    if (!listeners.has(eventType)) {
        listeners.set(eventType, []);
    }
    listeners.get(eventType)!.push(callback);

    // Retorna função de unsubscribe
    return () => {
        const arr = listeners.get(eventType);
        if (arr) {
            const index = arr.indexOf(callback);
            if (index > -1) arr.splice(index, 1);
        }
    };
}

// ============================================
// HELPER FUNCTIONS (Atalhos para eventos comuns)
// ============================================

export async function emitMessageReceived(
    tenantId: string,
    conversationId: string,
    contactId: string,
    message: { type: string; body?: string; mediaId?: string; interactive?: any }
): Promise<void> {
    await emitEvent({
        type: 'message_received',
        tenantId,
        conversationId,
        contactId,
        payload: message
    });
}

export async function emitLeadCreated(
    tenantId: string,
    leadId: string,
    contactId: string,
    stage: string
): Promise<void> {
    await emitEvent({
        type: 'lead_created',
        tenantId,
        contactId,
        payload: { leadId, stage }
    });
}

export async function emitStageChanged(
    tenantId: string,
    leadId: string,
    oldStage: string,
    newStage: string
): Promise<void> {
    await emitEvent({
        type: 'stage_changed',
        tenantId,
        payload: { leadId, oldStage, newStage }
    });
}

export async function emitAudioReceived(
    tenantId: string,
    conversationId: string,
    audioAssetId: string,
    mediaUrl: string
): Promise<void> {
    await emitEvent({
        type: 'audio_received',
        tenantId,
        conversationId,
        payload: { audioAssetId, mediaUrl }
    });
}

export async function emitCopilotSuggestion(
    tenantId: string,
    conversationId: string,
    suggestion: string
): Promise<void> {
    await emitEvent({
        type: 'copilot_suggestion',
        tenantId,
        conversationId,
        payload: { suggestion }
    });
}

export async function emitIntentDetected(
    tenantId: string,
    conversationId: string,
    intent: string,
    confidence: number
): Promise<void> {
    await emitEvent({
        type: 'intent_detected',
        tenantId,
        conversationId,
        payload: { intent, confidence }
    });
}

// ============================================
// QUERY FUNCTIONS
// ============================================

/**
 * Buscar eventos recentes por tenant
 */
export async function getRecentEvents(
    tenantId: string,
    options: { limit?: number; type?: WhatsAppEventType; since?: Date } = {}
): Promise<any[]> {
    const { limit = 50, type, since } = options;

    let query = supabase
        .from('whatsapp_events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('occurred_at', { ascending: false })
        .limit(limit);

    if (type) {
        query = query.eq('type', type);
    }

    if (since) {
        query = query.gte('occurred_at', since.toISOString());
    }

    const { data, error } = await query;

    if (error) {
        console.error('❌ [EventBus] Erro ao buscar eventos:', error);
        return [];
    }

    return data || [];
}

export default {
    emitEvent,
    onEvent,
    setSocketIO,
    emitMessageReceived,
    emitLeadCreated,
    emitStageChanged,
    emitAudioReceived,
    emitCopilotSuggestion,
    emitIntentDetected,
    getRecentEvents
};
